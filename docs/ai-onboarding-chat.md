# AI Conversational Onboarding Integration Plan

## Overview
The onboarding process will use an AI model (e.g., Gemini) to guide gig workers users through onboarding in a conversational, chat-like manner, collecting structured data at each step.

## Data Inputs
- Onboarding step context (e.g., current step, previous answers)
- User responses

## AI Model Usage
- **Model:** Gemini (e.g., gemini-2.0-flash)
- **Integration:**
  - Use the Firebase AI SDK as in other features.
  - For each step, send a prompt with the current context and user input.

## Prompt Example (per step)
```
You are an onboarding assistant. For the following step, ask the user for the required information in a friendly, conversational tone. When the user responds, extract the relevant data and return it as JSON. After each step, ask the user to confirm the extracted data.

Step: {step}
Previous Answers: {previousAnswers}
User Input: {userInput}
```

## Response Format
```json
{
  "field": "mainSkill",
  "value": "Bartending",
  "confirmationPrompt": "You said your main skill is Bartending. Is this correct? (yes/no)"
}
```

## Confirmation Flow
- After each step, show the extracted data and ask the user to confirm or edit.
- Only proceed when the user confirms.

## Future Extensibility
- Add support for file uploads, calendar pickers, etc.
- Multi-step summary and final confirmation
- Multi-language support 

## Refined Conversational Flow for Worker Onboarding

- The onboarding chat collects data step-by-step from an initially empty user profile.
- For each step, the AI should:
  1. **Vary the question** based on previous answers (context-aware prompts).
  2. **Extract the answer** from the user's response, or ask for clarification if the answer is unclear.
  3. **Confirm the extracted value** with the user, e.g.:
     > For [field], you answered: "[extracted answer]". Please confirm I got it right (yes/no).
  4. **If the answer is unclear**, ask for clarification up to 3 times. If still unclear, offer to save the answer as-is and inform the user they can update it later in their profile.
  5. **Ask the user if the step is finished** and if they want to continue to the next one.

## Example Step-by-Step AI Prompt

```
You are an onboarding assistant for gig workers. For each step, ask the user for the required information in a friendly, conversational tone, using previous answers as context. When the user responds, try to extract the relevant data. If the answer is unclear, ask for clarification (up to 3 times). After extracting the answer, confirm with the user: "For [field], you answered: '[extracted answer]'. Please confirm I got it right (yes/no)." If the user confirms, ask if the step is finished and if you can continue. If not, repeat clarification or offer to save as-is and inform the user they can update it later.
```

## Example Step Response Schema
```json
{
  "field": "bio",
  "value": "I have been a bartender for three years, and I love creating new cocktails and meeting new people.",
  "confirmationPrompt": "For your work experience, you answered: 'I have been a bartender for three years, and I love creating new cocktails and meeting new people.' Please confirm I got it right (yes/no).",
  "clarificationCount": 1,
  "isConfirmed": false,
  "canContinue": false
}
```
- `clarificationCount`: Number of clarification attempts so far.
- `isConfirmed`: Whether the user has confirmed the extracted value.
- `canContinue`: Whether the user is ready to move to the next step.

## Example Final Submission Schema
```json
{
  "bio": "...",
  "specialSkills": "...",
  "desiredHourlyRate": 15,
  "location": "...",
  "travelRadius": "30 miles",
  "availability": ["2024-07-01", "2024-07-02"],
  "stripeConnected": true,
  "introVideoUrl": "https://...",
  "references": [
    { "name": "Manager A", "contact": "manager@example.com" },
    { "name": "Colleague B", "contact": "colleague@example.com" }
  ],
  "shareLink": "https://...",
  "agreedToTerms": true
}
```

## Gemini Library Integration Example

```ts
import { getAI, getGenerativeModel, Schema } from "@firebase/ai";

const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });

const onboardingStepSchema = Schema.object({
  field: Schema.string(),
  value: Schema.string(),
  confirmationPrompt: Schema.string(),
  clarificationCount: Schema.optional(Schema.number()),
  isConfirmed: Schema.optional(Schema.boolean()),
  canContinue: Schema.optional(Schema.boolean()),
});

const onboardingSummarySchema = Schema.object({
  bio: Schema.string(),
  specialSkills: Schema.string(),
  desiredHourlyRate: Schema.number(),
  location: Schema.string(),
  travelRadius: Schema.string(),
  availability: Schema.array(Schema.string()),
  stripeConnected: Schema.boolean(),
  introVideoUrl: Schema.string(),
  references: Schema.array(
    Schema.object({
      name: Schema.string(),
      contact: Schema.string(),
    })
  ),
  shareLink: Schema.string(),
  agreedToTerms: Schema.boolean(),
});

const model = getGenerativeModel(ai, {
  model: "gemini-2.5-flash-preview-05-20",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: onboardingStepSchema,
  },
});
```

## Quick Test Prompt for Chat UI
```
SYSTEM: You are an onboarding assistant for gig workers. For each step, extract the relevant field, value, and confirmationPrompt as JSON. If the answer is unclear, ask for clarification up to 3 times, then offer to save as-is. At the end, return a summary object with all fields.
USER: {step, previousAnswers, userInput here}
```

## Future Extensibility
- Add support for file uploads (e.g., certifications, ID).
- Multi-step summary and final confirmation.
- Multi-language support.
- Integrate with background check or verification APIs.
- Allow user to skip/revisit steps.

## Integration Plan for `app/user/[userId]/worker/onboarding/page.tsx`
1. **Export the AI Instance**
   - In `app/lib/firebase/clientApp.ts`, export the `ai` instance.

2. **Create the Agent File**
   - In `app/lib/agents/`, create `workerOnboardingAgent.ts`.

3. **Implement the Agent Function**
   - Import `ai`, define the model and schema as above, and export a function (e.g., `generateOnboardingStep` and `generateOnboardingSummary`).

4. **Use the Agent in the Page**
   - In `app/user/[userId]/worker/onboarding/page.tsx`, import and use the agent function:
     ```ts
     import { generateOnboardingStep } from "@/app/lib/agents/workerOnboardingAgent";
     // ...
     const aiResponse = await generateOnboardingStep(prompt);
     // Use aiResponse to update chat state
     ```

5. **Extend as Needed**
   - Add support for more fields, richer feedback, or multi-turn conversations as your onboarding evolves.

---

## Admin Moderation

Admins will have the ability to view conversations associated with the worker onboarding chat flow via an admin panel. They can review message content and the data extracted by the AI. This helps monitor the AI's effectiveness in collecting accurate information and identify potential issues or areas for improvement in the onboarding process.

## PII Handling

The onboarding process inherently collects significant PII (name, contact, skills, qualifications, etc.). 

- Implement strict PII handling protocols throughout the onboarding chat flow, from frontend input to backend processing and AI prompting.
- Sensitive PII should be tokenized or redacted before being sent to the AI if the AI does not require the raw data.
- The chat logs stored in Firestore will contain this PII. The scheduled PII removal utility (detailed in [AI Chat Model and Backend Logic Plan](ai-models-plan.md)) is critical for managing this data according to privacy policies and retention periods.

## Data Deletion and Retention

Chat messages from the worker onboarding flow will be stored in Firestore under the `/users/{userId}/aiChats` collection with `contextType: 'onboarding'`. These messages, including the extracted data points if stored within the chat documents, will be subject to the general chat retention policy defined in the `system_flags` table and enforced by the scheduled data retention utility. 