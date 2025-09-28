import { generateContextAwarePrompt, sanitizeWithAI, extractSkillName } from '../ai-systems/ai-utils';
import { buildRecommendationLink } from '../helpers/helpers';
import { buildJobTitleConfirmationStep, buildSimilarSkillsConfirmationStep } from './step-builders';
import { checkExistingSimilarSkill, interpretJobTitle } from '../ai-systems/ai-utils';
import { requiredFields as REQUIRED_FIELDS_CONFIG, specialFields as SPECIAL_FIELDS_CONFIG } from './questions';

// Type definitions
export interface RequiredField {
  name: string;
  type: string;
  placeholder?: string;
  defaultPrompt: string;
  rows?: number;
}

export interface FormData {
  about?: string;
  experience?: string;
  skills?: string;
  qualifications?: string;
  equipment?: string;
  hourlyRate?: number;
  location?: { lat: number; lng: number } | string;
  availability?: {
    days: string[];
    startTime: string;
    endTime: string;
    frequency?: string;
    ends?: string;
    startDate?: string;
    endDate?: string;
    occurrences?: number;
  } | string;
  videoIntro?: string;
  references?: string;
  jobTitle?: string;
  [key: string]: any;
}

export interface ChatStep {
  id: number;
  type: "bot" | "user" | "input" | "sanitized" | "typing" | "calendar" | "location" | "confirm" | "video" | "shareLink" | "availability" | "jobTitleConfirmation" | "similarSkillsConfirmation" | "summary" | "support" | "hashtag-generation" | "confirmation";
  content?: string;
  inputConfig?: {
    type: string;
    name: string;
    placeholder?: string;
    rows?: number;
  };
  confirmationConfig?: {
    type: 'location' | 'availability' | 'skills' | 'bio';
    existingValue: string;
    fieldName: string;
  };
  isComplete?: boolean;
  sanitizedValue?: string | any;
  originalValue?: string | any;
  fieldName?: string;
  isNew?: boolean;
  linkUrl?: string;
  linkText?: string;
  naturalSummary?: string;
  extractedData?: string;
  suggestedJobTitle?: string;
  matchedTerms?: string[];
  isAISuggested?: boolean;
  confidence?: number;
  similarSkills?: any[];
  summaryData?: FormData;
  confirmedChoice?: 'title' | 'original' | 'existing' | 'new';
}

const requiredFields: RequiredField[] = REQUIRED_FIELDS_CONFIG;
const specialFields: RequiredField[] = SPECIAL_FIELDS_CONFIG;

/**
 * Get the next required field that hasn't been filled
 */
export function getNextRequiredField(formData: FormData, existingProfileData?: any): RequiredField | undefined {
  // First, find the first required field that hasn't been filled in formData
  console.log('🔍 getNextRequiredField - formData:', formData);
  console.log('🔍 getNextRequiredField - requiredFields:', requiredFields.map(f => ({ name: f.name, hasValue: !!formData[f.name] })));
  
  let nextField = requiredFields.find((f: RequiredField) => !formData[f.name]);
  
  // Special handling: if qualifications is the next field but user has provided bio with qualifications info,
  // skip to video step to avoid asking for redundant information
  if (nextField?.name === 'qualifications' && formData.about && formData.about.length > 50) {
    console.log('🔍 getNextRequiredField - skipping qualifications, user likely provided info in bio');
    // Find the next field after qualifications
    const qualificationsIndex = requiredFields.findIndex(f => f.name === 'qualifications');
    nextField = requiredFields[qualificationsIndex + 1];
  }
  
  // If no required field is missing, check special fields
  if (!nextField) {
    console.log('🔍 getNextRequiredField - checking specialFields:', specialFields.map(f => ({ name: f.name, hasValue: !!formData[f.name] })));
    nextField = specialFields.find((f: RequiredField) => !formData[f.name]);
  }
  
  console.log('🔍 getNextRequiredField - nextField:', nextField);
  
  return nextField;
}

