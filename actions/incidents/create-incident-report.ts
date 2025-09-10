"use server";

import { db } from '@/lib/drizzle/db';
import { escalatedIssues, UsersTable } from '@/lib/drizzle/schema';
import { eq } from 'drizzle-orm';
import { IncidentReportInput, IncidentReportResponse } from '@/app/types/incidentTypes';
import { generateIncidentId, getIncidentSeverity } from '@/lib/incident-detection';
import { isUserAuthenticated } from '@/lib/user.server';

/**
 * Create a new incident report
 */
export async function createIncidentReport(
  incidentData: IncidentReportInput,
  token: string
): Promise<IncidentReportResponse> {
  try {
    // Authenticate user
    const { uid } = await isUserAuthenticated(token);
    if (!uid) {
      return { success: false, error: 'Authentication required' };
    }

    // Get user details
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, uid),
      columns: { id: true, fullName: true }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Generate incident ID
    const incidentId = generateIncidentId();

    // Determine severity
    const severity = getIncidentSeverity(incidentData.incidentType, 0.8); // Default confidence

    // Create incident report
    const newIncident = await db.insert(escalatedIssues).values({
      id: incidentId,
      userId: user.id,
      gigId: incidentData.gigId || null,
      issueType: incidentData.incidentType,
      description: incidentData.description,
      status: 'OPEN',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    if (!newIncident || newIncident.length === 0) {
      return { success: false, error: 'Failed to create incident report' };
    }

    // Log the incident creation
    console.log(`🚨 Incident report created: ${incidentId} by user ${user.id} (${user.fullName})`);
    console.log(`📋 Incident type: ${incidentData.incidentType}, Severity: ${severity}`);

    return {
      success: true,
      incidentId,
      message: `Incident report created successfully. Your incident ID is ${incidentId}. Our support team will review this and contact you if needed.`
    };

  } catch (error) {
    console.error('Error creating incident report:', error);
    return {
      success: false,
      error: 'Failed to create incident report. Please try again or contact support.'
    };
  }
}

/**
 * Update an existing incident report
 */
export async function updateIncidentReport(
  incidentId: string,
  updates: Partial<IncidentReportInput>,
  token: string
): Promise<IncidentReportResponse> {
  try {
    // Authenticate user
    const { uid } = await isUserAuthenticated(token);
    if (!uid) {
      return { success: false, error: 'Authentication required' };
    }

    // Get user details
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, uid),
      columns: { id: true }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Update incident report
    const updatedIncident = await db
      .update(escalatedIssues)
      .set({
        description: updates.description,
        gigId: updates.gigId || null,
        updatedAt: new Date()
      })
      .where(eq(escalatedIssues.id, incidentId))
      .returning();

    if (!updatedIncident || updatedIncident.length === 0) {
      return { success: false, error: 'Incident report not found or update failed' };
    }

    console.log(`📝 Incident report updated: ${incidentId} by user ${user.id}`);

    return {
      success: true,
      incidentId,
      message: 'Incident report updated successfully.'
    };

  } catch (error) {
    console.error('Error updating incident report:', error);
    return {
      success: false,
      error: 'Failed to update incident report. Please try again.'
    };
  }
}

/**
 * Get incident report by ID
 */
export async function getIncidentReport(
  incidentId: string,
  token: string
): Promise<{ success: boolean; incident?: any; error?: string }> {
  try {
    // Authenticate user
    const { uid } = await isUserAuthenticated(token);
    if (!uid) {
      return { success: false, error: 'Authentication required' };
    }

    // Get user details
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, uid),
      columns: { id: true }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Get incident report
    const incident = await db.query.escalatedIssues.findFirst({
      where: eq(escalatedIssues.id, incidentId)
    });

    if (!incident) {
      return { success: false, error: 'Incident report not found' };
    }

    // Check if user owns this incident or is admin
    if (incident.userId !== user.id) {
      // TODO: Add admin check here
      return { success: false, error: 'Access denied' };
    }

    return {
      success: true,
      incident
    };

  } catch (error) {
    console.error('Error getting incident report:', error);
    return {
      success: false,
      error: 'Failed to retrieve incident report. Please try again.'
    };
  }
}

/**
 * Get all incident reports for a user
 */
export async function getUserIncidentReports(
  token: string
): Promise<{ success: boolean; incidents?: any[]; error?: string }> {
  try {
    // Authenticate user
    const { uid } = await isUserAuthenticated(token);
    if (!uid) {
      return { success: false, error: 'Authentication required' };
    }

    // Get user details
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.firebaseUid, uid),
      columns: { id: true }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Get user's incident reports
    const incidents = await db.query.escalatedIssues.findMany({
      where: eq(escalatedIssues.userId, user.id),
      orderBy: (escalatedIssues, { desc }) => [desc(escalatedIssues.createdAt)]
    });

    return {
      success: true,
      incidents
    };

  } catch (error) {
    console.error('Error getting user incident reports:', error);
    return {
      success: false,
      error: 'Failed to retrieve incident reports. Please try again.'
    };
  }
}
