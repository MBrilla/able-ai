/**
 * Incident Detection System
 * Detects keywords and phrases that indicate potential incidents requiring reporting
 */

export interface IncidentDetectionResult {
  isIncident: boolean;
  incidentType: IncidentType | null;
  confidence: number; // 0-1 scale
  detectedKeywords: string[];
  suggestedAction: string;
}

export type IncidentType = 
  | 'harassment'
  | 'unsafe_work_conditions'
  | 'discrimination'
  | 'threats'
  | 'inappropriate_behavior'
  | 'safety_concern'
  | 'other';

export interface IncidentKeywords {
  [key: string]: {
    keywords: string[];
    phrases: string[];
    incidentType: IncidentType;
    weight: number; // Higher weight = more serious
  };
}

// Define incident detection patterns
export const INCIDENT_PATTERNS: IncidentKeywords = {
  harassment: {
    keywords: [
      'harass', 'harassment', 'harassed', 'harassing',
      'unwanted', 'inappropriate', 'creepy', 'stalk',
      'stalking', 'uncomfortable', 'unwelcome', 'persistent',
      'repeated', 'pressure', 'coerce', 'coercion'
    ],
    phrases: [
      'making me uncomfortable', 'won\'t leave me alone',
      'keep asking me out', 'touching me', 'inappropriate comments',
      'sexual harassment', 'workplace harassment', 'verbal abuse',
      'intimidating me', 'threatening me'
    ],
    incidentType: 'harassment',
    weight: 0.9
  },
  unsafe_work_conditions: {
    keywords: [
      'unsafe', 'dangerous', 'hazard', 'hazardous', 'unsafe',
      'injury', 'injured', 'hurt', 'accident', 'fall',
      'slip', 'trip', 'cut', 'burn', 'exposed',
      'chemical', 'toxic', 'fumes', 'no ventilation',
      'no safety equipment', 'no training', 'overworked'
    ],
    phrases: [
      'unsafe working conditions', 'not safe to work',
      'dangerous environment', 'health hazard', 'safety violation',
      'no safety equipment', 'unsafe practices', 'workplace injury',
      'accident waiting to happen', 'unsafe workplace'
    ],
    incidentType: 'unsafe_work_conditions',
    weight: 0.8
  },
  discrimination: {
    keywords: [
      'discriminat', 'racist', 'sexist', 'ageist', 'homophobic',
      'transphobic', 'prejudice', 'bias', 'unfair treatment',
      'treated differently', 'because of my', 'not hired because',
      'fired because', 'paid less because'
    ],
    phrases: [
      'discriminated against', 'treated unfairly because',
      'not hired because of my', 'fired because of my',
      'paid less because of my', 'racist comments',
      'sexist remarks', 'age discrimination'
    ],
    incidentType: 'discrimination',
    weight: 0.85
  },
  threats: {
    keywords: [
      'threat', 'threaten', 'threatening', 'violence', 'violent',
      'hurt you', 'kill you', 'harm', 'revenge', 'retaliate',
      'retaliation', 'consequences', 'pay for this', 'get you',
      'destroy', 'ruin', 'blackmail', 'extort'
    ],
    phrases: [
      'threatening me', 'making threats', 'threat of violence',
      'threatened to hurt', 'threatened to fire', 'threatened to report',
      'intimidation tactics', 'scare tactics'
    ],
    incidentType: 'threats',
    weight: 0.95
  },
  inappropriate_behavior: {
    keywords: [
      'inappropriate', 'unprofessional', 'rude', 'disrespectful',
      'abusive', 'bully', 'bullying', 'mean', 'cruel',
      'insult', 'insulting', 'mock', 'mocking', 'belittle',
      'humiliate', 'embarrass', 'shame', 'degrade'
    ],
    phrases: [
      'inappropriate behavior', 'unprofessional conduct',
      'being bullied', 'treated badly', 'disrespectful treatment',
      'abusive language', 'verbal abuse', 'hostile environment'
    ],
    incidentType: 'inappropriate_behavior',
    weight: 0.7
  },
  safety_concern: {
    keywords: [
      'safety', 'concern', 'worried', 'scared', 'afraid',
      'fear', 'anxious', 'nervous', 'unsafe', 'risk',
      'danger', 'hazard', 'emergency', 'urgent', 'immediate'
    ],
    phrases: [
      'safety concern', 'worried about safety', 'scared for my safety',
      'safety issue', 'immediate safety concern', 'urgent safety matter'
    ],
    incidentType: 'safety_concern',
    weight: 0.75
  }
};

