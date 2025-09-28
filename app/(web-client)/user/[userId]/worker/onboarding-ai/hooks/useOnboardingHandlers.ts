/**
 * useOnboardingHandlers.ts
 * 
 * Custom hook that provides all event handlers for the AI onboarding flow.
 * This hook encapsulates all the business logic for handling user interactions,
 * AI processing, data validation, and database operations.
 * 
 * Handlers include:
 * - Input submission and validation
 * - AI content generation and sanitization
 * - Video upload and processing
 * - Profile submission and database operations
 * - Support escalation and error handling
 */

import { useCallback } from 'react';

// Import AI utilities
import { 
  generateAIVideoScript, 
  generateAIProfileSummary,
  checkExistingSimilarSkill,
  interpretJobTitle,
  isUnrelatedResponse,
  generateContextAwarePrompt,
  sanitizeWithAI
} from '../utils/ai-systems/ai-utils';

// Import unified validation system
import { 
  validateUserInput, 
  generateValidationResponse,
  requiresEscalation,
  getEscalationDetails,
  type UnifiedValidationResult,
  type ValidationContext
} from '../utils/validation/unified-validation';

// Import validation and step builders
import { checkExistingSkillTitle, buildExistingSkillTitleConfirmationStep } from '../utils/validation/skill-validation';
import { buildJobTitleConfirmationStep, buildSimilarSkillsConfirmationStep } from '../utils/step-management/step-builders';
import { saveSupportCaseToDatabase } from '../utils/helpers/support-utils';
import { detectEscalationTriggers, generateEscalationDescription } from '@/utils/escalation-detection';

/**
 * Analyze chat steps to determine if escalation is needed based on conversation patterns
 */
const analyzeChatStepsForEscalation = (chatSteps: any[]): { shouldEscalate: boolean; reason: string; confidence: number } => {
  if (chatSteps.length === 0) {
    return { shouldEscalate: false, reason: 'No conversation history', confidence: 0 };
  }

  let escalationScore = 0;
  const reasons: string[] = [];

  // Analyze recent conversation patterns
  const recentSteps = chatSteps.slice(-10); // Last 10 steps
  const userSteps = recentSteps.filter(step => step.type === 'user');
  const botSteps = recentSteps.filter(step => step.type === 'bot');

  // Check for repeated failures or confusion
  const errorPatterns = ['error', 'failed', 'not working', 'confused', 'stuck', 'help'];
  const userInputs = userSteps.map(step => step.content?.toLowerCase() || '').join(' ');
  
  for (const pattern of errorPatterns) {
    if (userInputs.includes(pattern)) {
      escalationScore += 0.2;
      reasons.push(`User mentioned: ${pattern}`);
    }
  }

  // Check for conversation length (long conversations indicate difficulty)
  if (chatSteps.length > 20) {
    escalationScore += 0.3;
    reasons.push(`Long conversation (${chatSteps.length} steps)`);
  }

  // Check for repeated bot responses (AI struggling to understand)
  const botContent = botSteps.map(step => step.content || '').join(' ');
  if (botContent.includes('I don\'t understand') || botContent.includes('Could you clarify')) {
    escalationScore += 0.4;
    reasons.push('AI repeatedly asking for clarification');
  }

  // Check for user frustration indicators
  const frustrationWords = ['frustrated', 'annoying', 'hate', 'terrible', 'awful', 'worst', 'stupid'];
  for (const word of frustrationWords) {
    if (userInputs.includes(word)) {
      escalationScore += 0.5;
      reasons.push(`User frustration detected: ${word}`);
    }
  }

  // Check for explicit help requests
  if (userInputs.includes('help') || userInputs.includes('support') || userInputs.includes('human')) {
    escalationScore += 0.6;
    reasons.push('Explicit help request');
  }

  return {
    shouldEscalate: escalationScore >= 0.7,
    reason: reasons.join('; '),
    confidence: Math.min(escalationScore, 1.0)
  };
};
import { addNextStepSafely } from '../utils/step-management/step-flow';
import { setBio, setSkillName, setExperience, setWage, setAddress, setAvailability, setEquipment, setQualifications, setVideoIntro } from '../utils/fieldsetters';