/**
 * Check if there's already an active step for a field
 */
export function hasActiveStepForField(fieldName: string, chatSteps: ChatStep[]): boolean {
  return chatSteps.some((step: ChatStep) => 
    (step.type === 'input' || step.type === 'sanitized' || step.type === 'confirmation' || 
     step.type === 'jobTitleConfirmation' || step.type === 'similarSkillsConfirmation') &&
    step.fieldName === fieldName && 
    !step.isComplete
  );
}

/**
 * Check if this is the active input step
 */
export function isActiveInputStep(step: ChatStep, idx: number, chatSteps: ChatStep[]): boolean {
  const lastIncompleteInputStep = chatSteps
    .filter((s: ChatStep) => (s.type === 'input' || s.type === 'calendar' || s.type === 'location') && !s.isComplete)
    .pop();
  
  return step.id === lastIncompleteInputStep?.id;
}

/**
 * Check if we need to show confirmation for existing data
 */
export function shouldShowExistingDataConfirmation(
  fieldName: string,
  existingProfileData: any
): boolean {
  if (!existingProfileData) return false;
  
  switch (fieldName) {
    case 'about':
      return existingProfileData.hasFullBio;
    case 'location':
      return existingProfileData.hasLocation;
    case 'availability':
      return existingProfileData.hasAvailability;
    case 'skills':
      return false; // Don't check existing data for skills
    case 'hourlyRate':
      return false; // Don't check existing data for hourly rate
    default:
      return false;
  }
}

/**
 * Get existing data value for a field
 */
export function getExistingDataValue(fieldName: string, existingProfileData: any): string {
  if (!existingProfileData?.profileData) return '';
  
  switch (fieldName) {
    case 'about':
      return existingProfileData.profileData.fullBio || '';
    case 'location':
      return existingProfileData.profileData.location || '';
    case 'availability':
      return existingProfileData.profileData.availabilityJson ? 
        JSON.stringify(existingProfileData.profileData.availabilityJson) : '';
    case 'skills':
      return existingProfileData.profileData.skills || '';
    case 'hourlyRate':
      return existingProfileData.profileData.hourlyRate || '';
    default:
      return '';
  }
}

/**
 * Add the next step safely (prevents duplicates)
 */