/**
 * Detects if user input contains incident-related keywords or phrases
 */
export function detectIncident(userInput: string): IncidentDetectionResult {
  const normalizedInput = userInput.toLowerCase().trim();
  
  let maxConfidence = 0;
  let detectedType: IncidentType | null = null;
  let detectedKeywords: string[] = [];
  let suggestedAction = '';

  // Check each incident pattern
  for (const [patternName, pattern] of Object.entries(INCIDENT_PATTERNS)) {
    let patternConfidence = 0;
    const foundKeywords: string[] = [];

    // Check keywords
    for (const keyword of pattern.keywords) {
      if (normalizedInput.includes(keyword.toLowerCase())) {
        patternConfidence += 0.3; // Each keyword adds 0.3 confidence
        foundKeywords.push(keyword);
      }
    }

    // Check phrases (higher weight)
    for (const phrase of pattern.phrases) {
      if (normalizedInput.includes(phrase.toLowerCase())) {
        patternConfidence += 0.5; // Each phrase adds 0.5 confidence
        foundKeywords.push(phrase);
      }
    }

    // Apply pattern weight
    patternConfidence *= pattern.weight;

    // Update max confidence if this pattern scored higher
    if (patternConfidence > maxConfidence) {
      maxConfidence = patternConfidence;
      detectedType = pattern.incidentType;
      detectedKeywords = foundKeywords;
      suggestedAction = getSuggestedAction(pattern.incidentType);
    }
  }

  // Consider it an incident if confidence is above threshold
  const isIncident = maxConfidence >= 0.4; // Threshold for incident detection

  return {
    isIncident,
    incidentType: isIncident ? detectedType : null,
    confidence: Math.min(maxConfidence, 1), // Cap at 1.0
    detectedKeywords,
    suggestedAction
  };
}

/**
 * Get suggested action based on incident type
 */
function getSuggestedAction(incidentType: IncidentType): string {
  switch (incidentType) {
    case 'harassment':
      return 'I understand you may be experiencing harassment. This is serious and I want to help you report this properly.';
    case 'unsafe_work_conditions':
      return 'I\'m concerned about the safety issues you\'ve mentioned. Let\'s document this properly for your protection.';
    case 'discrimination':
      return 'Discrimination is unacceptable. I want to help you report this incident with all the necessary details.';
    case 'threats':
      return 'Threats are very serious. I need to help you report this immediately for your safety.';
    case 'inappropriate_behavior':
      return 'I\'m sorry you\'re experiencing inappropriate behavior. Let\'s document this incident properly.';
    case 'safety_concern':
      return 'Your safety is our priority. Let\'s document this concern properly so we can address it.';
    default:
      return 'I want to help you report this incident properly. Let\'s gather the necessary information.';
  }
}

/**
 * Generate a unique incident ID
 */
export function generateIncidentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `INC-${timestamp}-${random}`.toUpperCase();
}

/**
 * Get incident severity level based on type and confidence
 */
export function getIncidentSeverity(incidentType: IncidentType, confidence: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  const baseSeverity = {
    'harassment': 3,
    'threats': 4,
    'discrimination': 3,
    'unsafe_work_conditions': 3,
    'inappropriate_behavior': 2,
    'safety_concern': 2,
    'other': 1
  };

  const severityScore = baseSeverity[incidentType] + (confidence * 2);
  
  if (severityScore >= 5) return 'CRITICAL';
  if (severityScore >= 4) return 'HIGH';
  if (severityScore >= 3) return 'MEDIUM';
  return 'LOW';
}
