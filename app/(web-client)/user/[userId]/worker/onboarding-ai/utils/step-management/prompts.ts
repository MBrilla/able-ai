export const PROMPTS = {
  videoScript: (formData: any) => `Create a personalized video introduction script for a worker profile. Use the following information to create an engaging, professional script that highlights their strengths and personality:

PROFILE DATA:
- About: ${formData.about || 'Not provided'}
- Experience: ${formData.experience || 'Not provided'}
- Skills: ${formData.skills || 'Not provided'}
- Qualifications: ${formData.qualifications || 'Not provided'}
- Job Title: ${formData.jobTitle || 'Not provided'}

IMPORTANT: Focus on the skills field as the primary profession indicator. Do not use bio information for context as it may contain outdated or conflicting information. The skills field represents their current profession.

Create a script that:
1. Is conversational and natural
2. Highlights key strengths and experience
3. Shows personality and enthusiasm
4. Is appropriate for a professional video introduction
5. Is between 30-60 seconds when spoken
6. Uses the person's own words and style when possible
7. Focuses on their current skills/profession, not outdated bio information

Format as a natural speaking script with line breaks for pauses.`,

  intentAnalysis: (userInput: string, currentPrompt: string, recent: string) => `Analyze this user input in the context of an AI onboarding conversation:

USER INPUT: "${userInput}"
CURRENT PROMPT: "${currentPrompt}"
RECENT CONTEXT: ${recent}

Determine if the user is:
1. Asking for help or expressing frustration
2. Providing normal onboarding information
3. Trying to skip or avoid the process
4. Having technical issues

Respond with JSON containing:
- action: "help", "continue", "redirect", or "clarify"
- confidence: 0-1 confidence score
- reason: Brief explanation
- suggestedAction: What the system should do next`,

  contextAwarePrompt: (fieldName: string, aboutInfo: string) => `Generate a personalized prompt for collecting ${fieldName} information. The user has already provided this information: "${aboutInfo}"

IMPORTANT: You MUST maintain context and consistency. If you already know their profession (like "baker"), don't ask generic questions - ask specific questions about their field.

Create a prompt that:
1. References their existing information naturally and specifically
2. Asks for the specific field in a conversational way that builds on what you know
3. Provides helpful context about why this information is needed
4. Is encouraging and supportive
5. Is 1-2 sentences long
6. Shows you remember what they told you

Examples:
- If they said "I am a baker 25" and you're asking for skills, say "As a baker, what specific baking skills do you have?"
- If they said "I'm a construction worker" and you're asking for experience, say "How many years have you been working in construction?"

Make it feel natural, personalized, and contextually aware.`,
};