export async function addNextStepSafely(
  formData: FormData,
  ai: any,
  chatSteps: ChatStep[],
  setChatSteps: (steps: ChatStep[] | ((prev: ChatStep[]) => ChatStep[])) => void,
  workerProfileId: string | null,
  existingProfileData?: any
): Promise<void> {
  const nextField = getNextRequiredField(formData, existingProfileData);
  
  if (!nextField) {
    return;
  }

  // Check if there's already an active step for this field
  if (hasActiveStepForField(nextField.name, chatSteps)) {
    return;
  }

  // Check if we need to show confirmation for existing data
  if (shouldShowExistingDataConfirmation(nextField.name, existingProfileData)) {
    const existingValue = getExistingDataValue(nextField.name, existingProfileData);
    
    setChatSteps((prev: ChatStep[]) => [
      ...prev,
      {
        id: Date.now(),
        type: "confirmation",
        confirmationConfig: {
          type: nextField.name === 'location' ? 'location' : 
                nextField.name === 'availability' ? 'availability' : 
                nextField.name === 'skills' ? 'skills' : 'bio',
          existingValue: existingValue,
          fieldName: nextField.name
        },
        isComplete: false,
        isNew: true,
      }
    ]);
    return;
  }

  // Special handling: auto-generate references link instead of asking for input
  if (nextField.name === 'references') {
    // Use existing worker profile ID
    if (!workerProfileId) {
      console.error('Worker profile not yet created');
      return;
    }
    
    const recommendationLink = buildRecommendationLink(workerProfileId);
    
    // Add typing indicator first
    setChatSteps((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        type: "typing",
        isNew: true,
      },
    ]);

    // Replace typing indicator with separate messages after delay
    setTimeout(() => {
      setChatSteps((prev) => {
        const filtered = prev.filter(s => s.type !== 'typing');
        return [
          ...filtered,
          // First message: Instructions
          {
            id: Date.now() + 2,
            type: "bot",
            content: "You need one reference per skill, from previous managers, colleagues or teachers.\n\nIf you do not have experience you can get a character reference from a friend or someone in your network.",
            isNew: true,
          },
          // Second message: Share link
          {
            id: Date.now() + 3,
            type: "shareLink",
            linkUrl: recommendationLink,
            linkText: "Share this link to get your reference",
            isNew: true,
          },
          // Third message: Gigfolio info
          {
            id: Date.now() + 4,
            type: "bot",
            content: "Please check out your gigfolio and share with your network\n\nif your connections make a hire on Able you get £5!",
            isNew: true,
          }
        ];
      });
    }, 1000);
    
    // After references, proceed to summary step
    setTimeout(() => {
      console.log('🔍 Adding summary step after references');
      setChatSteps((prev: ChatStep[]) => {
        const filtered = prev.filter(s => s.type !== 'typing');
        const newSteps = [...filtered, {
          id: Date.now() + 5,
          type: "summary" as const,
          summaryData: formData,
          isNew: true,
        }];
        console.log('🔍 Summary step added:', newSteps[newSteps.length - 1]);
        return newSteps;
      });
    }, 3000); // Wait 3 seconds after the last message
    return;
  }

  // Use the field's default prompt instead of generating context-aware prompt
  const newInputConfig = {
    type: nextField.type,
    name: nextField.name,
    placeholder: nextField.defaultPrompt, // Use default prompt to avoid bio context
    ...(nextField.rows && { rows: nextField.rows }),
  };
  
  // Determine the step type based on the field
  let stepType: "input" | "calendar" | "location" | "video" | "availability" = "input";
  if (nextField.name === "availability") {
    stepType = "availability";
  } else if (nextField.name === "location") {
    stepType = "location";
  } else if (nextField.name === "videoIntro") {
    stepType = "video";
  }
  
  // Add typing indicator first
  setChatSteps((prev) => [
    ...prev,
    {
      id: Date.now() + 1,
      type: "typing",
      isNew: true,
    },
  ]);

  // Replace typing indicator with intelligent bot message and input step after delay
  setTimeout(async () => {
    // Generate intelligent context-aware prompt
    let intelligentPrompt = nextField.defaultPrompt;
    try {
      // Build context based on the current field being asked
      let contextInfo = '';
      
      if (nextField.name === 'skills') {
        // For skills, don't use any context to avoid mixing
        contextInfo = '';
      } else if (nextField.name === 'experience') {
        // For experience, only use skills as context
        const contextParts = [];
        if (formData.skills) {
          contextParts.push(`Skills: ${formData.skills}`);
        }
        contextInfo = contextParts.join(' | ');
      } else if (nextField.name === 'qualifications') {
        // For qualifications, use skills and experience as context
        const contextParts = [];
        if (formData.skills) {
          contextParts.push(`Skills: ${formData.skills}`);
        }
        if (formData.experience) contextParts.push(`Experience: ${formData.experience}`);
        contextInfo = contextParts.join(' | ');
      } else {
        // For other fields, only use skills as context
        if (formData.skills) {
          contextInfo = `Skills: ${formData.skills}`;
        } else {
          contextInfo = '';
        }
      }
      
      intelligentPrompt = await generateContextAwarePrompt(nextField.name, contextInfo, ai);
    } catch (error) {
      console.error('Failed to generate context-aware prompt:', error);
    }

    setChatSteps((prev) => {
      const filtered = prev.filter(s => s.type !== 'typing');
      return [
        ...filtered,
        {
          id: Date.now() + 2,
          type: "bot",
          content: intelligentPrompt,
          isNew: true,
        },
        {
          id: Date.now() + 3,
          type: stepType,
          inputConfig: newInputConfig,
          isComplete: false,
          isNew: true,
        },
      ];
    });
  }, 1000);
}