// Import database actions
import { createWorkerProfileAction, saveWorkerProfileFromOnboardingAction, updateVideoUrlProfileAction } from '@/actions/user/gig-worker-profile';

// Import profile submission utilities
import { handleProfileSubmission as submitProfileToDatabase } from '../utils/helpers/profile-submission';
import { parseExperienceToNumeric } from '@/lib/utils/experienceParsing';

// Import Firebase storage
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { firebaseApp } from "@/lib/firebase/clientApp";
import { buildRecommendationLink } from '../utils/helpers/helpers';

/**
 * Custom hook for managing onboarding event handlers
 * @param props - Configuration object containing state and dependencies
 * @returns Object containing all event handler functions
 */
export function useOnboardingHandlers({
  formData,
  setFormData,
  chatSteps,
  setChatSteps,
  user,
  ai,
  requiredFields,
  specialFields,
  unrelatedResponseCount,
  setUnrelatedResponseCount,
  setShowHumanSupport,
  setSupportCaseId,
  clickedSanitizedButtons,
  setClickedSanitizedButtons,
  reformulateField,
  setReformulateField,
  setIsReformulating,
  setError,
  setIsSubmitting,
  setHashtagState,
  hashtagState,
  workerProfileId,
  setWorkerProfileId,
  router,
  existingProfileData
}: any) {

  const handleInputSubmit = useCallback(async (stepId: number, inputName: string, inputValue?: string) => {
    const valueToUse = inputValue ?? formData[inputName];
    if (!valueToUse) {
      console.error('No value provided for input submission');
      return;
    }

    // Mark input step as complete
    setChatSteps((prev: any[]) => prev.map((step: any) => 
      step.id === stepId ? { ...step, isComplete: true } : step
    ));

    // Check for help commands first
    if (typeof valueToUse === 'string') {
      const trimmedValue = valueToUse.trim().toLowerCase();
      
      // Handle help commands
      if (trimmedValue === '/help' || trimmedValue === 'help' || trimmedValue.startsWith('/help ')) {
        setChatSteps((prev: any[]) => [
          ...prev,
          {
            id: Date.now() + 1,
            type: 'help',
            isNew: true,
          }
        ]);
        return;
      }
      
      // Handle manual switch command
      if (trimmedValue === '/manual' || trimmedValue === 'manual' || trimmedValue.startsWith('/manual ')) {
        setChatSteps((prev: any[]) => [
          ...prev,
          {
            id: Date.now() + 1,
            type: 'bot',
            content: 'Switching to manual form...',
            isNew: true,
          }
        ]);
        // Trigger manual form switch via custom event
        const switchEvent = new CustomEvent('switchToManual');
        document.dispatchEvent(switchEvent);
        return;
      }
      
      // Handle support command
      if (trimmedValue === '/support' || trimmedValue === 'support' || trimmedValue.startsWith('/support ')) {
        setChatSteps((prev: any[]) => [
          ...prev,
          {
            id: Date.now() + 1,
            type: 'support',
            isNew: true,
          }
        ]);
        return;
      }
    }

    // Update form data
    const updatedFormData = { ...formData, [inputName]: valueToUse };
    setFormData(updatedFormData);

    // Analyze chat steps for escalation patterns
    const chatAnalysis = analyzeChatStepsForEscalation(chatSteps);
    
    // Check for escalation triggers in user input
    let shouldEscalate = false;
    let escalationReason = '';
    let escalationConfidence = 0;

    if (typeof valueToUse === 'string') {
      const escalationTrigger = detectEscalationTriggers(valueToUse, {
        retryCount: unrelatedResponseCount,
        conversationLength: chatSteps.length,
        userRole: 'worker',
        gigId: undefined
      });

      if (escalationTrigger.shouldEscalate) {
        shouldEscalate = true;
        escalationReason = escalationTrigger.reason;
        escalationConfidence = escalationTrigger.confidence;
      }
    }

    // Also check chat step analysis
    if (chatAnalysis.shouldEscalate) {
      shouldEscalate = true;
      escalationReason = chatAnalysis.reason;
      escalationConfidence = Math.max(escalationConfidence, chatAnalysis.confidence);
    }

    // If escalation is needed, increment unrelated response counter and check if we should stop onboarding
    if (shouldEscalate) {
      const newUnrelatedCount = unrelatedResponseCount + 1;
      setUnrelatedResponseCount(newUnrelatedCount);

      // After 3 unrelated responses, escalate to human support (like old onboarding)
      if (newUnrelatedCount >= 3) {
        const description = `Onboarding stopped after ${newUnrelatedCount} unrelated responses. ${escalationReason}`;
        
        const caseId = await saveSupportCaseToDatabase(
          { userId: user?.uid, formData },
          chatSteps,
          description
        );
        
        setSupportCaseId(caseId);
        setShowHumanSupport(true);
        
        setChatSteps((prev: any[]) => [
          ...prev,
          {
            id: Date.now() + 1,
            type: 'bot',
            content: `I understand you're having trouble with the AI onboarding process. I've created a support case (${caseId}) and our team will be in touch shortly.`,
            isNew: true,
          },
          {
            id: Date.now() + 2,
            type: 'support',
            isNew: true,
          }
        ]);
        
        return;
      } else {
        // Show warning message for first 2 attempts
        setChatSteps((prev: any[]) => [
          ...prev,
          {
            id: Date.now() + 1,
            type: 'bot',
            content: `I notice you might be having some difficulty. Let me try to help you with this step. If you continue to have trouble, I can connect you with our support team.`,
            isNew: true,
          }
        ]);
        
        // Continue with normal flow but with warning
        return;
      }
    }

    // Find the previous bot message to check for unrelated responses
    const currentStepIndex = chatSteps.findIndex((s: any) => s.id === stepId);
    const previousBotMessage = chatSteps
      .slice(0, currentStepIndex)
      .reverse()
      .find((s: any) => s.type === 'bot' && s.content);
    
    if (previousBotMessage && previousBotMessage.content) {
      const isUnrelated = await isUnrelatedResponse(valueToUse, previousBotMessage.content, ai);
      
      if (isUnrelated) {
        const newCount = unrelatedResponseCount + 1;
        setUnrelatedResponseCount(newCount);
        
        if (newCount >= 3) {
          // Escalate to human support after 3 unrelated responses
          const caseId = await saveSupportCaseToDatabase(
            { userId: user?.uid, formData },
            chatSteps,
            'Multiple unrelated responses - user struggling with AI onboarding'
          );
          setSupportCaseId(caseId);
          setShowHumanSupport(true);
          
          setChatSteps((prev: any[]) => [
            ...prev,
            {
              id: Date.now() + 1,
              type: 'bot',
              content: `I understand you're having trouble with the AI onboarding process. I've created a support case (${caseId}) and our team will be in touch shortly.`,
              isNew: true,
            },
            {
              id: Date.now() + 2,
              type: 'support',
              isNew: true,
            }
          ]);
          
          return;
        }
      }
    }

    // Handle different field types
    if (inputName === 'skills' && !formData.jobTitle) {
      // First check if this skill title already exists across all workers
      const existingSkillTitleResult = await checkExistingSkillTitle(valueToUse, workerProfileId || '');
      
      if (existingSkillTitleResult.exists && existingSkillTitleResult.existingSkills.length > 0) {
        // Skill title already exists, show warning and ask for different title
        setChatSteps((prev: any[]) => [
          ...prev,
          buildExistingSkillTitleConfirmationStep(stepId, inputName, valueToUse, existingSkillTitleResult.existingSkills) as unknown as any,
        ]);
        return; // Stop processing here
      }
      
      // If no existing skill title conflict, continue with normal flow
      const jobTitleResult = await interpretJobTitle(valueToUse, ai);
      
      if (jobTitleResult && jobTitleResult.confidence >= 30) {
        setChatSteps((prev: any[]) => [
          ...prev,
          buildJobTitleConfirmationStep(stepId, inputName, valueToUse, jobTitleResult) as unknown as any,
        ]);
      } else {
        const similarSkillsResult = await checkExistingSimilarSkill(valueToUse, workerProfileId || '');
        
        if (similarSkillsResult.exists && similarSkillsResult.similarSkills.length > 0) {
          // User already has this skill, show confirmation step
          setChatSteps((prev: any[]) => [
            ...prev,
            buildSimilarSkillsConfirmationStep(stepId, inputName, valueToUse, similarSkillsResult.similarSkills) as unknown as any,
          ]);
        } else {
          // Continue with normal flow - this would be handled by the step-flow utility
          console.log('Continue with normal flow for skills');
        }
      }
    } else {
      // Continue with normal flow for other fields
      console.log('Continue with normal flow for other fields');
    }
  }, [formData, setFormData, chatSteps, setChatSteps, user, ai, unrelatedResponseCount, setUnrelatedResponseCount, setShowHumanSupport, setSupportCaseId]);

  const handleSanitizedConfirm = useCallback(async (fieldName: string, sanitized: string | unknown) => {
    try {
      setClickedSanitizedButtons((prev: Set<string>) => new Set([...prev, `${fieldName}-confirm`]));
      
      const updatedFormData = { ...formData, [fieldName]: sanitized };
      setFormData(updatedFormData);

      // Mark sanitized step as complete
      setChatSteps((prev: any[]) => prev.map((step: any) => 
        step.type === "sanitized" && step.fieldName === fieldName ? { ...step, isComplete: true } : step
      ));

      // Continue to next step - this would be handled by the step-flow utility
    } catch (error) {
      setError('Failed to confirm. Please try again.');
    }
  }, [formData, setFormData, chatSteps, setChatSteps, setError, setClickedSanitizedButtons]);

  /**
   * Handle video upload to Firebase Storage
   * Uploads the video file and creates a confirmation step for user review
   */
  const handleVideoUpload = useCallback(async (file: Blob, name?: string, stepId?: number) => {
    try {
      const storage = getStorage(firebaseApp);
      const fileName = `workers/${user?.uid}/introVideo/introduction-${encodeURI(user?.email ?? user?.uid)}.webm`;
      const storageReference = storageRef(storage, fileName);
      
      const uploadTask = uploadBytesResumable(storageReference, file);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          // Progress tracking could be added here
        },
        (error) => {
          setError('Video upload failed. Please try again.');
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Update video URL in profile
            await updateVideoUrlProfileAction(downloadURL, user?.token);
            
            // Update form data
            const updatedFormData = { ...formData, videoIntro: downloadURL };
            setFormData(updatedFormData);

            // Generate AI video script for user guidance
            let aiScript = '';
            try {
              aiScript = await generateAIVideoScript(updatedFormData, ai);
            } catch (scriptError) {
              console.error('AI script generation failed:', scriptError);
            }

            // Mark video step as complete and add sanitized confirmation step
            setChatSteps((prev: any[]) => prev.map((step: any) => 
              step.id === stepId ? { ...step, isComplete: true } : step
            ).concat([{
              id: Date.now(),
              type: "sanitized",
              fieldName: "videoIntro",
              sanitizedValue: downloadURL,
              originalValue: "Video uploaded",
              aiScript: aiScript, // Include AI-generated script
              naturalSummary: "I saved the video introduction! 🎥",
              extractedData: JSON.stringify({ videoIntro: downloadURL }),
              isNew: true,
            }]));
          } catch (error) {
            setError('Failed to save video. Please try again.');
          }
        }
      );
    } catch (error) {
      setError('Video upload failed. Please try again.');
    }
  }, [formData, setFormData, chatSteps, setChatSteps, user, setError]);

  const handleJobTitleConfirm = useCallback(async (fieldName: string, suggestedJobTitle: string, originalValue: string) => {
    setChatSteps((prev: any[]) => prev.map((step: any) => 
      step.type === "jobTitleConfirmation" && step.fieldName === fieldName ? { ...step, isComplete: true, confirmedChoice: 'title' } : step
    ));
    
    // Check if user already has similar skills for this job title
    const similarSkillsResult = await checkExistingSimilarSkill(suggestedJobTitle, workerProfileId || '');
    
    if (similarSkillsResult.exists && similarSkillsResult.similarSkills.length > 0) {
      setChatSteps((prev: any[]) => [
        ...prev,
        buildSimilarSkillsConfirmationStep(Date.now(), fieldName, suggestedJobTitle, similarSkillsResult.similarSkills) as unknown as any,
      ]);
    } else {
      // Use the suggested job title and continue
      const updatedFormData = { ...formData, [fieldName]: suggestedJobTitle };
      setFormData(updatedFormData);
      console.log('Continue with job title confirmation');
    }
  }, [formData, setFormData, chatSteps, setChatSteps, user]);

  const handleJobTitleReject = useCallback(async (fieldName: string, originalValue: string) => {
    setChatSteps((prev: any[]) => prev.map((step: any) => 
      step.type === "jobTitleConfirmation" && step.fieldName === fieldName ? { ...step, isComplete: true, confirmedChoice: 'original' } : step
    ));
    
    // Use the original value and continue
    const updatedFormData = { ...formData, [fieldName]: originalValue };
    setFormData(updatedFormData);
    console.log('Continue with job title rejection');
  }, [formData, setFormData, chatSteps, setChatSteps]);

  const handleSimilarSkillsUseExisting = useCallback(async (fieldName: string, selectedSkill: any) => {
    setChatSteps((prev: any[]) => prev.map((step: any) => 
      step.type === "similarSkillsConfirmation" && step.fieldName === fieldName ? { ...step, isComplete: true, confirmedChoice: 'existing' } : step
    ));
    
    // Use the selected existing skill
    const updatedFormData = { ...formData, [fieldName]: selectedSkill.name };
    setFormData(updatedFormData);
    console.log('Continue with similar skills use existing');
  }, [formData, setFormData, chatSteps, setChatSteps]);

  const handleSimilarSkillsAddNew = useCallback(async (fieldName: string, originalValue: string) => {
    setChatSteps((prev: any[]) => prev.map((step: any) => 
      step.type === "similarSkillsConfirmation" && step.fieldName === fieldName ? { ...step, isComplete: true, confirmedChoice: 'new' } : step
    ));
    
    // Use the original value as a new skill
    const updatedFormData = { ...formData, [fieldName]: originalValue };
    setFormData(updatedFormData);
    console.log('Continue with similar skills add new');
  }, [formData, setFormData, chatSteps, setChatSteps]);

  const handleSimilarSkillsGoHome = useCallback(() => {
    // Navigate back to home or reset the flow
    setChatSteps([]);
    setFormData({});
  }, [setChatSteps, setFormData]);

  const handleExistingSkillTitleUseAnyway = useCallback(async (fieldName: string, originalValue: string) => {
    setChatSteps((prev: any[]) => prev.map((step: any) => 
      step.type === "confirmation" && step.confirmationConfig?.type === "existing-skill-title" && step.confirmationConfig?.fieldName === fieldName ? 
        { ...step, isComplete: true, confirmedChoice: 'use-anyway' } : step
    ));
    
    // Use the original value and continue
    const updatedFormData = { ...formData, [fieldName]: originalValue };
    setFormData(updatedFormData);
    console.log('Continue with existing skill title anyway');
  }, [formData, setFormData, chatSteps, setChatSteps]);

  const handleExistingSkillTitleChange = useCallback((fieldName: string) => {
    setChatSteps((prev: any[]) => prev.map((step: any) => 
      step.type === "confirmation" && step.confirmationConfig?.type === "existing-skill-title" && step.confirmationConfig?.fieldName === fieldName ? 
        { ...step, isComplete: true, confirmedChoice: 'change' } : step
    ));
    
    // Add input step for changing the skill title
    // Add bot message asking for new input instead of input step
    setChatSteps((prev: any[]) => [...prev, {
      id: Date.now(),
      type: "bot",
      content: "Please enter a different skill title...",
      isComplete: true,
      isNew: true,
    }]);
  }, [setChatSteps]);

  const handlePickerConfirm = useCallback(async (stepId: number, inputName: string) => {
    const value = formData[inputName];
    if (!value) {
      setError('Please select a value before confirming.');
      return;
    }

    // Mark picker step as complete
    setChatSteps((prev: any[]) => prev.map((step: any) => 
      step.id === stepId ? { ...step, isComplete: true } : step
    ));

    // Continue to next step using the proper flow
    const updatedFormData = { ...formData, [inputName]: value };
    await addNextStepSafely(updatedFormData, ai, chatSteps, setChatSteps, workerProfileId, existingProfileData);
  }, [formData, setFormData, setChatSteps, setError, ai, chatSteps, workerProfileId, existingProfileData]);

  const handleInputChange = useCallback((name: string, value: unknown) => {
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  }, [setFormData]);

  const handleSanitizedReformulate = useCallback((fieldName: string) => {
    setReformulateField(fieldName);
    setClickedSanitizedButtons((prev: Set<string>) => new Set([...prev, `${fieldName}-reformulate`]));
  }, [setReformulateField, setClickedSanitizedButtons]);

  const handleSanitizedConfirmation = useCallback(async (fieldName: string, sanitizedValue: string) => {
    // Update form data with sanitized value
    setFormData((prev: any) => ({ ...prev, [fieldName]: sanitizedValue }));
    
    // Mark sanitized step as complete
    setChatSteps((prev: any[]) => prev.map((step: any) => 
      step.type === "sanitized" && step.fieldName === fieldName ? 
        { ...step, isComplete: true } : step
    ));
    
    // Continue to next step
    const updatedFormData = { ...formData, [fieldName]: sanitizedValue };
    await addNextStepSafely(updatedFormData, ai, chatSteps, setChatSteps, workerProfileId, existingProfileData);
  }, [formData, setFormData, setChatSteps, ai, chatSteps, workerProfileId, existingProfileData]);

  const handleIncidentReporting = useCallback(async (message: string) => {
    try {
      // Implementation for incident reporting
      console.log('Incident reported:', message);
    } catch (error) {
      console.error('Failed to report incident:', error);
      setError('Failed to report incident. Please try again.');
    }
  }, [setError]);

  const onSendMessage = useCallback((message: string) => {
    // Handle user message sending
    console.log('User message:', message);
  }, []);

  const enhancedValidation = useCallback(async (field: string, value: unknown, type: string): Promise<{ sufficient: boolean, clarificationPrompt?: string, sanitized?: string | unknown, naturalSummary?: string, extractedData?: string }> => {
    if (!value) {
      return { 
        sufficient: false, 
        clarificationPrompt: 'Please provide some information so I can help you create the perfect worker profile!'
      };
    }

    const trimmedValue = String(value).trim();
    
    // Create analysis context for enhanced validation
    const analysisContext: ValidationContext = {
      currentStep: field,
      currentField: field,
      conversationLength: chatSteps.length,
      retryCount: unrelatedResponseCount,
      userRole: 'worker',
      previousMessages: chatSteps.filter((step: any) => step.type === 'user').map((step: any) => step.content || '').slice(-5)
    };
    
    try {
      // 1. ENHANCED INPUT VALIDATION (AI + Hardcoded patterns)
      const validation = await validateUserInput(trimmedValue, analysisContext, ai);
      
      // 2. CHECK FOR HELP REQUESTS OR SUPPORT NEEDS
      if (validation.isHelpRequest || validation.needsSupport) {
        const response = generateValidationResponse(validation, analysisContext);
        return {
          sufficient: false,
          clarificationPrompt: response,
          sanitized: trimmedValue
        };
      }
      
      // 3. CHECK FOR INAPPROPRIATE CONTENT
      if (validation.isInappropriate) {
        const response = generateValidationResponse(validation, analysisContext);
        return {
          sufficient: false,
          clarificationPrompt: response,
          sanitized: trimmedValue
        };
      }
      
      // 4. CHECK FOR ESCALATION NEEDS
      if (requiresEscalation(validation)) {
        const escalationDetails = getEscalationDetails(validation, analysisContext, trimmedValue);
        console.log('🚨 Escalation required:', escalationDetails);
        
        // TODO: Implement escalation handling (save to database, notify support team)
        return {
          sufficient: false,
          clarificationPrompt: `I've detected that you might need additional support. ${validation.reason}`,
          sanitized: trimmedValue
        };
      }
      
      // 5. AI-POWERED SANITIZATION (if input passed enhanced validation)
      let aiSanitizedResult: any = null;
      try {
        aiSanitizedResult = await sanitizeWithAI(field, trimmedValue);
      } catch (aiError) {
        console.error('AI sanitization failed:', aiError);
      }

      // 6. FIELD-SPECIFIC VALIDATION (if input passed enhanced validation)
      let validationResult: any = { ok: false };
      
      // Route to appropriate field setter based on field name
      switch (field) {
        case 'about':
          validationResult = setBio(trimmedValue, {
            retryCount: unrelatedResponseCount,
            conversationLength: chatSteps.length,
            userRole: 'worker'
          });
          break;
        case 'skills':
          validationResult = setSkillName(trimmedValue);
          break;
        case 'experience':
          validationResult = setExperience(trimmedValue);
          break;
        case 'hourlyRate':
          validationResult = setWage(trimmedValue);
          break;
        case 'location':
          validationResult = setAddress(value);
          break;
        case 'availability':
          validationResult = setAvailability(value);
          break;
        case 'equipment':
          validationResult = setEquipment(trimmedValue);
          break;
        case 'qualifications':
          validationResult = setQualifications(trimmedValue);
          break;
        case 'videoIntro':
          validationResult = setVideoIntro(value);
          break;
        default:
          // Fallback to basic validation for unknown fields
          return {
            sufficient: true,
            sanitized: aiSanitizedResult?.sanitized || validation.sanitizedInput || trimmedValue,
            naturalSummary: aiSanitizedResult?.naturalSummary || `You provided: ${trimmedValue}`,
            extractedData: aiSanitizedResult?.sanitized || validation.sanitizedInput || trimmedValue
          };
      }

      // Check if field-specific validation failed
      if (!validationResult.ok) {
        return {
          sufficient: false,
          clarificationPrompt: validationResult.error || 'Please provide valid information.',
          sanitized: validation.sanitizedInput || trimmedValue
        };
      }

      // Check if support is needed in field-specific validation
      if (validationResult.needsSupport) {
        return {
          sufficient: false,
          clarificationPrompt: validationResult.supportMessage || 'Support assistance needed.',
          sanitized: validation.sanitizedInput || trimmedValue
        };
      }

      // Return successful validation with AI enhancement
      return {
        sufficient: true,
        sanitized: aiSanitizedResult?.sanitized || validationResult[field] || validationResult.bio || validationResult.skillName || validationResult.experienceText || validationResult.wage || validationResult.address || validationResult.location || validationResult.availability || validation.sanitizedInput || trimmedValue,
        naturalSummary: aiSanitizedResult?.naturalSummary || `You provided: ${trimmedValue}`,
        extractedData: aiSanitizedResult?.sanitized || validationResult[field] || validationResult.bio || validationResult.skillName || validationResult.experienceText || validationResult.wage || validationResult.address || validationResult.location || validationResult.availability || validation.sanitizedInput || trimmedValue
      };
    } catch (error) {
      console.error('Enhanced validation error:', error);
      return {
        sufficient: true,
        sanitized: trimmedValue,
        naturalSummary: `You provided: ${trimmedValue}`,
        extractedData: trimmedValue
      };
    }
  }, [ai, setError, unrelatedResponseCount, chatSteps.length]);

  const handleManualFormSubmit = useCallback(async (formData: any) => {
    // Simplified version - can be expanded later
    console.log('Manual form submit:', formData);
  }, []);

  const hasActiveStepForField = useCallback((fieldName: string) => {
    return chatSteps.some((step: any) => 
      (step.type === 'input' || step.type === 'sanitized' || step.type === 'confirmation' || 
       step.type === 'jobTitleConfirmation' || step.type === 'similarSkillsConfirmation') &&
      step.fieldName === fieldName && 
      !step.isComplete
    );
  }, [chatSteps]);

  const getNextRequiredField = useCallback((formData: any) => {
    // Check if user already has location and availability data
    const hasLocationAndAvailability = !!(formData.location && formData.availability);
    
    if (hasLocationAndAvailability) {
      // Skip location and availability fields if user already has them
      return requiredFields.find((f: any) => !formData[f.name] && f.name !== 'location' && f.name !== 'availability');
    }
    
    return requiredFields.find((f: any) => !formData[f.name]);
  }, [requiredFields]);

  const isActiveInputStep = useCallback((step: any, idx: number) => {
    const lastIncompleteInputStep = chatSteps
      .filter((s: any) => (s.type === 'input' || s.type === 'calendar' || s.type === 'location') && !s.isComplete)
      .pop();
    
    return step.id === lastIncompleteInputStep?.id;
  }, [chatSteps]);

  const handleSetupChoice = useCallback((choice: 'ai' | 'manual') => {
    // Simplified version - can be expanded later
    console.log('Setup choice:', choice);
  }, []);

  const handleSwitchToAI = useCallback(() => {
    // Simplified version - can be expanded later
    console.log('Switch to AI');
  }, []);

  const handleResetChoice = useCallback(() => {
    // Simplified version - can be expanded later
    console.log('Reset choice');
  }, []);

  const handleProfileSubmission = useCallback(async (summaryData: any) => {
    if (!user?.token) {
      setError('Authentication required. Please sign in again.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Parse experience to get numeric values
      const { years: experienceYears, months: experienceMonths } = parseExperienceToNumeric(summaryData?.experience || '');
      
      // Generate AI profile summary
      let aiProfileSummary = '';
      try {
        aiProfileSummary = await generateAIProfileSummary(summaryData, ai);
      } catch (summaryError) {
        console.error('AI profile summary generation failed:', summaryError);
      }
      
      const requiredData = {
        about: summaryData?.about || '',
        experience: summaryData?.experience || '',
        skills: summaryData?.skills || '',
        qualifications: summaryData?.qualifications || '',
        equipment: typeof summaryData?.equipment === 'string' && summaryData.equipment.trim().length > 0
          ? summaryData.equipment.split(/[,\n;]/).map((item: string) => ({ name: item.trim(), description: undefined })).filter((item: { name: string; description: undefined }) => item.name.length > 0)
          : [],
        hourlyRate: String(summaryData?.hourlyRate || ''),
        location: summaryData?.location || '',
        availability: summaryData?.availability || { 
          days: [], 
          startTime: '09:00', 
          endTime: '17:00',
          frequency: 'weekly',
          ends: 'never',
          startDate: new Date().toISOString().split('T')[0],
          endDate: undefined,
          occurrences: undefined
        },
        videoIntro: summaryData?.videoIntro || '',
        references: summaryData?.references || '',
        jobTitle: summaryData?.jobTitle || '',
        experienceYears: experienceYears,
        experienceMonths: experienceMonths
      };
      
      // Debug: Log the data being sent
      console.log('🔍 Profile submission data:', requiredData);
      console.log('🔍 Summary data received:', summaryData);
      
      // Use the profile submission utility
      await submitProfileToDatabase(requiredData, user.token, user.uid, setChatSteps, setWorkerProfileId, setError, router, ai);
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [user, setError, setIsSubmitting, setChatSteps, setWorkerProfileId, router, ai]);

  return {
    handleInputSubmit,
    handleSanitizedConfirm,
    handleVideoUpload,
    handleJobTitleConfirm,
    handleJobTitleReject,
    handleSimilarSkillsUseExisting,
    handleSimilarSkillsAddNew,
    handleSimilarSkillsGoHome,
    handlePickerConfirm,
    handleInputChange,
    handleSanitizedReformulate,
    handleSanitizedConfirmation,
    handleIncidentReporting,
    onSendMessage,
    enhancedValidation,
    handleManualFormSubmit,
    hasActiveStepForField,
    getNextRequiredField,
    isActiveInputStep,
    handleSetupChoice,
    handleSwitchToAI,
    handleResetChoice,
    handleExistingSkillTitleUseAnyway,
    handleExistingSkillTitleChange,
    handleProfileSubmission
  };
}