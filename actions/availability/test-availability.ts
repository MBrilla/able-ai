"use server";

import { db } from "@/lib/drizzle/db";
import { UsersTable } from "@/lib/drizzle/schema/users";
import { eq } from "drizzle-orm";

export async function testAvailabilityAction(userId: string) {
  try {
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, userId),
    });

    if (!user) {
      return { error: "User not found" };
    }
    
    // Test database connection by checking if we can query the user
    const testUser = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.id, user.id),
    });

    if (!testUser) {
      return { error: "Database query failed" };
    }

    return { success: true, message: "Database connection and user lookup successful" };
  } catch (error) {
    return { error: "Test failed", details: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function testUpdateAvailabilityAction(userId: string, slotId: string) {
  try {
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, userId),
    });

    if (!user) {
      return { error: "User not found" };
    }
    
    // Import the update function to test it
    const { updateAvailabilitySlot } = await import('./manage-availability.js');
    
    // Test data for update
    const testData = {
      startTime: "10:00",
      endTime: "18:00",
      days: ["Mon", "Tue", "Wed"],
      frequency: "weekly" as const,
      ends: "never" as const,
      notes: "Test update"
    };
    
    const result = await updateAvailabilitySlot(userId, slotId, testData);
    
    return result;
  } catch (error) {
    return { error: "Update test failed", details: error instanceof Error ? error.message : 'Unknown error' };
  }
}
