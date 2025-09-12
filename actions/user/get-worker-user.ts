"use server";

import { db } from "@/lib/drizzle/db";
import { eq } from "drizzle-orm";
import { GigWorkerProfilesTable, UsersTable } from "@/lib/drizzle/schema";

export interface WorkerUser {
  uid: string;
  displayName?: string;
  email?: string;
  id: string;
}

export async function getWorkerUserFromProfileId(profileId: string): Promise<{
  success: boolean;
  data?: WorkerUser;
  error?: string;
}> {
  try {
    if (!profileId) throw new Error("Worker profile ID is required");

    console.log('🔍 DEBUG: Looking up worker profile with ID:', profileId);

    const workerProfile = await db.query.GigWorkerProfilesTable.findFirst({
      where: eq(GigWorkerProfilesTable.id, profileId),
      with: {
        user: {
          columns: {
            id: true,
            firebaseUid: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
    
    console.log('🔍 DEBUG: Worker profile query result:', {
      found: !!workerProfile,
      hasUser: !!workerProfile?.user,
      userId: workerProfile?.user?.id,
      firebaseUid: workerProfile?.user?.firebaseUid,
      fullName: workerProfile?.user?.fullName
    });

    if (!workerProfile?.user)
      throw new Error("Worker profile or user not found");

    const workerUser: WorkerUser = {
      uid: workerProfile.user.firebaseUid,
      displayName: workerProfile.user.fullName || undefined,
      email: workerProfile.user.email || undefined,
      id: workerProfile.user.id,
    };

    console.log('🔍 DEBUG: Created WorkerUser object:', {
      uid: workerUser.uid,
      id: workerUser.id,
      displayName: workerUser.displayName,
      email: workerUser.email,
      originalFirebaseUid: workerProfile.user.firebaseUid,
      originalUserId: workerProfile.user.id
    });

    return {
      success: true,
      data: workerUser,
    };
  } catch (error) {
    console.error("Error fetching worker user from profile ID:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function getWorkerUserFromFirebaseId(firebaseUid: string): Promise<{
  success: boolean;
  data?: WorkerUser;
  error?: string;
}> {
  try {
    if (!firebaseUid) {
      return {
        success: false,
        error: "Firebase UID is required",
      };
    }

    console.log(`🔍 Looking up worker user for Firebase UID: ${firebaseUid}`);

    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, firebaseUid),
      columns: {
        id: true,
        firebaseUid: true,
        fullName: true,
        email: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    const workerUser: WorkerUser = {
      uid: user.firebaseUid,
      displayName: user.fullName || undefined,
      email: user.email || undefined,
      id: user.id,
    };

    return {
      success: true,
      data: workerUser,
    };
  } catch (error) {
    console.error('Error fetching worker user from Firebase UID:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function getWorkerProfileIdFromFirebaseUid(firebaseUid: string): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  try {
    if (!firebaseUid) {
      return {
        success: false,
        error: "Firebase UID is required"
      };
    }

    // Get user first
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, firebaseUid),
      columns: {
        id: true,
      }
    });

    if (!user) {
      return {
        success: false,
        error: "User not found"
      };
    }

    // Get worker profile
    const workerProfile = await db.query.GigWorkerProfilesTable.findFirst({
      where: eq(GigWorkerProfilesTable.userId, user.id),
      columns: {
        id: true,
      }
    });

    if (!workerProfile) {
      return {
        success: false,
        error: "Worker profile not found"
      };
    }

    return {
      success: true,
      data: workerProfile.id
    };
  } catch (error) {
    console.error("Error fetching worker user from profile ID:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}