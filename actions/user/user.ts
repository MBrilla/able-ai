"use server";
import { db } from "@/lib/drizzle/db";
import { NotificationPreferencesTable, UsersTable } from "@/lib/drizzle/schema";
import { ERROR_CODES } from "@/lib/responses/errors";
import { isUserAuthenticated } from "@/lib/user.server";
import { eq } from "drizzle-orm";

/**
 * Retrieves the complete profile of an authenticated user, including their notification preferences.
 * @param token Firebase ID token of the authenticated user.
 * @returns { success: true, data } or { success: false, error }
 */
export const getProfileInfoUserAction = async (token?: string) => {
  try {
    if (!token) throw "Token is required";

    const { data, uid } = await isUserAuthenticated(token);
    if (!data) throw ERROR_CODES.UNAUTHORIZED;

    const pgUser = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, uid),
      with: { notificationPreferences: true },
    });

    return { success: true, data: pgUser };
  } catch (error) {
    console.error("Error retrieving user profile", error);
    return { success: false, error };
  }
};

/**
 * Updates the full name and phone number of the authenticated user.
 * @param updateData Object containing `fullName` and `phone`.
 * @param token Firebase ID token of the authenticated user.
 * @returns { success: true, data } or { success: false, error }
 */
export const updateUserProfileAction = async (
  updateData: { fullName: string; phone: string },
  token?: string
) => {
  try {
    if (!token) throw "Token is required";

    const { data, uid } = await isUserAuthenticated(token);
    if (!data) throw ERROR_CODES.UNAUTHORIZED;

    const updatedUsers = await db
      .update(UsersTable)
      .set(updateData)
      .where(eq(UsersTable.firebaseUid, uid))
      .returning();

    return { success: true, data: updatedUsers[0] || null };
  } catch (error) {
    console.error("Error updating user profile", error);
    return { success: false, error };
  }
};

/**
 * Updates the public/private visibility of the user's profile.
 * @param updateData Object containing `profileVisibility` boolean.
 * @param token Firebase ID token of the authenticated user.
 * @returns { success: true, data: boolean } or { success: false, error }
 */
export const updateProfileVisibilityAction = async (
  updateData: { profileVisibility: boolean },
  token?: string
) => {
  try {
    if (!token) throw "Token is required";

    const { data, uid } = await isUserAuthenticated(token);
    if (!data) throw ERROR_CODES.UNAUTHORIZED;

    const updatedUsers = await db
      .update(UsersTable)
      .set(updateData)
      .where(eq(UsersTable.firebaseUid, uid))
      .returning();

    return { success: true, data: updatedUsers[0]?.profileVisibility };
  } catch (error) {
    console.error("Error updating profile visibility", error);
    return { success: false, error, data: !updateData.profileVisibility };
  }
};

/**
 * Updates the user's email notification preferences.
 * @param updateData Object containing `emailProferences` boolean.
 * @param token Firebase ID token of the authenticated user.
 * @returns { success: true, data: boolean } or { success: false, error }
 */
export const updateNotificationEmailAction = async (
  updateData: { emailProferences: boolean },
  token?: string
) => {
  try {
    if (!token) throw "Token is required";

    const { data, uid } = await isUserAuthenticated(token);
    if (!data) throw ERROR_CODES.UNAUTHORIZED;

    const pgUser = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, uid),
      with: { notificationPreferences: true },
    });

    if (!pgUser) throw "Error retrieving user profile";

    const updatedUsers = await db
      .update(NotificationPreferencesTable)
      .set({ emailGigUpdates: updateData.emailProferences })
      .where(eq(NotificationPreferencesTable.userId, pgUser.id))
      .returning();

    const changed = updatedUsers[0]?.emailGigUpdates === updateData.emailProferences

    if (changed) {
      return { success: true, data: updatedUsers[0]?.emailGigUpdates };
    }
    else {
      throw "Error updating notification email preferences"
    }

  } catch (error) {
    console.error("Error updating email preferences", error);
    return { success: false, error, data: !updateData.emailProferences };
  }
};

/**
 * Updates the user's SMS notification preferences.
 * @param updateData Object containing `smsGigAlerts` boolean.
 * @param token Firebase ID token of the authenticated user.
 * @returns { success: true, data: boolean } or { success: false, error }
 */
export const updateNotificationSmsAction = async (
  updateData: { smsGigAlerts: boolean },
  token?: string
) => {
  try {
    if (!token) throw "Token is required";

    const { data, uid } = await isUserAuthenticated(token);
    if (!data) throw ERROR_CODES.UNAUTHORIZED;

    const pgUser = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, uid),
      with: { notificationPreferences: true },
    });

    if (!pgUser) throw "Error retrieving user profile";

    const updatedUsers = await db
      .update(NotificationPreferencesTable)
      .set({ smsGigAlerts: updateData.smsGigAlerts })
      .where(eq(NotificationPreferencesTable.userId, pgUser.id))
      .returning();

    return { success: true, data: updatedUsers[0]?.smsGigAlerts };
  } catch (error) {
    console.error("Error updating SMS preferences", error);
    return { success: false, error, data: updateData.smsGigAlerts };
  }
};
