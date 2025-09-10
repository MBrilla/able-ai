/**
 * Incident Reporting Hook
 * Provides incident detection and reporting functionality for AI chat
 */

import { useState, useCallback } from 'react';
import { detectIncident, IncidentDetectionResult, generateIncidentId } from '@/lib/incident-detection';
import { processIncidentReport, IncidentAIConfig } from '@/lib/incident-ai-handler';
import { createIncidentReport } from '@/actions/incidents/create-incident-report';
import { IncidentType, IncidentConversationStep, IncidentAIPrompt } from '@/app/types/incidentTypes';

export interface IncidentReportingState {
  isIncidentDetected: boolean;
  isReporting: boolean;
  isComplete: boolean;
  incidentId?: string;
  incidentType?: IncidentType;
  currentStep: number;
  totalSteps: number;
  collectedData: { [key: string]: any };
  conversationHistory: IncidentConversationStep[];
  error?: string;
}

export interface UseIncidentReportingProps {
  userId: string;
  gigId?: string;
  location?: string;
  userRole?: 'worker' | 'buyer';
  ai: any; // Firebase AI instance
  config?: IncidentAIConfig;
}

export function useIncidentReporting({
  userId,
  gigId,
  location,
  userRole,
  ai,
  config
}: UseIncidentReportingProps) {
  const [state, setState] = useState<IncidentReportingState>({
    isIncidentDetected: false,
    isReporting: false,
    isComplete: false,
    currentStep: 1,
    totalSteps: 5, // Default number of steps
    collectedData: {},
    conversationHistory: []
  });

  /**
   * Check if user input contains incident keywords
   */
  const checkForIncident = useCallback((userInput: string): IncidentDetectionResult => {
    const detection = detectIncident(userInput);
    
    if (detection.isIncident) {
      setState(prev => ({
        ...prev,
        isIncidentDetected: true,
        incidentType: detection.incidentType || undefined,
        error: undefined
      }));
    }
    
    return detection;
  }, []);

  /**
   * Start incident reporting flow
   */
  const startIncidentReporting = useCallback(async (incidentType: IncidentType) => {
    setState(prev => ({
      ...prev,
      isReporting: true,
      incidentType,
      currentStep: 1,
      isComplete: false,
      error: undefined
    }));

    // Generate incident ID
    const incidentId = generateIncidentId();
    setState(prev => ({ ...prev, incidentId }));

    // Add initial AI message
    const initialMessage: IncidentConversationStep = {
      id: Date.now().toString(),
      type: 'ai',
      content: `I understand you may be experiencing ${incidentType.replace('_', ' ')}. This is serious and I want to help you report this properly. Let me gather some information to ensure we document this incident correctly.`,
      timestamp: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      conversationHistory: [initialMessage]
    }));
  }, []);

  /**
   * Process user input during incident reporting
   */
  const processIncidentInput = useCallback(async (userInput: string) => {
    if (!state.isReporting || !state.incidentType) return;

    // Add user message to conversation
    const userMessage: IncidentConversationStep = {
      id: Date.now().toString(),
      type: 'user',
      content: userInput,
      timestamp: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      conversationHistory: [...prev.conversationHistory, userMessage]
    }));

    try {
      // Process with AI
      const prompt: IncidentAIPrompt = {
        userInput,
        incidentType: state.incidentType,
        currentStep: state.currentStep,
        totalSteps: state.totalSteps,
        collectedData: state.collectedData,
        conversationHistory: [...state.conversationHistory, userMessage]
      };

      const aiResponse = await processIncidentReport(prompt, ai, config);

      // Add AI response to conversation
      const aiMessage: IncidentConversationStep = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse.response,
        timestamp: new Date().toISOString()
      };

      setState(prev => ({
        ...prev,
        conversationHistory: [...prev.conversationHistory, userMessage, aiMessage],
        currentStep: aiResponse.nextStep || prev.currentStep + 1,
        collectedData: { ...prev.collectedData, ...aiResponse.collectedData },
        isComplete: aiResponse.isComplete,
        error: undefined
      }));

      return aiResponse;

    } catch (error) {
      console.error('Error processing incident input:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to process your response. Please try again.'
      }));
    }
  }, [state.isReporting, state.incidentType, state.currentStep, state.totalSteps, state.collectedData, state.conversationHistory, ai, config]);

  /**
   * Complete incident reporting and save to database
   */
  const completeIncidentReporting = useCallback(async (token: string) => {
    if (!state.incidentType || !state.incidentId) return;

    try {
      const incidentData = {
        incidentType: state.incidentType,
        title: `${state.incidentType.replace('_', ' ')} incident report`,
        description: state.conversationHistory
          .filter(step => step.type === 'user')
          .map(step => step.content)
          .join('\n\n'),
        location,
        gigId,
        additionalDetails: state.collectedData,
        isConfidential: true,
        allowContact: true
      };

      const result = await createIncidentReport(incidentData, token);

      if (result.success) {
        setState(prev => ({
          ...prev,
          isComplete: true,
          isReporting: false,
          error: undefined
        }));

        // Add completion message
        const completionMessage: IncidentConversationStep = {
          id: Date.now().toString(),
          type: 'ai',
          content: `Thank you for reporting this incident. Your incident ID is ${result.incidentId}. Our support team will review this and contact you if needed. You can reference this incident ID in any future communications.`,
          timestamp: new Date().toISOString()
        };

        setState(prev => ({
          ...prev,
          conversationHistory: [...prev.conversationHistory, completionMessage]
        }));

        return result;
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Failed to save incident report'
        }));
        return result;
      }

    } catch (error) {
      console.error('Error completing incident reporting:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to save incident report. Please try again.'
      }));
    }
  }, [state.incidentType, state.incidentId, state.conversationHistory, state.collectedData, location, gigId]);

  /**
   * Cancel incident reporting
   */
  const cancelIncidentReporting = useCallback(() => {
    setState({
      isIncidentDetected: false,
      isReporting: false,
      isComplete: false,
      currentStep: 1,
      totalSteps: 5,
      collectedData: {},
      conversationHistory: [],
      error: undefined
    });
  }, []);

  /**
   * Reset incident reporting state
   */
  const resetIncidentReporting = useCallback(() => {
    setState({
      isIncidentDetected: false,
      isReporting: false,
      isComplete: false,
      currentStep: 1,
      totalSteps: 5,
      collectedData: {},
      conversationHistory: [],
      error: undefined
    });
  }, []);

  return {
    state,
    checkForIncident,
    startIncidentReporting,
    processIncidentInput,
    completeIncidentReporting,
    cancelIncidentReporting,
    resetIncidentReporting
  };
}