/**
 * Handle input submission with AI-powered flow control
 */
export async function handleInputSubmission(
  stepId: number,
  inputName: string,
  inputValue: string,
  formData: FormData,
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void,
  chatSteps: ChatStep[],
  setChatSteps: (steps: ChatStep[] | ((prev: ChatStep[]) => ChatStep[])) => void,
  user: any,
  ai: any,
  workerProfileId: string | null,
  existingProfileData?: any
): Promise<void> {
  const valueToUse = inputValue ?? formData[inputName];
  if (!valueToUse) {
    console.error('No value provided for input submission');
    return;
  }

  // Mark input step as complete
  setChatSteps((prev: ChatStep[]) => prev.map((step: ChatStep) => 
    step.id === stepId ? { ...step, isComplete: true } : step
  ));

  // Update form data
  const updatedFormData = { ...formData, [inputName]: valueToUse };
  setFormData(updatedFormData);

  // Add typing indicator for AI processing
  setChatSteps((prev: ChatStep[]) => [
    ...prev,
    {
      id: Date.now() + 1,
      type: "typing",
      isNew: true,
    },
  ]);

  // Handle different field types
  if (inputName === 'skills') {
    // Only try job title interpretation if we don't already have a jobTitle
    if (!formData.jobTitle) {
      const jobTitleResult = await interpretJobTitle(valueToUse, ai);
      
      if (jobTitleResult && jobTitleResult.confidence >= 30) {
        setChatSteps((prev: ChatStep[]) => {
          const filtered = prev.filter(s => s.type !== 'typing');
          return [
            ...filtered,
            buildJobTitleConfirmationStep(stepId, inputName, valueToUse, jobTitleResult) as unknown as ChatStep,
          ];
        });
        return; // Exit early if we're showing job title confirmation
      }
    }
    
    // Extract skill name using AI before checking for similar skills
    const skillExtractionResult = await extractSkillName(valueToUse, ai);
    const skillNameToSearch = skillExtractionResult?.skillName || valueToUse;
    
    console.log('🔍 Extracted skill name:', skillNameToSearch, 'from input:', valueToUse);
    
    // Check for similar skills using the extracted skill name
    const similarSkillsResult = await checkExistingSimilarSkill(skillNameToSearch, workerProfileId || '');
    
    if (similarSkillsResult.exists && similarSkillsResult.similarSkills.length > 0) {
      // User already has this skill, show confirmation step
      setChatSteps((prev: ChatStep[]) => {
        const filtered = prev.filter(s => s.type !== 'typing');
        return [
          ...filtered,
          buildSimilarSkillsConfirmationStep(stepId, inputName, valueToUse, similarSkillsResult.similarSkills) as unknown as ChatStep,
        ];
      });
    } else {
      // No similar skills found, continue with normal flow
      setChatSteps((prev: ChatStep[]) => prev.filter(s => s.type !== 'typing'));
      await addNextStepSafely(updatedFormData, ai, chatSteps, setChatSteps, workerProfileId, existingProfileData);
    }
  } else {
    // Handle AI sanitization for all text input fields (like old onboarding)
    const sanitizedResult = await sanitizeWithAI(inputName, valueToUse);
    
    if (sanitizedResult.sanitized && sanitizedResult.sanitized !== valueToUse) {
      // AI made changes, show confirmation step
      setChatSteps((prev: ChatStep[]) => {
        const filtered = prev.filter(s => s.type !== 'typing');
        return [
          ...filtered,
          buildSanitizedConfirmationStep(stepId, inputName, valueToUse, sanitizedResult.sanitized, sanitizedResult.naturalSummary),
        ];
      });
    } else {
      // No changes needed, continue with normal flow
      setChatSteps((prev: ChatStep[]) => prev.filter(s => s.type !== 'typing'));
      await addNextStepSafely(updatedFormData, ai, chatSteps, setChatSteps, workerProfileId, existingProfileData);
    }
  }
}

