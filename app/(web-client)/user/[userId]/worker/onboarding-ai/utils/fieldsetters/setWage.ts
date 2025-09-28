/**
 * setWage.ts
 * 
 * Modularized function for setting and validating wage expectations.
 * Provides comprehensive validation, content filtering, and
 * structured data formatting for wage information.
 */

import { VALIDATION_CONSTANTS } from '@/app/constants/validation';
import { checkInappropriateContent, checkOffTopicResponse } from '../filters';

export type WageUnit = 'hour' | 'day' | 'week';

/**
 * Set and validate wage expectations
 * Accepts wage input (hourly/daily/weekly), normalizes to numeric + unit,
 * and validates against minimum wage and reasonable limits
 */
export function setWage(value: string): {
  ok: boolean;
  error?: string;
  wage?: { amount: number; unit: WageUnit };
  isAppropriate?: boolean;
  isWorkerRelated?: boolean;
} {
  const trimmed = (value || '').toString().trim().toLowerCase();
  
  // Basic validation
  if (!trimmed) {
    return { ok: false, error: 'Please enter your preferred rate' };
  }
  
  // Check for inappropriate content
  const inappropriateCheck = checkInappropriateContent(trimmed);
  if (!inappropriateCheck.isAppropriate) {
    return { 
      ok: false, 
      error: inappropriateCheck.message || 'Please provide a professional rate without inappropriate language',
      isAppropriate: false
    };
  }
  
  // Check if it's work-related
  const offTopicCheck = checkOffTopicResponse({
    currentStep: 'wage',
    currentField: 'hourlyRate',
    currentPrompt: 'What\'s your preferred hourly rate?',
    previousMessages: []
  }, trimmed);
  
  if (!offTopicCheck.isRelevant) {
    return { 
      ok: false, 
      error: 'Please provide a rate for your services (e.g., £15/hour, £100/day)',
      isWorkerRelated: false
    };
  }

  // Extract number with better regex to handle various formats
  const numMatch = trimmed.match(/(\d+(?:\.\d+)?)/);
  if (!numMatch) {
    return { ok: false, error: 'Please enter a valid number for your rate (e.g., £15, 20/hour, 100 per day)' };
  }
  
  const amount = parseFloat(numMatch[1]);
  
  // Validate amount is reasonable
  if (isNaN(amount) || amount <= 0) {
    return { ok: false, error: 'Please enter a positive number for your rate' };
  }

  // Determine unit with improved detection
  let unit: WageUnit = 'hour'; // Default to hourly
  
  if (/week|wk|w\b|weekly/.test(trimmed)) {
    unit = 'week';
  } else if (/day|daily|d\b|per\s*day/.test(trimmed)) {
    unit = 'day';
  } else if (/hour|hr|h\b|per\s*hour|ph|p\.h\./.test(trimmed)) {
    unit = 'hour';
  }

  // Enhanced validation with better error messages
  if (unit === 'hour') {
    if (amount < VALIDATION_CONSTANTS.WORKER.MIN_HOURLY_RATE) {
      return { 
        ok: false, 
        error: `Hourly rate must be at least £${VALIDATION_CONSTANTS.WORKER.MIN_HOURLY_RATE} to comply with minimum wage laws. This protects both you and your clients.` 
      };
    }
    if (amount > 500) {
      return { 
        ok: false, 
        error: 'Hourly rate seems unusually high. Please enter a reasonable amount (≤ £500/hour). If this is correct, please contact support.' 
      };
    }
  }
  
  if (unit === 'day') {
    const minDailyRate = VALIDATION_CONSTANTS.WORKER.MIN_HOURLY_RATE * 8; // 8 hours
    if (amount < minDailyRate) {
      return { 
        ok: false, 
        error: `Daily rate should be at least £${minDailyRate} to comply with minimum wage laws (8 hours × £${VALIDATION_CONSTANTS.WORKER.MIN_HOURLY_RATE}/hour).` 
      };
    }
    if (amount > 2000) {
      return { 
        ok: false, 
        error: 'Daily rate seems unusually high. Please enter a reasonable amount (≤ £2000/day). If this is correct, please contact support.' 
      };
    }
  }
  
  if (unit === 'week') {
    const minWeeklyRate = VALIDATION_CONSTANTS.WORKER.MIN_HOURLY_RATE * 40; // 40 hours
    if (amount < minWeeklyRate) {
      return { 
        ok: false, 
        error: `Weekly rate should be at least £${minWeeklyRate} to comply with minimum wage laws (40 hours × £${VALIDATION_CONSTANTS.WORKER.MIN_HOURLY_RATE}/hour).` 
      };
    }
    if (amount > 10000) {
      return { 
        ok: false, 
        error: 'Weekly rate seems unusually high. Please enter a reasonable amount (≤ £10000/week). If this is correct, please contact support.' 
      };
    }
  }

  return { 
    ok: true, 
    wage: { amount, unit },
    isAppropriate: true,
    isWorkerRelated: true
  };
}
