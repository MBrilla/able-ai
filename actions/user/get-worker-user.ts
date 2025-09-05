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

export async function getWorkerUserFromProfileId(workerProfileId: string): Promise<{
  success: boolean;
  data?: WorkerUser;
  error?: string;
}> {
  try {
    if (!workerProfileId) {
      return {
        success: false,
        error: "Worker profile ID is required"
      };
    }

    console.log(`🔍 Looking up worker user for profile ID: ${workerProfileId}`);

    // First, let's check if any worker profiles exist at all
    const allProfiles = await db.query.GigWorkerProfilesTable.findMany({
      limit: 5,
      columns: {
        id: true,
        userId: true,
      }
    });
    console.log(`🔍 Sample worker profiles in database:`, allProfiles.map(p => ({ id: p.id, userId: p.userId })));

    // Get worker profile with associated user
    const workerProfile = await db.query.GigWorkerProfilesTable.findFirst({
      where: eq(GigWorkerProfilesTable.id, workerProfileId),
      with: {
        user: {
          columns: {
            id: true,
            firebaseUid: true,
            fullName: true,
            email: true,
          }
        }
      }
    });

    console.log(`🔍 Worker profile lookup result:`, workerProfile ? 'Found' : 'Not found');
    if (workerProfile) {
      console.log(`🔍 Worker profile details:`, {
        id: workerProfile.id,
        userId: workerProfile.userId,
        userFirebaseUid: workerProfile.user?.firebaseUid,
        userFullName: workerProfile.user?.fullName
      });
    } else {
      console.log(`❌ Worker profile not found with ID: ${workerProfileId}`);
      console.log(`❌ Available worker profile IDs:`, allProfiles.map(p => p.id));
    }

    if (!workerProfile?.user) {
      return {
        success: false,
        error: "Worker profile or user not found"
      };
    }

    const workerUser: WorkerUser = {
      uid: workerProfile.user.firebaseUid,
      displayName: workerProfile.user.fullName || undefined,
      email: workerProfile.user.email || undefined,
      id: workerProfile.user.id,
    };

    return {
      success: true,
      data: workerUser
    };

  } catch (error) {
    console.error('Error fetching worker user from profile ID:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
