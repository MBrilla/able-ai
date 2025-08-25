"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import ChatBotLayout from "@/app/components/onboarding/ChatBotLayout";
import MessageBubble from "@/app/components/onboarding/MessageBubble";
import LocationPickerBubble from "@/app/components/onboarding/LocationPickerBubble";
import CalendarPickerBubble from "@/app/components/onboarding/CalendarPickerBubble";
import Loader from "@/app/components/shared/Loader";

import pageStyles from "./page.module.css";

import { useAuth } from "@/context/AuthContext";
import { createGig } from "@/actions/gigs/create-gig";
import { FormInputType } from "@/app/types/form";
import { geminiAIAgent } from '@/lib/firebase/ai';
import { useFirebase } from '@/context/FirebaseContext';
import { Schema } from '@firebase/ai';
import MatchingWorkersDisplay from "@/app/components/gigs/MatchingWorkersDisplay";
import { MatchingWorker } from "@/actions/gigs/find-matching-workers";

// Import job title sanitization functions
import {
  findClosestJobTitle,
  ALL_JOB_TITLES
} from '@/app/components/shared/ChatAI';

// Import ChatAI system for structured prompts
import {
  buildContextPrompt,
  buildRolePrompt,
  buildSpecializedPrompt,
  CONTEXT_PROMPTS,
  SPECIALIZED_PROMPTS,
  ROLE_SPECIFIC_PROMPTS
} from '@/app/components/shared/ChatAI';

// Helper: interpret gig description and find standardized job title
async function interpretGigJobTitle(gigDescription: string, ai: any): Promise<{ jobTitle: string; confidence: number; matchedTerms: string[] } | null> {
  try {
    if (!ai) {
      // Fallback to basic matching if AI is not available
      const basicMatch = findClosestJobTitle(gigDescription);
      return basicMatch ? {
        jobTitle: basicMatch.jobTitle.title,
        confidence: basicMatch.confidence,
        matchedTerms: basicMatch.matchedTerms
      } : null;
    }

    const interpretationPrompt = `You are Able, a GIG CREATION ASSISTANT. Your job is to analyze gig descriptions and find the closest standardized job title from our hospitality and events industry taxonomy.

Based on the following gig description, find the closest standardized job title from our available job titles.

Gig Description: "${gigDescription}"

Available Job Titles:
${ALL_JOB_TITLES.map(job => `- ${job.title} (${job.category}): ${job.description}`).join('\n')}

Rules:
1. Use semantic matching to find the closest job title
2. Consider synonyms, skills, and category relevance
3. Return the standardized job title with confidence level
4. Include matched terms as a comma-separated string (e.g., "bartender, cocktail making, customer service")
5. If no good match exists, return null

Please analyze the gig description and provide the best standardized job title match.`;

    const result = await geminiAIAgent(
      "gemini-2.0-flash",
      {
        prompt: interpretationPrompt,
        responseSchema: Schema.object({
          properties: {
            jobTitle: Schema.string(),
            confidence: Schema.number(),
            matchedTerms: Schema.string(),
          },
        }),
        isStream: false,
      },
      ai
    );

    if (result.ok && result.data && typeof result.data === 'object' && result.data !== null) {
      const data = result.data as Record<string, any>;
      const jobTitle = data.jobTitle as string;
      const confidence = data.confidence as number;
      const matchedTerms = data.matchedTerms as string;
      
      // Parse matchedTerms from string (comma-separated)
      const matchedTermsArray = data.matchedTerms ? (data.matchedTerms as string).split(',').map((term: string) => term.trim()) : [];
      
      // Validate that the returned job title exists in our taxonomy
      const validatedJobTitle = ALL_JOB_TITLES.find(job => 
        job.title.toLowerCase() === (data.jobTitle as string).toLowerCase()
      );
      
      if (validatedJobTitle) {
        return {
          jobTitle: validatedJobTitle.title,
          confidence: Math.min(data.confidence as number, 100),
          matchedTerms: matchedTermsArray
        };
      }
    }
  } catch (error) {
    console.error('AI job title interpretation failed:', error);
  }
  
  // Fallback to basic matching
  const basicMatch = findClosestJobTitle(gigDescription);
  return basicMatch ? {
    jobTitle: basicMatch.jobTitle.title,
    confidence: basicMatch.confidence,
    matchedTerms: basicMatch.matchedTerms
  } : null;
}

// Helper: check if user response is unrelated to the current prompt
function isUnrelatedResponse(userInput: any, currentPrompt: string): boolean {
  // Handle different input types
  if (!userInput) return false;
  
  // For location picker objects, extract address or coordinates
  let inputText = '';
  if (typeof userInput === 'object') {
    if ('address' in userInput && typeof userInput.address === 'string') {
      inputText = userInput.address;
    } else if ('lat' in userInput && 'lng' in userInput) {
      // For coordinate objects, extract address if available, otherwise use coordinates as text
      if ('address' in userInput && userInput.address) {
        inputText = userInput.address;
      } else {
        // If no address but has coordinates, consider it valid (coordinates are always valid for location questions)
        return false;
      }
    } else if (Array.isArray(userInput)) {
      // For arrays, join them or consider valid
      inputText = userInput.join(' ');
    } else {
      // For other objects, try to convert to string
      inputText = JSON.stringify(userInput);
    }
  } else if (typeof userInput === 'string') {
    inputText = userInput;
  } else {
    // For other types (numbers, booleans, etc.), convert to string
    inputText = String(userInput);
  }
  
  // If we still don't have text, consider it valid
  if (!inputText || inputText.trim().length === 0) return false;
  
  const unrelatedPhrases = [
    'help', 'support', 'contact', 'human', 'person', 'agent', 'representative',
    'complaint', 'issue', 'problem', 'broken', 'not working', 'error',
    'customer service', 'speak to someone', 'talk to human', 'real person',
    'please', 'need', 'want', 'can i', 'could i', 'i need', 'i want'
  ];
  
  const userLower = inputText.toLowerCase();
  const promptLower = currentPrompt.toLowerCase();
  
  // Check for unrelated phrases (more strict matching)
  const hasUnrelatedPhrase = unrelatedPhrases.some(phrase => {
    // Check for exact phrase matches
    if (userLower.includes(phrase)) return true;
    // Check for phrase with "i" prefix
    if (userLower.includes(`i ${phrase}`)) return true;
    // Check for phrase with "please" prefix
    if (userLower.includes(`please ${phrase}`)) return true;
    return false;
  });
  
  // Check if response is too short (but be more lenient for job titles and simple answers)
  const isTooShort = inputText.trim().length < 8; // Reduced from 15 to 8
  
  // Check if response doesn't contain relevant keywords from the prompt
  const promptKeywords = promptLower.match(/\b\w+\b/g) || [];
  const relevantKeywords = promptKeywords.filter(word => word.length > 3);
  const hasRelevantKeywords = relevantKeywords.some(keyword => userLower.includes(keyword));
  
  // Be more lenient for short responses that are likely valid answers
  const isLikelyValidShortAnswer = inputText.trim().length >= 3 && (
    // Job titles (common short answers)
    /^(baker|chef|cook|driver|cleaner|waiter|waitress|bartender|server|host|hostess|cashier|clerk|assistant|helper|worker|staff|employee|professional|specialist|expert|consultant|freelancer|contractor|temp|temporary|part.?time|full.?time)$/i.test(inputText.trim()) ||
    // Common short responses
    /^(yes|no|ok|okay|sure|maybe|sometimes|always|never|often|rarely|usually|probably|definitely|absolutely|certainly|definitely|exactly|precisely|correct|right|wrong|true|false)$/i.test(inputText.trim()) ||
    // Numbers and rates
    /^[\d£$€¥]+(\.[\d]+)?$/.test(inputText.trim()) ||
    // Single words that are likely valid
    inputText.trim().split(' ').length === 1 && inputText.trim().length >= 3
  );
  
  console.log('Unrelated response check:', {
    userInput: userLower,
    promptKeywords: relevantKeywords,
    hasUnrelatedPhrase,
    isTooShort,
    hasRelevantKeywords,
    isLikelyValidShortAnswer,
    result: hasUnrelatedPhrase || (isTooShort && !hasRelevantKeywords && !isLikelyValidShortAnswer)
  });
  
  return hasUnrelatedPhrase || (isTooShort && !hasRelevantKeywords && !isLikelyValidShortAnswer);
}

