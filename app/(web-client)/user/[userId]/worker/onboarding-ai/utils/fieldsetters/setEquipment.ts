/**
 * setEquipment.ts
 * 
 * Field setter for equipment validation.
 * Handles equipment text validation and processing.
 */

import { checkInappropriateContent, checkOffTopicResponse } from '../filters';
import { setSupportValidation } from './setSupportValidation';

export function setEquipment(value: string): {
  ok: boolean;
  error?: string;
  equipment?: string;
  isAppropriate?: boolean;
  isWorkerRelated?: boolean;
  needsSupport?: boolean;
  supportMessage?: string;
  escalationTrigger?: any;
} {
  const trimmed = (value || '').trim();
  
  // Check for support/escalation needs first
  const supportValidation = setSupportValidation(trimmed, {
    fieldType: 'equipment',
    currentStep: 'equipment_validation'
  });
  
  if (supportValidation.needsSupport) {
    return {
      ok: false,
      error: supportValidation.supportMessage || 'Support assistance needed',
      needsSupport: true,
      supportMessage: supportValidation.supportMessage,
      escalationTrigger: supportValidation.escalationTrigger
    };
  }
  
  // Basic validation
  if (!trimmed) {
    return { ok: false, error: 'Please enter your equipment' };
  }
  
  if (trimmed.length < 5) {
    return { ok: false, error: 'Equipment description must be at least 5 characters long' };
  }
  
  if (trimmed.length > 1000) {
    return { ok: false, error: 'Equipment description must be less than 1000 characters' };
  }
  
  // Check for inappropriate content
  const inappropriateCheck = checkInappropriateContent(trimmed);
  if (!inappropriateCheck.isAppropriate) {
    return { 
      ok: false, 
      error: inappropriateCheck.message || 'Please keep your equipment description professional and appropriate',
      isAppropriate: false
    };
  }
  
  // Check if it's worker-related
  const offTopicCheck = checkOffTopicResponse({
    currentStep: 'equipment',
    currentField: 'equipment',
    currentPrompt: 'Please list any equipment you have that you can use for your work.',
    previousMessages: [] // Not available in this context, but kept for type compatibility
  }, trimmed);
  
  if (!offTopicCheck.isRelevant) {
    return { 
      ok: false, 
      error: offTopicCheck.reason || 'Please provide information relevant to your work equipment',
      isWorkerRelated: false
    };
  }
  
  // Normalize equipment text
  const normalizedEquipment = trimmed
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
  
  return { 
    ok: true, 
    equipment: normalizedEquipment,
    isAppropriate: true,
    isWorkerRelated: true
  };
}
