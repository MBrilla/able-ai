/**
 * setSkillName.ts
 * 
 * Modularized function for setting and validating primary skill name.
 * Provides comprehensive validation, content filtering, and
 * structured data formatting for skill information.
 */

import { validateUserInput, type ValidationContext } from '../validation/unified-validation';

/**
 * Set and validate primary skill name
 * Accepts skill input, validates against inappropriate/off-topic content,
 * and returns structured format
 */
export async function setSkillName(value: string, aiService?: any): Promise<{ 
  ok: boolean; 
  error?: string; 
  skillName?: string;
  isAppropriate?: boolean;
  isWorkerRelated?: boolean;
}> {
  const trimmed = (value || '').trim();
  
  // Basic validation
  if (!trimmed) {
    return { ok: false, error: 'Please enter a skill name' };
  }
  
  if (trimmed.length < 2) {
    return { ok: false, error: 'Skill name must be at least 2 characters long' };
  }
  
  if (trimmed.length > 100) {
    return { ok: false, error: 'Skill name must be less than 100 characters' };
  }
  
  // Use unified validation
  const context: ValidationContext = {
    currentStep: 'skills',
    currentField: 'skills',
    conversationLength: 0,
    retryCount: 0,
    userRole: 'worker',
    previousMessages: []
  };
  
  const validation = await validateUserInput(trimmed, context, aiService);
  
  if (!validation.isValid) {
    return { 
      ok: false, 
      error: validation.reason,
      isAppropriate: !validation.isInappropriate,
      isWorkerRelated: !validation.isHelpRequest
    };
  }
  
  // Normalize capitalization and spacing
  const skillName = trimmed
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return { 
    ok: true, 
    skillName,
    isAppropriate: true,
    isWorkerRelated: true
  };
}