// Helper: save support case to Firebase
async function saveSupportCaseToFirebase(userData: any, conversationHistory: any[], reason: string): Promise<string> {
  try {
    // This would integrate with your Firebase setup
    // For now, return a mock case ID
    console.log('Saving support case to Firebase:', { userData, conversationHistory, reason });
    
    // Mock implementation - replace with actual Firebase call
    const caseId = `SUPPORT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate Firebase save
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return caseId;
  } catch (error) {
    console.error('Failed to save support case:', error);
    return `ERROR-${Date.now()}`;
  }
}

// Function to generate context-aware prompts using new ChatAI system
async function generateContextAwarePrompt(fieldName: string, gigDescription: string, ai: any): Promise<string> {
  if (!fieldName || !ai) {
    console.error('Missing required parameters for prompt generation');
    return buildSpecializedPrompt('gigCreation', `Field: ${fieldName}`, `Tell me more about your ${fieldName}`);
  }

  try {
    const promptSchema = Schema.object({
      properties: {
        prompt: Schema.string(),
      },
    });

    // Build specialized prompt using ChatAI system
    const basePrompt = buildRolePrompt('gigfolioCoach', 'Gig Creation', `Generate a friendly, contextual prompt for the next question about: ${fieldName}`);
    
    // Add field-specific context
    const fieldContext = `Previous conversation context: Gig Description: "${gigDescription || 'Not provided'}"
Next field to ask about: "${fieldName}"

Field-specific guidance for BUYERS:
- additionalInstructions: Ask about special skills or specific requirements for the gig
- hourlyRate: Ask about payment rate with context about fair compensation
- gigLocation: Ask about location with context about finding nearby workers
- gigDate: Ask about when the gig needs to be completed
- gigTime: Ask about start time with context about scheduling

The prompt should:
1. Be conversational and natural - avoid repetitive phrases
2. Reference what they've already shared about their gig in a fresh way
3. Be specific to the field being asked about
4. Include relevant emojis to make it engaging
5. Provide helpful context or examples when appropriate
6. Vary your language - don't start every message the same way
7. ALWAYS stay focused on gig creation - this is for creating a job posting

Be creative and natural in your responses. Don't repeat the same phrases or structure. Make each message feel fresh and conversational.`;

    const fullPrompt = `${basePrompt}\n\n${fieldContext}`;

    const result = await geminiAIAgent(
      "gemini-2.0-flash",
      {
        prompt: fullPrompt,
        responseSchema: promptSchema,
        isStream: false,
      },
      ai
    );

    if (result.ok && result.data) {
      const data = result.data as { prompt: string };
      return data.prompt || buildSpecializedPrompt('gigCreation', `Field: ${fieldName}`, `Tell me more about your ${fieldName}`);
    }
  } catch (error) {
    console.error('AI prompt generation failed:', error);
  }
  
  // Fallback using ChatAI system
  return buildSpecializedPrompt('gigCreation', `Field: ${fieldName}`, `Tell me more about your ${fieldName}`);
}

// Type definitions for better type safety
interface RequiredField {
  name: string;
  type: string;
  placeholder?: string;
  defaultPrompt: string;
  rows?: number;
}

interface FormData {
  gigDescription?: string;
  additionalInstructions?: string;
  hourlyRate?: number;
  gigLocation?: { lat: number; lng: number; formatted_address?: string } | string;
  gigDate?: string;
  gigTime?: string;
  jobTitle?: string; // Standardized job title
  jobTitleConfidence?: number; // Confidence level of job title match
  matchedTerms?: string[]; // Terms that matched for job title
  [key: string]: any;
}

// Chat step type definition
type ChatStep = {
  id: number;
  type: "bot" | "user" | "input" | "sanitized" | "typing" | "calendar" | "location" | "confirm" | "support" | "jobTitleConfirmation" | "summary" | "workerMatching";
  content?: string;
  inputConfig?: {
    type: string;
    name: string;
    placeholder?: string;
    rows?: number;
  };
  isComplete?: boolean;
  sanitizedValue?: string | any;
  originalValue?: string | any;
  fieldName?: string;
  isNew?: boolean;
  naturalSummary?: string;
  extractedData?: string;
  suggestedJobTitle?: string; // For job title confirmation
  confidence?: number; // For job title confidence
  matchedTerms?: string[]; // For job title matched terms
  summaryData?: FormData; // For summary display
  workers?: MatchingWorker[]; // For worker matching display
};

// AI response types for better type safety
interface AIValidationResponse {
  isAppropriate: boolean;
  isGigRelated: boolean;
  isSufficient: boolean;
  clarificationPrompt: string;
  sanitizedValue: string;
  naturalSummary: string;
  extractedData: string;
}

// Define required fields and their configs for buyer gig creation
const requiredFields: RequiredField[] = [
  { name: "gigDescription", type: "text", placeholder: "e.g., Bartender for a wedding reception", defaultPrompt: "Hi! I'm Able, your friendly AI assistant! 🎉 I'm here to help you create the perfect gig listing. Tell me what kind of work you need help with - whether it's bartending for a wedding, web development for your business, or anything else! What's your gig all about?", rows: 3 },
  { name: "additionalInstructions", type: "text", placeholder: "e.g., Cocktail making experience would be ideal", defaultPrompt: "Great! Now tell me more about what you need. Do you need any special skills or do you have specific instructions for your hire?", rows: 3 },
  { name: "hourlyRate", type: "number", placeholder: "£15", defaultPrompt: "Perfect! How much would you like to pay per hour? We suggest £15 plus tips to keep a motivated and happy team! 💰" },
  { name: "gigLocation", type: "location", defaultPrompt: "Excellent! Where is the gig located? This helps us find workers in your area! 📍" },
  { name: "gigDate", type: "date", defaultPrompt: "Great! What date is the gig? 📅" },
  { name: "gigTime", type: "time", defaultPrompt: "Perfect! What time does the gig start? ⏰" },
];

// Typing indicator component
const TypingIndicator: React.FC = () => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    padding: '12px 16px', 
    color: 'var(--secondary-color)', 
    fontWeight: 600,
    animation: 'slideIn 0.3s ease-out',
    opacity: 0,
    animationFillMode: 'forwards'
  }}>
    <div style={{ 
      display: 'flex', 
      gap: '4px',
      background: 'rgba(126, 238, 249, 0.1)',
      padding: '8px 12px',
      borderRadius: '20px',
      border: '1px solid rgba(126, 238, 249, 0.2)'
    }}>
      <span className="typing-dot" style={{ 
        animation: 'typingBounce 1.4s infinite ease-in-out',
        fontSize: '18px',
        lineHeight: '1'
      }}>●</span>
      <span className="typing-dot" style={{ 
        animation: 'typingBounce 1.4s infinite ease-in-out 0.2s',
        fontSize: '18px',
        lineHeight: '1'
      }}>●</span>
      <span className="typing-dot" style={{ 
        animation: 'typingBounce 1.4s infinite ease-in-out 0.4s',
        fontSize: '18px',
        lineHeight: '1'
      }}>●</span>
    </div>
    <style>{`
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes typingBounce {
        0%, 60%, 100% {
          transform: translateY(0);
          opacity: 0.4;
        }
        30% {
          transform: translateY(-8px);
          opacity: 1;
        }
      }
    `}</style>
  </div>
);