/**
 * Handle job title confirmation
 */
export async function handleJobTitleConfirmation(
  fieldName: string,
  suggestedJobTitle: string,
  originalValue: string,
  formData: FormData,
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void,
  chatSteps: ChatStep[],
  setChatSteps: (steps: ChatStep[] | ((prev: ChatStep[]) => ChatStep[])) => void,
  user: any,
  ai: any,
  workerProfileId: string | null,
  existingProfileData?: any
): Promise<void> {
  // Update formData with the standardized job title only
  const updatedFormData = { ...formData, jobTitle: suggestedJobTitle };
  setFormData(updatedFormData);
  
  // Mark job title confirmation step as complete
  setChatSteps((prev: ChatStep[]) => prev.map((step: ChatStep) =>
    step.type === "jobTitleConfirmation" && step.fieldName === fieldName ? { ...step, isComplete: true, confirmedChoice: 'title' } : step
  ));
  
  // Check if user already has similar skills for this job title
  const similarSkillsResult = await checkExistingSimilarSkill(suggestedJobTitle, user?.uid || '');
  
  if (similarSkillsResult.exists && similarSkillsResult.similarSkills.length > 0) {
    // Show similar skills confirmation step
    setChatSteps((prev: ChatStep[]) => [
      ...prev,
      buildSimilarSkillsConfirmationStep(Date.now(), fieldName, suggestedJobTitle, similarSkillsResult.similarSkills) as unknown as ChatStep,
    ]);
  } else {
    // No similar skills found, continue with regular flow
    await addNextStepSafely(updatedFormData, ai, chatSteps, setChatSteps, workerProfileId, existingProfileData);
  }
}

/**
 * Handle job title rejection
 */
export async function handleJobTitleRejection(
  fieldName: string,
  originalValue: string,
  formData: FormData,
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void,
  chatSteps: ChatStep[],
  setChatSteps: (steps: ChatStep[] | ((prev: ChatStep[]) => ChatStep[])) => void,
  ai: any,
  workerProfileId: string | null,
  existingProfileData?: any
): Promise<void> {
  // Update formData with the original value
  const updatedFormData = { ...formData, [fieldName]: originalValue };
  setFormData(updatedFormData);
  
  // Mark job title confirmation step as complete
  setChatSteps((prev: ChatStep[]) => prev.map((step: ChatStep) =>
    step.type === "jobTitleConfirmation" && step.fieldName === fieldName ? { ...step, isComplete: true, confirmedChoice: 'original' } : step
  ));
  
  // Continue with regular flow
  await addNextStepSafely(updatedFormData, ai, chatSteps, setChatSteps, workerProfileId, existingProfileData);
}

/**
 * Handle similar skills confirmation - use existing skill
 */
export async function handleSimilarSkillsUseExisting(
  fieldName: string,
  selectedSkill: any,
  formData: FormData,
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void,
  chatSteps: ChatStep[],
  setChatSteps: (steps: ChatStep[] | ((prev: ChatStep[]) => ChatStep[])) => void,
  ai: any,
  workerProfileId: string | null,
  existingProfileData?: any,
  onGoHome?: () => void
): Promise<void> {
  // Update formData with the existing skill data
  const updatedFormData = { 
    ...formData, 
    jobTitle: selectedSkill.name,
    skills: selectedSkill.name,
    experience: selectedSkill.experienceYears ? `${selectedSkill.experienceYears} years` : '',
    hourlyRate: selectedSkill.agreedRate ? parseFloat(selectedSkill.agreedRate) : formData.hourlyRate
  };
  setFormData(updatedFormData);
  
  // Mark similar skills confirmation step as complete
  setChatSteps((prev: ChatStep[]) => prev.map((step: ChatStep) =>
    step.type === "similarSkillsConfirmation" && step.fieldName === fieldName ? { ...step, isComplete: true, confirmedChoice: 'existing' } : step
  ));
  
  // Go back to home instead of continuing the flow
  if (onGoHome) {
    onGoHome();
  }
}

