"use server";

import { db } from "@/lib/drizzle/db";
import { UsersTable, GigWorkerProfilesTable, SkillsTable } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";

export interface WorkerDetails {
  id: string;
  name: string;
  email: string;
  primarySkill: string;
  bio?: string;
}

export async function getWorkerDetailsAction(workerId: string): Promise<{
  success: boolean;
  data?: WorkerDetails;
  error?: string;
}> {
  try {
    if (!workerId) {
      return {
        success: false,
        error: "Worker ID is required"
      };
    }

    // Get worker user details
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.id, workerId),
      columns: {
        id: true,
        fullName: true,
        email: true,
      }
    });

    if (!user) {
      return {
        success: false,
        error: "Worker not found"
      };
    }

    // Get worker profile
    const workerProfile = await db.query.GigWorkerProfilesTable.findFirst({
      where: eq(GigWorkerProfilesTable.userId, user.id),
    });

    // Get primary skill (first skill or default)
    const skills = await db.query.SkillsTable.findMany({
      where: eq(SkillsTable.workerProfileId, workerProfile?.id || ''),
      limit: 1,
    });

    const primarySkill = skills[0]?.name || 'Professional';

    return {
      success: true,
      data: {
        id: user.id,
        name: user.fullName || 'Unknown Worker',
        email: user.email,
        primarySkill,
        bio: workerProfile?.fullBio || undefined,
      }
    };

  } catch (error) {
    console.error('Error fetching worker details:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
}

// TODO: Implement recommendations table in schema before using this function
// export async function getWorkerDetailsByRecommendationCodeAction(recommendationCode: string): Promise<{
//   success: boolean;
//   data?: WorkerDetails;
//   error?: string;
// }> {
//   try {
//     if (!recommendationCode) {
//       return {
//         success: false,
//         error: "Recommendation code is required"
//       };
//     }

//     // Get recommendation to find worker ID
//     const recommendation = await db.query.RecommendationsTable.findFirst({
//       where: eq(RecommendationsTable.recommendationCode, recommendationCode),
//       columns: {
//         workerUserId: true,
//       }
//     });

//     if (!recommendation) {
//       return {
//         success: false,
//         error: "Recommendation not found"
//       };
//     }

//     // Get worker details using the worker ID
//     return await getWorkerDetailsAction(recommendation.workerUserId);

//   } catch (error) {
//     console.error('Error fetching worker details by recommendation code:', error);
//     return {
//       success: false,
//       error: 'Internal server error'
//     };
//   }
// }