TypingIndicator.displayName = 'TypingIndicator';



// Worker card component
const WorkerCard: React.FC<{ worker: MatchingWorker; onChat: (workerId: string) => void }> = ({ worker, onChat }) => {
  return (
    <div style={{
      background: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
      maxWidth: '400px'
    }}>
      {/* Worker Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary-color), var(--primary-darker-color))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '12px',
          fontSize: '18px',
          fontWeight: '600',
          color: 'white'
        }}>
          {worker.user.fullName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ color: 'white', fontWeight: '600', fontSize: '16px' }}>
            {worker.user.fullName}
          </div>
          <div style={{ color: '#888', fontSize: '14px' }}>
            📧 {worker.user.email}
          </div>
        </div>
      </div>

      {/* Worker Details */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ color: '#e5e5e5', marginBottom: '8px' }}>
          <strong>Skills:</strong> {worker.skills.slice(0, 3).map(s => s.name).join(', ')}
          {worker.skills.length > 3 && ` +${worker.skills.length - 3} more`}
        </div>
        <div style={{ color: '#e5e5e5', marginBottom: '8px' }}>
          <strong>Top Rate:</strong> £{Math.max(...worker.skills.map(s => s.agreedRate))}/hour
        </div>
        <div style={{ color: '#e5e5e5', marginBottom: '8px' }}>
          <strong>Location:</strong> {worker.location}
        </div>
        <div style={{ color: '#888', fontSize: '14px' }}>
          📍 {worker.distance.toFixed(1)}km away
          {worker.responseRateInternal && ` • ${worker.responseRateInternal}% response rate`}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => onChat(worker.userId)}
          style={{
            background: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px',
            flex: 1
          }}
        >
          💬 Chat with {worker.user.fullName.split(' ')[0]}
        </button>
      </div>
    </div>
  );
};

export default function OnboardBuyerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const endOfChatRef = useRef<HTMLDivElement>(null);
  const { ai } = useFirebase();

  const [formData, setFormData] = useState<FormData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmedSteps, setConfirmedSteps] = useState<Set<number>>(new Set());
  const [chatSteps, setChatSteps] = useState<ChatStep[]>([]);
  const [expandedSummaryFields, setExpandedSummaryFields] = useState<Record<string, boolean>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [reformulateField, setReformulateField] = useState<string | null>(null);
  const [isReformulating, setIsReformulating] = useState(false);
  const [clickedSanitizedButtons, setClickedSanitizedButtons] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<MatchingWorker | null>(null);
  
  // Unrelated response tracking
  const [unrelatedResponseCount, setUnrelatedResponseCount] = useState(0);
  const [showHumanSupport, setShowHumanSupport] = useState(false);
  const [supportCaseId, setSupportCaseId] = useState<string | null>(null);
  
  // Worker matching state
  const [matchingWorkers, setMatchingWorkers] = useState<MatchingWorker[]>([]);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(false);
  const [showWorkerMatching, setShowWorkerMatching] = useState(false);

  // Helper to get next required field not in formData
  function getNextRequiredField(formData: FormData) {
    return requiredFields.find(f => !formData[f.name]);
  }

  // Handle worker selection for matchmaking
  const handleWorkerSelect = (worker: MatchingWorker) => {
    setSelectedWorker(worker);
  };

  // AI-powered validation function using Gemini
  const simpleAICheck = useCallback(async (field: string, value: any, type: string): Promise<{ sufficient: boolean, clarificationPrompt?: string, sanitized?: string | any, naturalSummary?: string, extractedData?: string }> => {
    if (!value) {
      return { 
        sufficient: false, 
        clarificationPrompt: 'Please provide some information so I can help you create the perfect gig listing!' 
      };
    }

    const trimmedValue = String(value).trim();
    
    // Use AI for all validation
    try {
      if (!ai) {
        console.error('AI service not available');
        return { sufficient: true, sanitized: trimmedValue }; // Fallback to accept input
      }

      const validationSchema = Schema.object({
        properties: {
          isAppropriate: Schema.boolean(),
          isGigRelated: Schema.boolean(),
          isSufficient: Schema.boolean(),
          clarificationPrompt: Schema.string(),
          sanitizedValue: Schema.string(),
          naturalSummary: Schema.string(),
          extractedData: Schema.string(),
        },
      });

      const prompt = `You are Able, a GIG CREATION ASSISTANT. Your ONLY job is to help users create gig listings (job postings) on a gig platform. You are NOT a general assistant, therapist, or friend. You ONLY help with gig creation.

CRITICAL: This is a GIG CREATION FLOW. The user is creating a job posting to hire someone for work. They are the BUYER/EMPLOYER posting a job. You are helping them create a gig listing.

Previous context from this conversation:
${Object.entries(formData).filter(([key, value]) => value && key !== field).map(([key, value]) => `${key}: ${value}`).join(', ')}

Current field being validated: "${field}"
User input: "${trimmedValue}"
Input type: "${type}"

ENHANCED VALIDATION & SANITIZATION REQUIREMENTS:

1. **Basic Validation:**
   - isAppropriate: Check if content is appropriate for professional gig platform
   - isGigRelated: Check if content relates to gig work, events, services, or job requirements
   - isSufficient: Check if content provides basic information

2. **Intelligent Sanitization & Data Extraction:**
   - naturalSummary: Create a natural, conversational summary for user confirmation
   - extractedData: Extract and structure key information as JSON string

3. **Field-Specific Intelligence:**
   - **gigDescription**: Extract job type, requirements, format naturally, and identify standardized job title
   - **additionalInstructions**: Extract skills needed, format as clear requirements
   - **hourlyRate**: Extract the numeric value only (e.g., "£15" → 15, "15 pounds" → 15). Store as a clean number without currency symbols or text.
   - **gigLocation**: For location objects, use the formatted_address for natural summary. If it's a string, use as-is. If it's coordinates object, extract the formatted_address or create a natural summary like "So the gig is located at [formatted_address], right?"
   - **gigDate**: Ensure proper date format
   - **gigTime**: Handle time ranges and single times, convert to 24-hour format

4. **Natural Summary Examples:**
   - User: "Bartender for wedding" → AI: "Got it, you need a bartender for a wedding reception, right?"
   - User: "15" → AI: "Perfect! You're offering £15 per hour for this gig, correct?"
   - User: "London Bridge" → AI: "So the gig is located at London Bridge, right?"
   - User: {"lat": 51.5, "lng": -0.1, "formatted_address": "London Bridge, London"} → AI: "So the gig is located at London Bridge, London, right?"

5. **Data Extraction Format (JSON string):**
   {
     "jobType": "bartender",
     "eventType": "wedding",
     "rate": "£15",
     "location": "London Bridge",
     "skills": ["cocktail making", "customer service"]
   }

6. **Job Title Extraction (for gigDescription field only):**
   - If this is the gigDescription field, also extract a standardized job title
   - Include job title confidence level (0-100)
   - Include matched terms that led to the job title identification

IMPORTANT: Always provide a naturalSummary that asks for user confirmation in a conversational way. The user should feel like you're understanding and confirming their input, not just processing it.

For location fields, if the input is a JSON object with coordinates and formatted_address, use the formatted_address in your naturalSummary. Never show [object Object] or raw coordinates to the user.

If validation passes, respond with:
- isAppropriate: true
- isGigRelated: true
- isSufficient: true
- clarificationPrompt: ""
- sanitizedValue: string (cleaned version)
- naturalSummary: string (natural confirmation question)
- extractedData: string (JSON string of extracted data)

If validation fails, respond with:
- isAppropriate: boolean
- isGigRelated: boolean
- isSufficient: boolean
- clarificationPrompt: string (friendly guidance)
- sanitizedValue: string
- naturalSummary: string
- extractedData: string

GIG CREATION CONTEXT: Remember, this user is creating a job posting to hire someone. They are the employer/buyer. Keep responses focused on gig creation only.`;

      const result = await geminiAIAgent(
        "gemini-2.0-flash",
        {
          prompt,
          responseSchema: validationSchema,
          isStream: false,
        },
        ai
      );

      if (result.ok && result.data) {
        const validation = result.data as AIValidationResponse;
        console.log('AI validation result:', { field, value, validation });
        
        if (!validation.isAppropriate || !validation.isGigRelated || !validation.isSufficient) {
          return {
            sufficient: false,
            clarificationPrompt: validation.clarificationPrompt || 'Please provide appropriate gig-related information.',
          };
        }
        
        // For coordinate objects, preserve the original object
        if (value && typeof value === 'object' && 'lat' in value && 'lng' in value) {
          return {
            sufficient: true,
            sanitized: value,
            naturalSummary: validation.naturalSummary,
            extractedData: validation.extractedData
          };
        }
        
        // Special handling for hourlyRate to ensure clean numeric values
        let sanitizedValue: any = validation.sanitizedValue || trimmedValue;
        if (field === 'hourlyRate' && sanitizedValue) {
          console.log('Hourly rate cleaning - before:', { field, originalValue: value, sanitizedValue, validation });
          
          // Extract numeric value from currency strings - more aggressive cleaning
          const numericMatch = String(sanitizedValue).match(/[\d.]+/);
          if (numericMatch) {
            const cleanedNumber = parseFloat(numericMatch[0]);
            sanitizedValue = cleanedNumber;
            console.log('Hourly rate cleaned:', { original: validation.sanitizedValue, cleaned: sanitizedValue, numericMatch: numericMatch[0] });
          } else {
            // Fallback: try to extract any number from the original value
            const fallbackMatch = String(value).match(/[\d.]+/);
            if (fallbackMatch) {
              sanitizedValue = parseFloat(fallbackMatch[0]);
              console.log('Hourly rate fallback cleaned:', { original: value, cleaned: sanitizedValue, fallbackMatch: fallbackMatch[0] });
            }
          }
        }
        
        console.log('Final sanitized value for', field, ':', sanitizedValue);
        
        return {
          sufficient: true,
          sanitized: sanitizedValue,
          naturalSummary: validation.naturalSummary,
          extractedData: validation.extractedData
        };
      }
    } catch (error) {
      console.error('AI validation failed:', error);
    }
    
    // Simple fallback - accept most inputs
    let finalSanitized: any = trimmedValue;
    
    // Always clean hourly rate values, even in fallback
    if (field === 'hourlyRate' && finalSanitized) {
      console.log('Hourly rate fallback cleaning:', { field, originalValue: value, finalSanitized });
      const numericMatch = String(finalSanitized).match(/[\d.]+/);
      if (numericMatch) {
        finalSanitized = parseFloat(numericMatch[0]);
        console.log('Hourly rate fallback cleaned:', { original: finalSanitized, cleaned: finalSanitized, numericMatch: numericMatch[0] });
      }
    }
    
    return { sufficient: true, sanitized: finalSanitized };
  }, [formData, ai]);