/**
 * Handle similar skills confirmation - add new skill
 */
export async function handleSimilarSkillsAddNew(
  fieldName: string,
  originalValue: string,
  formData: FormData,
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void,
  chatSteps: ChatStep[],
  setChatSteps: (steps: ChatStep[] | ((prev: ChatStep[]) => ChatStep[])) => void,
  ai: any,
  workerProfileId: string | null,
  existingProfileData?: any
): Promise<void> {
  // Update formData with the original value
  const updatedFormData = { ...formData, [fieldName]: originalValue };
  setFormData(updatedFormData);
  
  // Mark similar skills confirmation step as complete
  setChatSteps((prev: ChatStep[]) => prev.map((step: ChatStep) =>
    step.type === "similarSkillsConfirmation" && step.fieldName === fieldName ? { ...step, isComplete: true, confirmedChoice: 'new' } : step
  ));
  
  // Add bot message asking for a new skill and an input step for the new skill
  setChatSteps((prev: ChatStep[]) => [...prev, {
    id: Date.now(),
    type: "bot",
    content: "What would you like to call your new skill?",
    isComplete: true,
    isNew: true,
  }, {
    id: Date.now() + 1,
    type: "input",
    fieldName: "skills",
    inputConfig: {
      type: "text",
      name: "skills",
      placeholder: "Enter your new skill name...",
      defaultPrompt: "What would you like to call your new skill?"
    },
    isComplete: false,
    isNew: true,
  }]);
}

/**
 * Handle sanitized confirmation
 */
export async function handleSanitizedConfirmation(
  fieldName: string,
  sanitized: string | unknown,
  formData: FormData,
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void,
  chatSteps: ChatStep[],
  setChatSteps: (steps: ChatStep[] | ((prev: ChatStep[]) => ChatStep[])) => void,
  ai: any,
  workerProfileId: string | null,
  existingProfileData?: any
): Promise<void> {
  // Update formData first
  const updatedFormData = { ...formData, [fieldName]: sanitized };
  setFormData(updatedFormData);
  
  // Mark sanitized step as complete
  setChatSteps((prev: ChatStep[]) => prev.map((step: ChatStep) =>
    step.type === "sanitized" && step.fieldName === fieldName ? { ...step, isComplete: true } : step
  ));
  
  // Find next required field using updated formData
  const nextField = getNextRequiredField(updatedFormData);
  
  if (nextField) {
    // Special handling: auto-generate references link instead of asking for input
    if (nextField.name === 'references') {
      // Use existing worker profile ID
      if (!workerProfileId) {
        console.error('Worker profile not yet created');
        return;
      }
      
      const recommendationLink = buildRecommendationLink(workerProfileId);
      
      setChatSteps((prev: ChatStep[]) => [
        ...prev,
        // First message: Instructions
        {
          id: Date.now() + 1,
          type: "bot",
          content: "You need one reference per skill, from previous managers, colleagues or teachers.\n\nIf you do not have experience you can get a character reference from a friend or someone in your network.",
          isNew: true,
        },
        // Second message: Share link
        {
          id: Date.now() + 2,
          type: "shareLink",
          linkUrl: recommendationLink,
          linkText: "Share this link to get your reference",
          isNew: true,
        },
        // Third message: Gigfolio info
        {
          id: Date.now() + 3,
          type: "bot",
          content: "Please check out your gigfolio and share with your network\n\nif your connections make a hire on Able you get £5!",
          isNew: true,
        }
      ]);
      
      // After references, check if all fields are completed and show summary
      setTimeout(() => {
        setChatSteps((prev: ChatStep[]) => {
          const filtered = prev.filter(s => s.type !== 'typing');
          return [...filtered, {
            id: Date.now() + 4,
            type: "summary",
            summaryData: updatedFormData,
            isNew: true,
          }];
        });
      }, 2000); // Wait 2 seconds after the last message
      return;
    } else {
      // Continue with regular flow
      await addNextStepSafely(updatedFormData, ai, chatSteps, setChatSteps, workerProfileId, existingProfileData);
    }
  } else {
    // All required fields completed, show summary step with submit button
    // Add typing indicator first
    setChatSteps((prev: ChatStep[]) => [...prev, {
      id: Date.now(),
      type: "typing",
      isNew: true,
    }]);

    // Replace typing indicator with summary step after delay
    setTimeout(() => {
      setChatSteps((prev: ChatStep[]) => {
        const filtered = prev.filter(s => s.type !== 'typing');
        return [...filtered, {
          id: Date.now() + 1,
          type: "summary",
          summaryData: updatedFormData,
          isNew: true,
        }];
      });
    }, 1000);
  }
}

