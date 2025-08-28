// Validation constants used across the application
// This ensures consistency between client-side and server-side validation

export const VALIDATION_CONSTANTS = {
  // Worker profile validation
  WORKER: {
    MIN_HOURLY_RATE: 12.21, // Minimum hourly rate in British Pounds (£)
    MIN_ABOUT_LENGTH: 10, // Minimum characters for about field
    MIN_EXPERIENCE_LENGTH: 10, // Minimum characters for experience field
    MIN_SKILLS_LENGTH: 5, // Minimum characters for skills field
    MIN_EQUIPMENT_LENGTH: 5, // Minimum characters for equipment field
  },
  
  // Gig validation
  GIG: {
    MIN_TITLE_LENGTH: 5,
    MIN_DESCRIPTION_LENGTH: 10,
    MIN_BUDGET: 1, // Minimum budget in British Pounds (£)
  },
  
  // General validation
  GENERAL: {
    MIN_PASSWORD_LENGTH: 8,
    MAX_FILE_SIZE_MB: 10, // Maximum file size in MB
  },
} as const;

// Type-safe access to validation constants
export type ValidationConstants = typeof VALIDATION_CONSTANTS;