// Update handleInputSubmit to use AI validation
async function handleInputSubmit(stepId: number, inputName: string, inputValue?: string) {
  const valueToUse = inputValue || formData[inputName];
  if (!valueToUse) return;
  
  // Find the current step to get its type
  const currentStep = chatSteps.find(s => s.id === stepId);
  const inputType = currentStep?.inputConfig?.type || 'text';
  
  try {
    // Check if this is an unrelated response
    const currentStepIndex = chatSteps.findIndex(s => s.id === stepId);
    const previousBotMessage = chatSteps
      .slice(0, currentStepIndex)
      .reverse()
      .find(s => s.type === 'bot' && s.content);
    
    if (previousBotMessage && previousBotMessage.content) {
      console.log('Checking unrelated response:', { userInput: valueToUse, botQuestion: previousBotMessage.content });
      const isUnrelated = isUnrelatedResponse(valueToUse, previousBotMessage.content);
      
      if (isUnrelated) {
        console.log('Unrelated response detected!', { userInput: valueToUse, botQuestion: previousBotMessage.content });
        const newCount = unrelatedResponseCount + 1;
        setUnrelatedResponseCount(newCount);
        console.log('Unrelated response count:', newCount);
        
        if (newCount >= 3) {
          // Escalate to human support after 3 unrelated responses
          const caseId = await saveSupportCaseToFirebase(
            { userId: user?.uid, formData },
            chatSteps,
            'Multiple unrelated responses - user struggling with gig creation'
          );
          setSupportCaseId(caseId);
          setShowHumanSupport(true);
          
          setChatSteps(prev => [
            ...prev,
            {
              id: Date.now() + 1,
              type: 'bot',
              content: `I understand you're having trouble with the gig creation process. I've created a support case (${caseId}) and our team will be in touch shortly.`,
              isNew: true,
            }
          ]);
          
          return;
        } else {
          // Add a gentle reminder about staying on topic
          setChatSteps(prev => [
            ...prev,
            {
              id: Date.now() + 1,
              type: 'bot',
              content: `I notice your response might not be related to the current question. Please try to answer the specific question I asked about your gig. If you need help, you can ask me to clarify. (Unrelated response ${newCount}/3)`,
              isNew: true,
            }
          ]);
          
          return;
        }
      }
    }
    
    // Add typing indicator for AI processing
    setChatSteps((prev) => [
      ...prev,
      {
        id: Date.now() + 1,
        type: "typing",
        isNew: true,
      },
    ]);
    
    // Use AI validation
    console.log('Calling AI validation with:', { inputName, valueToUse, inputType, fieldType: typeof valueToUse });
    const aiResult = await simpleAICheck(inputName, valueToUse, inputType);
    console.log('AI validation result:', { inputName, aiResult });
    
    // Remove typing indicator and mark current step as complete
    setChatSteps((prev) => {
      const filtered = prev.filter(s => s.type !== 'typing');
      return filtered.map((step) =>
        step.id === stepId ? { ...step, isComplete: true } : step
      );
    });
    
    if (!aiResult.sufficient) {
      // Add clarification message and re-open the same input step
      setChatSteps((prev) => {
        const reopenedType: "input" | "calendar" | "location" =
          currentStep?.type === 'location' ? 'location' :
          currentStep?.type === 'calendar' ? 'calendar' :
          'input';
        const reopenedInputConfig = currentStep?.inputConfig ?? {
          type: 'text',
          name: inputName,
          placeholder: '',
        };
        const nextSteps: ChatStep[] = [
          ...prev,
          { 
            id: Date.now() + 2, 
            type: 'bot', 
            content: aiResult.clarificationPrompt!,
            isNew: true,
          },
          {
            id: Date.now() + 3,
            type: reopenedType,
            inputConfig: reopenedInputConfig,
            isComplete: false,
            isNew: true,
          },
        ];
        return nextSteps;
      });
      return;
    }
    
    // If this is the gigDescription field, extract job title first
    if (inputName === 'gigDescription' && aiResult.sanitized) {
      try {
        const jobTitleResult = await interpretGigJobTitle(aiResult.sanitized, ai);
        if (jobTitleResult && jobTitleResult.confidence >= 50) {
          // Update formData with the validated value
          setFormData(prev => ({ ...prev, [inputName]: aiResult.sanitized }));
          
          // Show job title confirmation step directly (following worker onboarding-ai pattern)
          setChatSteps(prev => [
            ...prev,
            { 
              id: Date.now() + 4, 
              type: "jobTitleConfirmation",
              fieldName: inputName,
              originalValue: valueToUse,
              suggestedJobTitle: jobTitleResult.jobTitle,
              confidence: jobTitleResult.confidence,
              matchedTerms: jobTitleResult.matchedTerms,
              isNew: true,
            }
          ]);
          return; // Exit early, don't show sanitized confirmation
        }
      } catch (error) {
        console.error('Job title extraction failed:', error);
        // Continue without job title - not critical
      }
    }
    
    // Show sanitized confirmation step (only if no job title confirmation needed)
    setChatSteps((prev) => [
      ...prev,
      { 
        id: Date.now() + 3, 
        type: "sanitized",
        fieldName: inputName,
        sanitizedValue: aiResult.sanitized!,
        originalValue: valueToUse,
        naturalSummary: aiResult.naturalSummary,
        extractedData: aiResult.extractedData,
        isNew: true,
      },
    ]);
    
    // Update formData with the validated value
    setFormData(prev => ({ ...prev, [inputName]: aiResult.sanitized }));
  } catch (error) {
    console.error('AI validation error:', error);
    // Fallback to basic validation
    setChatSteps((prev) => {
      const filtered = prev.filter(s => s.type !== 'typing');
      return [
        ...filtered,
        { 
          id: Date.now() + 2, 
          type: 'bot', 
          content: 'I\'m having trouble processing that. Please try again with a clear description of your gig needs.',
          isNew: true
        }
      ];
    });
  }
}