/**
 * Build sanitized confirmation step
 */
export function buildSanitizedConfirmationStep(
  stepId: number,
  fieldName: string,
  originalValue: string,
  sanitizedValue: string,
  naturalSummary?: string
): ChatStep {
  return {
    id: stepId,
    type: "sanitized",
    fieldName: fieldName,
    originalValue: originalValue,
    sanitizedValue: sanitizedValue,
    naturalSummary: naturalSummary,
    isComplete: false,
    isNew: true,
  };
}

/**
 * Initialize chat steps based on existing data
 */
export function initializeChatSteps(
  existingData: any,
  formData: FormData,
  requiredFields: RequiredField[],
  specialFields: RequiredField[]
): ChatStep[] {
  const steps: ChatStep[] = [];
  
  // Add welcome message - only show custom message for new users
  if (!existingData) {
    // New user - show full welcome message
    steps.push({
      id: 1,
      type: "bot",
      content: "Hi! I'm here to help you create your worker profile. Tell me about yourself and what kind of work you can offer.",
      isComplete: true,
      isNew: true,
    });
  } else {
    // Existing user - show simple welcome message
    steps.push({
      id: 1,
      type: "bot",
      content: "Welcome back! Let me help you update your worker profile.",
      isComplete: true,
      isNew: true,
    });
  }

  // Find the first required field that doesn't have data
  let firstMissingField = requiredFields.find(field => !formData[field.name as keyof FormData]);
  
  // If no required field is missing, check special fields
  if (!firstMissingField) {
    firstMissingField = specialFields.find(field => {
      // Always show special fields, even if user has existing data
      // The confirmation step will handle existing data
      return true;
    });
  }
  
  if (firstMissingField) {
    console.log('First missing field:', firstMissingField.name);
    console.log('Existing data:', existingData);
    console.log('Should show confirmation:', existingData && shouldShowExistingDataConfirmation(firstMissingField.name, existingData));
    
    // Check if we have existing data for this field and need to show confirmation
    if (existingData && shouldShowExistingDataConfirmation(firstMissingField.name, existingData)) {
      const existingValue = getExistingDataValue(firstMissingField.name, existingData);
      console.log('Existing value for', firstMissingField.name, ':', existingValue);
      
      // Add confirmation step for existing data
      steps.push({
        id: steps.length + 1,
        type: "confirmation",
        content: `I can see you already have ${firstMissingField.name} information. Would you like to use your existing ${firstMissingField.name} or create a new one?`,
        confirmationConfig: {
          type: firstMissingField.name === 'location' ? 'location' : 
                firstMissingField.name === 'availability' ? 'availability' : 
                firstMissingField.name === 'skills' ? 'skills' : 'bio',
          existingValue: existingValue,
          fieldName: firstMissingField.name
        },
        isComplete: false,
        isNew: true,
      });
    } else {
      // Add the question as a bot message first
      steps.push({
        id: steps.length + 1,
        type: "bot",
        content: firstMissingField.defaultPrompt,
        isComplete: true,
        isNew: true,
      });
    }
    
    // Don't add input step - let the chat input handle the flow naturally
    // The user will type in the chat input and we'll process it
  }
  
  return steps;
}
