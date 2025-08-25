"use server";

import { db } from "@/lib/drizzle/db";
import { RecommendationsTable, UsersTable } from "@/lib/drizzle/schema";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Generate a unique recommendation code for a worker
export async function generateRecommendationCode(workerUserId: string): Promise<string> {
  // Generate a random 8-character alphanumeric code
  const generateCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Keep generating until we get a unique one
  let code: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    code = generateCode();
    attempts++;
    
    // Check if code already exists
    const existing = await db.query.RecommendationsTable.findFirst({
      where: sql`${RecommendationsTable.recommendationCode} = ${code}`
    });
    
    if (!existing) {
      break;
    }
  } while (attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    throw new Error("Failed to generate unique recommendation code after multiple attempts");
  }

  return code;
}

// Create a new recommendation
export async function createRecommendation(data: {
  workerUserId: string;
  recommendationText: string;
  relationship: string;
  recommenderName: string;
  recommenderEmail: string;
  recommendationCode?: string; // Optional - will generate if not provided
}) {
  try {
    let recommendationCode = data.recommendationCode;
    
    // Generate a new code if one wasn't provided
    if (!recommendationCode) {
      recommendationCode = await generateRecommendationCode(data.workerUserId);
    }

    const [recommendation] = await db.insert(RecommendationsTable).values({
      workerUserId: data.workerUserId,
      recommendationCode,
      recommendationText: data.recommendationText,
      relationship: data.relationship,
      recommenderName: data.recommenderName,
      recommenderEmail: data.recommenderEmail,
      isVerified: false,
      moderationStatus: "PENDING",
    }).returning();

    // Revalidate the worker's profile page
    revalidatePath(`/user/${data.workerUserId}/worker`);
    
    return {
      success: true,
      data: recommendation,
      message: "Recommendation submitted successfully"
    };
  } catch (error) {
    console.error("Error creating recommendation:", error);
    return {
      success: false,
      error: "Failed to submit recommendation"
    };
  }
}

// Get recommendations for a worker
export async function getWorkerRecommendations(workerUserId: string) {
  try {
    const recommendations = await db.query.RecommendationsTable.findMany({
      where: sql`${RecommendationsTable.workerUserId} = ${workerUserId}`,
      orderBy: sql`${RecommendationsTable.createdAt} DESC`
    });

    return {
      success: true,
      data: recommendations
    };
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return {
      success: false,
      error: "Failed to fetch recommendations"
    };
  }
}

// Get recommendation by code (for public recommendation pages)
export async function getRecommendationByCode(code: string) {
  try {
    const recommendation = await db.query.RecommendationsTable.findFirst({
      where: sql`${RecommendationsTable.recommendationCode} = ${code}`,
    });

    if (!recommendation) {
      return {
        success: false,
        error: "Recommendation not found"
      };
    }

    // Get worker details separately
    const worker = await db.query.UsersTable.findFirst({
      where: sql`${UsersTable.id} = ${recommendation.workerUserId}`,
      columns: {
        id: true,
        fullName: true,
        email: true
      }
    });

    return {
      success: true,
      data: {
        ...recommendation,
        worker
      }
    };
  } catch (error) {
    console.error("Error fetching recommendation by code:", error);
    return {
      success: false,
      error: "Failed to fetch recommendation"
    };
  }
}

// Get or create recommendation code for a worker
export async function getOrCreateRecommendationCode(workerUserId: string) {
  try {
    // First, check if worker already has a recommendation code
    const existingRecommendation = await db.query.RecommendationsTable.findFirst({
      where: sql`${RecommendationsTable.workerUserId} = ${workerUserId}`,
      columns: {
        recommendationCode: true
      }
    });

    if (existingRecommendation) {
      return {
        success: true,
        data: existingRecommendation.recommendationCode
      };
    }

    // If no existing code, generate a new one
    const newCode = await generateRecommendationCode(workerUserId);
    
    return {
      success: true,
      data: newCode
    };
  } catch (error) {
    console.error("Error getting recommendation code:", error);
    return {
      success: false,
      error: "Failed to get recommendation code"
    };
  }
}