// Handle sanitized confirmation
const handleSanitizedConfirm = useCallback(async (fieldName: string, sanitized: string | unknown) => {
  try {
    // Track clicked button
    setClickedSanitizedButtons(prev => new Set([...prev, `${fieldName}-confirm`]));
    
    // Update formData first
    const updatedFormData = { ...formData, [fieldName]: sanitized };
    setFormData(updatedFormData);
    
    // Mark sanitized step as complete
    setChatSteps((prev) => prev.map((step) =>
      step.type === "sanitized" && step.fieldName === fieldName ? { ...step, isComplete: true } : step
    ));
    
    // Find next required field using updated formData
    const nextField = getNextRequiredField(updatedFormData);
    
    if (nextField) {
      // Add next field prompt and input
      const newInputConfig = {
        type: nextField.type as FormInputType,
        name: nextField.name,
        placeholder: nextField.placeholder || nextField.defaultPrompt,
        ...(nextField.rows && { rows: nextField.rows }),
      };
      
      // Generate context-aware prompt for next field
      const gigDescription = updatedFormData.gigDescription || '';
      const contextAwarePrompt = await generateContextAwarePrompt(nextField.name, gigDescription, ai);
      
      // Determine the step type based on the field
      let stepType: "input" | "calendar" | "location" = "input";
      if (nextField.name === "gigDate") {
        stepType = "calendar";
      } else if (nextField.name === "gigLocation") {
        stepType = "location";
      }
      
      setChatSteps((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          type: "bot",
          content: contextAwarePrompt,
          isNew: true,
        },
        {
          id: Date.now() + 3,
          type: stepType,
          inputConfig: newInputConfig,
          isComplete: false,
          isNew: true,
        },
      ]);
    } else {
      // All fields completed, show summary
      setChatSteps((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          type: "summary",
          summaryData: updatedFormData,
          isNew: true,
        },
      ]);
    }
  } catch (error) {
    console.error('Error in sanitized confirmation:', error);
    setError('Failed to process confirmation. Please try again.');
  }
}, [formData, getNextRequiredField, ai]);

const handleSanitizedReformulate = (fieldName: string) => {
  if (isReformulating) return;
  setReformulateField(fieldName);
  setClickedSanitizedButtons(prev => new Set([...prev, `${fieldName}-reformulate`]));
};

// Handle job title confirmation (following worker onboarding-ai pattern)
const handleJobTitleConfirm = useCallback(async (fieldName: string, suggestedJobTitle: string, originalValue: string) => {
  try {
    // Update formData with the standardized job title
    const updatedFormData = { ...formData, [fieldName]: suggestedJobTitle };
    setFormData(updatedFormData);
    
    // Also store the job title information
    setFormData(prev => ({
      ...prev,
      jobTitle: suggestedJobTitle,
      jobTitleConfidence: 95, // Default confidence for confirmed job titles
      matchedTerms: ['confirmed by user']
    }));
    
    // Mark job title confirmation step as complete (like sanitization)
    setChatSteps((prev) => prev.map((step) =>
      step.type === "jobTitleConfirmation" && step.fieldName === fieldName ? { ...step, isComplete: true } : step
    ));
    
    // Find next required field using updated formData
    const nextField = getNextRequiredField(updatedFormData);
    
    if (nextField) {
      // Continue with next field
      const contextAwarePrompt = await generateContextAwarePrompt(nextField.name, updatedFormData.gigDescription || '', ai);
      const newInputConfig = {
        type: nextField.type as FormInputType,
        name: nextField.name,
        placeholder: nextField.placeholder || nextField.defaultPrompt,
        ...(nextField.rows && { rows: nextField.rows }),
      };
      
      // Determine the step type based on the field
      let stepType: "input" | "calendar" | "location" = "input";
      if (nextField.name === "gigDate") {
        stepType = "calendar";
      } else if (nextField.name === "gigLocation") {
        stepType = "location";
      }
      
      setChatSteps((prev) => [
        ...prev,
        {
          id: Date.now() + 6,
          type: "bot",
          content: contextAwarePrompt,
          isNew: true,
        },
        {
          id: Date.now() + 7,
          type: stepType,
          inputConfig: newInputConfig,
          isComplete: false,
          isNew: true,
        },
      ]);
    } else {
      // All fields collected, show final confirmation button
      setChatSteps((prev) => [
        ...prev,
        {
          id: Date.now() + 5,
          type: "summary",
          summaryData: updatedFormData,
          isNew: true,
        },
      ]);
    }
  } catch (error) {
    console.error("Error confirming job title:", error);
    setError('Failed to confirm job title. Please try again.');
  }
}, [formData, getNextRequiredField, ai]);

// Handle job title rejection (following worker onboarding-ai pattern)
const handleJobTitleReject = useCallback(async (fieldName: string, originalValue: string) => {
  try {
    // Keep the original value
    const updatedFormData = { ...formData, [fieldName]: originalValue };
    setFormData(updatedFormData);
    
    // Mark job title confirmation step as complete (like sanitization)
    setChatSteps((prev) => prev.map((step) =>
      step.type === "jobTitleConfirmation" && step.fieldName === fieldName ? { ...step, isComplete: true } : step
    ));
    
    // Find next required field using updated formData
    const nextField = getNextRequiredField(updatedFormData);
    
    if (nextField) {
      // Continue with next field
      const contextAwarePrompt = await generateContextAwarePrompt(nextField.name, updatedFormData.gigDescription || '', ai);
      const newInputConfig = {
        type: nextField.type as FormInputType,
        name: nextField.name,
        placeholder: nextField.placeholder || nextField.defaultPrompt,
        ...(nextField.rows && { rows: nextField.rows }),
      };
      
      // Determine the step type based on the field
      let stepType: "input" | "calendar" | "location" = "input";
      if (nextField.name === "gigDate") {
        stepType = "calendar";
      } else if (nextField.name === "gigLocation") {
        stepType = "location";
      }
      
      setChatSteps((prev) => [
        ...prev,
        {
          id: Date.now() + 6,
          type: "bot",
          content: contextAwarePrompt,
          isNew: true,
        },
        {
          id: Date.now() + 7,
          type: stepType,
          inputConfig: newInputConfig,
          isComplete: false,
          isNew: true,
        },
      ]);
    } else {
      // All fields collected, show final confirmation button
      setChatSteps((prev) => [
        ...prev,
        {
          id: Date.now() + 5,
          type: "summary",
          summaryData: updatedFormData,
          isNew: true,
        },
      ]);
    }
  } catch (error) {
    console.error("Error rejecting job title:", error);
    setError('Failed to reject job title. Please try again.');
  }
}, [formData, getNextRequiredField, ai]);

