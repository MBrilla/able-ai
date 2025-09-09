/**
 * Incident Reporting Types
 * Defines types for incident reporting system
 */

import type { IncidentType } from '@/lib/incident-detection';

// Re-export for convenience
export type { IncidentType };

export interface IncidentReport {
  id: string;
  userId: string;
  incidentType: IncidentType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  title: string;
  description: string;
  location?: string;
  gigId?: string;
  reportedBy: string; // User ID who reported
  assignedTo?: string; // Admin user ID
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
  // Additional details collected during AI conversation
  additionalDetails?: {
    [key: string]: any;
  };
  // Evidence or attachments
  attachments?: string[]; // URLs to uploaded files
  // Privacy and confidentiality
  isConfidential: boolean;
  allowContact: boolean; // Whether user allows contact for follow-up
}

export interface IncidentReportInput {
  incidentType: IncidentType;
  title: string;
  description: string;
  location?: string;
  gigId?: string;
  additionalDetails?: {
    [key: string]: any;
  };
  isConfidential?: boolean;
  allowContact?: boolean;
}

export interface IncidentReportResponse {
  success: boolean;
  incidentId?: string;
  error?: string;
  message?: string;
}

export interface IncidentConversationStep {
  id: string;
  type: 'ai' | 'user' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    [key: string]: any;
  };
}

export interface IncidentAIPrompt {
  userInput: string;
  incidentType: IncidentType;
  currentStep: number;
  totalSteps: number;
  collectedData: {
    [key: string]: any;
  };
  conversationHistory: IncidentConversationStep[];
}

export interface IncidentAIResponse {
  response: string;
  nextStep?: number;
  isComplete: boolean;
  collectedData?: {
    [key: string]: any;
  };
  suggestedActions?: string[];
  requiresFollowUp?: boolean;
}

export interface IncidentDetectionContext {
  userId: string;
  gigId?: string;
  location?: string;
  userRole?: 'worker' | 'buyer';
  timestamp: string;
  sessionId?: string;
}

export interface IncidentEscalation {
  incidentId: string;
  escalatedBy: string;
  escalatedAt: string;
  reason: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedTo?: string;
}

export interface IncidentNotification {
  incidentId: string;
  userId: string;
  type: 'incident_created' | 'incident_updated' | 'incident_resolved';
  message: string;
  timestamp: string;
  isRead: boolean;
}