const handleInputChange = (name: string, value: any) => {
  setFormData((prev) => ({ ...prev, [name]: value }));
};

const handleFinalSubmit = async () => {
  if (!user) return;
  setIsSubmitting(true);

  try {
    // Validate time format before sending
    let validatedTime = formData.gigTime;
    if (formData.gigTime && typeof formData.gigTime === 'string') {
      console.log('Time validation - checking:', formData.gigTime);
      
      // Accept flexible time formats: "9:00-17:00", "9am to 5pm", "09:00 to 17:00"
      const timeStr = formData.gigTime.trim();
      
      // Check if it contains numbers and a separator (dash or "to")
      if (timeStr.match(/\d/) && (timeStr.includes('-') || timeStr.includes(' to '))) {
        console.log('Time validation - passed:', timeStr);
        validatedTime = timeStr;
      } else {
        console.warn('Invalid time format detected:', timeStr);
        // Try to clean the time value or set to undefined
        validatedTime = undefined;
      }
    }

    const payload = {
      userId: user.uid,
      gigDescription: String(formData.gigDescription || "").trim(),
      additionalInstructions: formData.additionalInstructions ? String(formData.additionalInstructions) : undefined,
      hourlyRate: formData.hourlyRate ?? 0,
      gigLocation: formData.gigLocation,
      gigDate: String(formData.gigDate || "").slice(0, 10),
      gigTime: validatedTime ? String(validatedTime).trim() : undefined,
      selectedWorkerId: selectedWorker?.userId,
      jobTitle: formData.jobTitle, // Include standardized job title
      jobTitleConfidence: formData.jobTitleConfidence, // Include confidence level
      matchedTerms: formData.matchedTerms, // Include matched terms
    };

    const result = await createGig(payload);

    if (result.status === 200 && result.gigId) {
      const successMessage = selectedWorker 
        ? `Thanks! Your gig has been created and ${selectedWorker.user.fullName} has been notified. They will review and accept your offer.`
        : "Thanks! Your gig has been created and will be visible to workers in your area.";
      
      const successMessageStep: ChatStep = {
        id: Date.now() + 1,
        type: "bot",
        content: successMessage,
      };
      setChatSteps((prev) => [...prev, successMessageStep]);
      
      // Find matching workers for the gig
      await findMatchingWorkers(formData);
      
      setTimeout(() => {
        router.push(`/user/${user.uid}/buyer`);
      }, 700);
    } else {
      const errorMessage = result.error || "Failed to create gig. Please try again.";
      const errorStep: ChatStep = {
        id: Date.now() + 2,
        type: "bot",
        content: errorMessage,
      };
      setChatSteps((prev) => [...prev, errorStep]);
    }
  } catch (e: any) {
    const errorStep: ChatStep = {
      id: Date.now() + 3,
      type: "bot",
      content: e?.message || "Unexpected error creating gig.",
    };
    setChatSteps((prev) => [...prev, errorStep]);
  } finally {
    setIsSubmitting(false);
  }
};

// Initialize chat with first field
useEffect(() => {
  if (chatSteps.length === 0) {
    const firstField = requiredFields[0];
    setChatSteps([
      {
        id: 1,
        type: "bot",
        content: firstField.defaultPrompt,
      },
      {
        id: 2,
        type: "input",
        inputConfig: {
          type: firstField.type as FormInputType,
          name: firstField.name,
          placeholder: firstField.placeholder,
          ...(firstField.rows && { rows: firstField.rows }),
        },
        isComplete: false,
      },
    ]);
  }
}, []);

// Helper: find matching workers for the gig
const findMatchingWorkers = async (gigData: FormData) => {
  if (!gigData.gigLocation || !gigData.gigDate) {
    console.warn('Missing location or date for worker matching');
    return;
  }

  setIsLoadingWorkers(true);
  try {
    // Call the worker matching API
    const response = await fetch('/api/gigs/find-matching-workers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gigLocation: gigData.gigLocation,
        gigDate: gigData.gigDate,
        gigTime: gigData.gigTime,
        maxDistance: 30, // 30km radius
        limit: 3, // Show top 3 workers
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.workers.length > 0) {
        setMatchingWorkers(data.workers);
        
        // Add worker matching step to chat
        setChatSteps(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            type: 'bot',
            content: '🎯 Great! Your gig has been created. Now let me find some workers who match your requirements...',
            isNew: true,
          },
          {
            id: Date.now() + 2,
            type: 'workerMatching',
            workers: data.workers,
            isNew: true,
          }
        ]);
      } else {
        console.log('No matching workers found');
        // Show message that no workers were found
        setChatSteps(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            type: 'bot',
            content: 'Great! Your gig has been created. We\'re currently searching for workers in your area. You\'ll be notified when workers are available.',
            isNew: true,
          }
        ]);
      }
    } else {
      console.error('Failed to find matching workers');
    }
  } catch (error) {
    console.error('Error finding matching workers:', error);
  } finally {
    setIsLoadingWorkers(false);
  }
};

// Handle chat with worker
const handleChatWithWorker = (workerId: string) => {
  // Navigate to chat with the worker
  router.push(`/user/${user?.uid}/chat/${workerId}`);
};

if (!user) {
  return <Loader />;
}

return (
  <>
    <ChatBotLayout
      ref={chatContainerRef}
      onScroll={() => {}}
      onHomeClick={() => router.push(`/user/${user?.uid || "this_user"}/buyer`)}
      className={pageStyles.container}
      role="BUYER"
      showChatInput={true}
      onSendMessage={async (message) => {
        console.log('ChatInput received:', message);
        
        // Find current input step
        const currentInputStep = chatSteps.find(step => 
          (step.type === "input" || step.type === "calendar" || step.type === "location") && !step.isComplete
        );
        
        if (currentInputStep && currentInputStep.inputConfig) {
          const fieldName = currentInputStep.inputConfig.name;
          
          // Add user message to chat
          const userStep: ChatStep = {
            id: Date.now(),
            type: "user",
            content: message,
            isNew: true
          };
          
          setChatSteps(prev => [...prev, userStep]);
          
          // Update form data
          handleInputChange(fieldName, message);
          
          // Process the input
          await handleInputSubmit(currentInputStep.id, fieldName, message);
        }
      }}
    >
      {chatSteps.map((step, idx) => {
        const key = `step-${step.id}-${idx}`;
        
        // User message
        if (step.type === "user") {
          return (
            <MessageBubble
              key={key}
              text={step.content}
              senderType="user"
              role="BUYER"
              showAvatar={false}
            />
          );
        }
        
        // Sanitized confirmation step
        if (step.type === "sanitized" && step.fieldName) {
          const sanitizedValue = step.sanitizedValue;
          const originalValue = step.originalValue;
          let naturalSummary = step.naturalSummary;
          
          // For location fields, ensure we show the formatted address in the summary
          if (step.fieldName === 'gigLocation' && typeof sanitizedValue === 'object' && sanitizedValue.formatted_address) {
            if (!naturalSummary || naturalSummary.includes('[object Object]') || naturalSummary.includes('object Object')) {
              naturalSummary = `So the gig is located at ${sanitizedValue.formatted_address}, right?`;
            }
          }
          
          // Format the display value
          const displayValue = (() => {
            if (typeof sanitizedValue === 'string') {
              return sanitizedValue;
            }
            
            if (typeof sanitizedValue === 'object') {
              // For location objects, show the formatted address
              if (sanitizedValue && 'formatted_address' in sanitizedValue && typeof sanitizedValue.formatted_address === 'string') {
                return sanitizedValue.formatted_address;
              }
              
              // For date objects, format them cleanly
              if (sanitizedValue && 'getTime' in sanitizedValue) {
                try {
                  return (sanitizedValue as Date).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });
                } catch (error) {
                  console.warn('Could not format date object:', sanitizedValue);
                }
              }
              
              // For other objects, show JSON (fallback)
              return JSON.stringify(sanitizedValue);
            }
            
            return String(sanitizedValue || '');
          })();
          
          // Check button states
          const confirmClicked = clickedSanitizedButtons.has(`${step.fieldName}-confirm`);
          const reformulateClicked = clickedSanitizedButtons.has(`${step.fieldName}-reformulate`);
          const isReformulatingThisField = reformulateField === step.fieldName;
          const isCompleted = step.isComplete || confirmClicked || reformulateClicked;
          
          return (
            <MessageBubble
              key={key}
              text={
                <div>
                  <div style={{ marginBottom: 8, color: 'var(--secondary-color)', fontWeight: 600, fontSize: '14px' }}>
                    {naturalSummary || "Is this what you meant?"}
                  </div>
                  {typeof displayValue === 'string' ? (
                    <div style={{ marginBottom: 16, fontStyle: 'italic', color: '#e5e5e5', fontSize: '15px', lineHeight: '1.4' }}>{displayValue}</div>
                  ) : (
                    displayValue
                  )}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      style={{ 
                        background: isCompleted ? '#555' : 'var(--secondary-color)', 
                        color: isCompleted ? '#fff' : '#000', 
                        border: 'none', 
                        borderRadius: 8, 
                        padding: '8px 16px', 
                        fontWeight: 600, 
                        fontSize: '14px', 
                        cursor: isCompleted ? 'not-allowed' : 'pointer', 
                        transition: 'background-color 0.2s',
                        opacity: isCompleted ? 0.7 : 1
                      }}
                      onClick={isCompleted ? undefined : () => handleSanitizedConfirm(step.fieldName!, step.sanitizedValue!)}
                      disabled={isCompleted}
                    >
                      {confirmClicked ? 'Confirmed' : 'Confirm'}
                    </button>
                    <button
                      style={{ 
                        background: isCompleted ? '#555' : 'transparent', 
                        color: isCompleted ? '#999' : 'var(--secondary-color)', 
                        border: '1px solid var(--secondary-color)', 
                        borderRadius: 8, 
                        padding: '8px 16px', 
                        fontWeight: 600, 
                        fontSize: '14px', 
                        cursor: isCompleted ? 'not-allowed' : 'pointer', 
                        transition: 'all 0.2s',
                        opacity: isCompleted ? 0.7 : 1
                      }}
                      onClick={isCompleted ? undefined : () => handleSanitizedReformulate(step.fieldName!)}
                      disabled={isCompleted}
                    >
                      {reformulateClicked ? 'Reformulated' : (isReformulatingThisField ? 'Reformulating...' : 'Reformulate')}
                    </button>
                  </div>
                </div>
              }
              senderType="bot"
              role="BUYER"
              showAvatar={true}
            />
          );
        }
        
        // Job title confirmation step
        if (step.type === "jobTitleConfirmation") {
          return (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* AI Avatar */}
              <div style={{ 
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <div style={{ flexShrink: 0, marginTop: '0.25rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, var(--primary-color), var(--primary-darker-color))',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                  }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: '#000000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <Image 
                        src="/images/ableai.png" 
                        alt="Able AI" 
                        width={24} 
                        height={24} 
                        style={{
                          borderRadius: '50%',
                          objectFit: 'cover'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Job Title Confirmation */}
              <div style={{
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '16px'
              }}>
                <div style={{
                  color: 'var(--primary-color)',
                  fontWeight: 600,
                  fontSize: '16px',
                  marginBottom: '12px'
                }}>
                  🎯 Suggested Standardized Job Title
                </div>
                <div style={{
                  color: '#e5e5e5',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  marginBottom: '16px'
                }}>
                  Based on your description "{step.originalValue}", I suggest the standardized job title:
                </div>
                <div style={{
                  background: '#2a2a2a',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #444',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    color: 'var(--primary-color)',
                    fontWeight: 600,
                    fontSize: '18px',
                    marginBottom: '8px'
                  }}>
                    {step.suggestedJobTitle}
                  </div>
                  <div style={{
                    color: '#888',
                    fontSize: '13px'
                  }}>
                    Matched: {step.matchedTerms?.join(', ')}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    onClick={() => handleJobTitleConfirm(step.fieldName!, step.suggestedJobTitle!, step.originalValue!)}
                    style={{
                      background: 'var(--primary-color)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'var(--primary-darker-color)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'var(--primary-color)';
                    }}
                  >
                    Use This Title
                  </button>
                  <button
                    onClick={() => handleJobTitleReject(step.fieldName!, step.originalValue!)}
                    style={{
                      background: '#444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#555';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#444';
                    }}
                  >
                    Keep Original
                  </button>
                </div>
              </div>
            </div>
          );
        }
        
        if (step.type === "bot") {
          return (
            <MessageBubble
              key={key}
              text={step.content as string}
              senderType="bot"
              role="BUYER"
            />
          );
        }
        
        if (step.type === "typing") {
          return <TypingIndicator key={key} />;
        }
        
        if (step.type === "input") {
          return null;
        }
        
        // Handle support step
        if (step.type === "support") {
          return (
            <MessageBubble
              key={key}
              text={
                <div>
                  <div style={{ marginBottom: 16, color: 'var(--secondary-color)', fontWeight: 600, fontSize: '16px' }}>
                    🆘 Human Support Requested
                  </div>
                  <div style={{ marginBottom: 16, color: '#e5e5e5', fontSize: '15px', lineHeight: '1.4' }}>
                    Support Case ID: {supportCaseId}<br/>
                    Our team will review your conversation and contact you shortly.
                  </div>
                  <div style={{ color: '#888', fontSize: '13px', fontStyle: 'italic' }}>
                    In the meantime, you can try refreshing the page or contact support directly.
                  </div>
                </div>
              }
              senderType="bot"
              role="BUYER"
              showAvatar={true}
            />
          );
        }
        
        // Handle summary step
        if (step.type === "summary" && step.summaryData) {
          return (
            <MessageBubble
              key={key}
              text={
                <div>
                  <div style={{ marginBottom: 16, color: 'var(--secondary-color)', fontWeight: 600, fontSize: '16px' }}>
                    🎯 Gig Summary
                  </div>
                  <div style={{ marginBottom: 16, color: '#e5e5e5', fontSize: '15px', lineHeight: '1.4' }}>
                    {step.summaryData.jobTitle && (
                      <div><strong>Job Title:</strong> {step.summaryData.jobTitle}</div>
                    )}
                    {step.summaryData.hourlyRate && (
                      <div><strong>Hourly Rate:</strong> £{(() => {
                        const rate = step.summaryData.hourlyRate;
                        console.log('Hourly rate debug:', { rate, type: typeof rate, stringValue: String(rate) });
                        // Remove any pound symbols and clean the value
                        return String(rate).replace(/[£$€¥]/g, '').trim();
                      })()}</div>
                    )}
                    {step.summaryData.gigLocation && (
                      <div><strong>Location:</strong> {
                        typeof step.summaryData.gigLocation === 'string' 
                          ? step.summaryData.gigLocation 
                          : (step.summaryData.gigLocation.formatted_address || `${step.summaryData.gigLocation.lat}, ${step.summaryData.gigLocation.lng}`)
                      }</div>
                    )}
                    {step.summaryData.gigDate && (
                      <div><strong>Date:</strong> {(() => {
                        const date = step.summaryData.gigDate;
                        console.log('Date debug:', { date, type: typeof date });
                        
                        // If it's a Date object, format it to show only the date
                        if (typeof date === 'object' && date !== null && 'getTime' in date) {
                          return (date as Date).toLocaleDateString('en-GB', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          });
                        }
                        
                        // If it's a string, try to parse it and format
                        if (typeof date === 'string') {
                          try {
                            const parsedDate = new Date(date);
                            if (!isNaN(parsedDate.getTime())) {
                              return parsedDate.toLocaleDateString('en-GB', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              });
                            }
                          } catch (error) {
                            console.warn('Could not parse date string:', date);
                          }
                        }
                        
                        // Fallback: show the original value
                        return String(date);
                      })()}</div>
                    )}
                    {step.summaryData.gigTime && (
                      <div><strong>Time:</strong> {(() => {
                        const time = step.summaryData.gigTime;
                        console.log('Time debug - full value:', { time, type: typeof time, stringValue: String(time) });
                        
                        // Accept both formats: "9:00-17:00" and "9am to 5pm"
                        if (typeof time === 'string' && time.trim()) {
                          const timeStr = time.trim();
                          
                          // Check if it's a time range with various formats
                          if (timeStr.includes('-') || timeStr.includes(' to ') || timeStr.includes('am') || timeStr.includes('pm')) {
                            // Accept flexible time range formats
                            // "9:00-17:00", "9am to 5pm", "09:00 to 17:00", etc.
                            if (timeStr.match(/\d/) && (timeStr.includes('-') || timeStr.includes(' to '))) {
                              console.log('Valid time range detected:', timeStr);
                              return timeStr; // Valid time range
                            }
                          }
                          
                          // If it's a single time, accept it
                          if (timeStr.match(/\d/)) {
                            return timeStr;
                          }
                        }
                        
                        // Fallback: show whatever we have
                        return String(time || 'Time not specified');
                      })()}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      style={{ 
                        background: 'var(--secondary-color)', 
                        color: '#000', 
                        border: 'none', 
                        borderRadius: 8, 
                        padding: '12px 24px', 
                        fontWeight: 600, 
                        fontSize: '16px', 
                        cursor: 'pointer', 
                        transition: 'background-color 0.2s'
                      }}
                      onClick={handleFinalSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Creating Gig...' : 'Create Gig'}
                    </button>
                  </div>
                </div>
              }
              senderType="bot"
              role="BUYER"
              showAvatar={true}
            />
          );
        }
        
        // Handle calendar picker step
        if (step.type === "calendar") {
          return (
            <div key={key} style={{ 
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <div key={`${key}-avatar`} style={{ 
                flexShrink: 0, 
                marginTop: '0.25rem' 
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, var(--secondary-color), var(--secondary-darker-color))',
                  boxShadow: '0 2px 8px rgba(126, 238, 249, 0.3)'
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <Image 
                      src="/images/ableai.png" 
                      alt="Able AI" 
                      width={24} 
                      height={24} 
                      style={{
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div key={`${key}-calendar`} style={{ flex: 1 }}>
                <CalendarPickerBubble
                  name={step.inputConfig?.name}
                  value={formData[step.inputConfig?.name || ''] ? new Date(formData[step.inputConfig?.name || '']) : null}
                  onChange={(date) => {
                    if (step.inputConfig?.name) {
                      handleInputChange(step.inputConfig.name, date);
                    }
                  }}
                  placeholderText={step.inputConfig?.placeholder || "Select a date"}
                  role="BUYER"
                />
                
                {/* Confirm button when date is selected */}
                {formData[step.inputConfig?.name || ''] && !confirmedSteps.has(step.id) && (
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      style={{
                        background: isConfirming ? '#555' : 'var(--secondary-color)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: isConfirming ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.2s',
                        opacity: isConfirming ? 0.7 : 1
                      }}
                      onClick={() => {
                        if (step.inputConfig?.name && !isConfirming) {
                          handleInputSubmit(step.id, step.inputConfig.name, formData[step.inputConfig.name]);
                        }
                      }}
                      disabled={isConfirming}
                    >
                      {isConfirming ? 'Confirming...' : 'Confirm Date'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        }
        
        // Handle location picker step
        if (step.type === "location") {
          return (
            <div key={key} style={{ 
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <div key={`${key}-avatar`} style={{ 
                flexShrink: 0, 
                marginTop: '0.25rem' 
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, var(--secondary-color), var(--secondary-darker-color))',
                  boxShadow: '0 2px 8px rgba(126, 238, 249, 0.3)'
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <Image 
                      src="/images/ableai.png" 
                      alt="Able AI" 
                      width={24} 
                      height={24} 
                      style={{
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div key={`${key}-location`} style={{ flex: 1 }}>
                <LocationPickerBubble
                  value={formData[step.inputConfig?.name || '']}
                  onChange={(value) => {
                    if (step.inputConfig?.name) {
                      handleInputChange(step.inputConfig.name, value);
                    }
                  }}
                  role="BUYER"
                />
                
                {/* Confirm button when location is selected */}
                {formData[step.inputConfig?.name || ''] && !confirmedSteps.has(step.id) && (
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      style={{
                        background: isConfirming ? '#555' : 'var(--secondary-color)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: isConfirming ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.2s',
                        opacity: isConfirming ? 0.7 : 1
                      }}
                      onClick={() => {
                        if (step.inputConfig?.name && !isConfirming) {
                          handleInputSubmit(step.id, step.inputConfig.name, formData[step.inputConfig.name]);
                        }
                      }}
                      disabled={isConfirming}
                    >
                      {isConfirming ? 'Confirming...' : 'Confirm Location'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        }
        
        // Handle worker matching step
        if (step.type === "workerMatching" && step.workers) {
          return (
            <MessageBubble
              key={key}
              text={
                <div>
                  <div style={{ marginBottom: 16, color: 'var(--secondary-color)', fontWeight: 600, fontSize: '16px' }}>
                    🎯 Matching Workers Found
                  </div>
                  <div style={{ marginBottom: 16, color: '#e5e5e5', fontSize: '15px', lineHeight: '1.4' }}>
                    We found {step.workers.length} workers who match your gig requirements. You can chat with them to discuss details and hire the best fit.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {step.workers.map((worker, index) => (
                      <WorkerCard 
                        key={worker.userId} 
                        worker={worker} 
                        onChat={handleChatWithWorker}
                      />
                    ))}
                  </div>
                </div>
              }
              senderType="bot"
              role="BUYER"
              showAvatar={true}
            />
          );
        }
        
        return null;
      })}
      <div ref={endOfChatRef} />
      {isSubmitting && (
        <MessageBubble
          key="submitting-msg"
          text="Processing..."
          senderType="bot"
          role="BUYER"
        />
      )}
    </ChatBotLayout>
  </>
);
}
