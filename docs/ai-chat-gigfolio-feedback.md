# AI Chat Agent for Gigfolio Feedback

## Overview
The platform will use an AI chat agent (e.g., Gemini) to provide actionable feedback to workers based on their buyer reviews, helping them improve their profiles and performance.

## Data Inputs (for AI Agent)
Provide the following fields from the worker profile (do NOT include location or display name for privacy):
- profileHeadline (e.g., "Expert Mixologist & Event Bartender")
- statistics (array, e.g., "100% Would work with you again", "100% Response rate")
- skills (array of objects: name, ableGigs, experience, eph)
- awards (array, e.g., ["Always on time", "Able Professional"])
- qualifications (array)
- equipment (array)
- bio (optional, if available)

## Expected Output
- **feedbackSummary**: A short, positive, descriptive phrase (e.g., "Professional, charming and lively"). Should not mention the user's name and should be concise.
- **strengths** (optional): Array of up to 3 strengths or highlights.
- **improvementSuggestions** (optional): Array of up to 2 suggestions for improvement.

## Recommended Data Contract

### Input Example
```json
{
  "profileHeadline": "Expert Mixologist & Event Bartender",
  "statistics": [
    { "label": "Would work with you again", "value": "100%" },
    { "label": "Response rate", "value": "100%" }
  ],
  "skills": [
    { "name": "Bartender", "ableGigs": 15, "experience": "3 years", "eph": 15 },
    { "name": "Waiter", "ableGigs": 2, "experience": "8 years", "eph": 15 }
  ],
  "awards": [
    "Always on time",
    "Able Professional"
  ],
  "qualifications": [
    "Bachelor's Degree in Graphic Design",
    "Licensed bar manager"
  ],
  "equipment": [
    "Camera gear",
    "Laptop"
  ],
  "bio": "..." // if available
}
```

### Output Example
```json
{
  "feedbackSummary": "Professional, charming and lively",
  "strengths": [
    "Excellent punctuality",
    "Great communication",
    "Highly skilled in bartending"
  ],
  "improvementSuggestions": [
    "Consider adding more details to your bio",
    "Highlight recent awards or achievements"
  ]
}
```

## Prompt Example
```
Given the following worker profile data, generate a short, positive feedback summary (like 'Professional, charming and lively'). Do not mention the user's name. Optionally, list up to 3 strengths and up to 2 suggestions for improvement. Keep the summary concise and impersonal.
```

## Gemini Library Integration Example

To ensure the AI returns a structured feedback object, use a response schema:

```ts
import { getAI, getGenerativeModel, Schema } from "@firebase/ai";

const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });

const feedbackSchema = Schema.object({
  feedbackSummary: Schema.string(),
  strengths: Schema.optional(Schema.array(Schema.string())),
  improvementSuggestions: Schema.optional(Schema.array(Schema.string())),
});

const model = getGenerativeModel(ai, {
  model: "gemini-2.0-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: feedbackSchema,
  },
});

const prompt = `Given the following worker profile data, generate a short, positive feedback summary (like 'Professional, charming and lively'). Do not mention the user's name. Optionally, list up to 3 strengths and up to 2 suggestions for improvement. Keep the summary concise and impersonal.\n\nProfile Data: {profileData}`;

const result = await model.generateContent(prompt);
console.log(result.response.text());
```

### Quick Test Prompt for Chat UI
```
SYSTEM: You are a gigfolio feedback assistant. Given a worker's profile data (excluding name and location), return a JSON object with a short feedbackSummary, and optionally strengths and improvementSuggestions. Do not mention the user's name.
USER: {profile data here}
```

## Future Extensibility
- Incorporate more detailed gig history or recent reviews for richer, more contextual feedback.
- Support for multi-turn feedback conversations (e.g., user can ask for more details or clarification).
- Add feedback on specific skills or recent gigs.
- Personalize suggestions based on recent performance or new achievements.
- Support for multi-language feedback.
- Allow the worker to request feedback on specific areas (e.g., communication, punctuality).

## Integration Plan for `app/user/[userId]/worker/profile/page.tsx`

To integrate the AI feedback agent into the worker profile page, follow this plan:

1. **Export the AI Instance**
   - In `app/lib/firebase/clientApp.ts`, ensure you export the `ai` instance:
     ```ts
     export const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
     ```

2. **Create the Agent File**
   - In `app/lib/agents/`, create a file for the gigfolio feedback agent:
     - `app/lib/agents/gigfolioFeedbackAgent.ts`

3. **Implement the Agent Function**
   - In `gigfolioFeedbackAgent.ts`, import `ai` and define the model and schema as described above.
   - Export a function (e.g., `generateGigfolioFeedback`) that takes the profile data and returns the AI response.
   - Example:
     ```ts
     // app/lib/agents/gigfolioFeedbackAgent.ts
     import { ai } from "../firebase/clientApp";
     import { getGenerativeModel, Schema } from "@firebase/ai";

     const feedbackSchema = Schema.object({
       feedbackSummary: Schema.string(),
       strengths: Schema.optional(Schema.array(Schema.string())),
       improvementSuggestions: Schema.optional(Schema.array(Schema.string())),
     });

     const model = getGenerativeModel(ai, {
       model: "gemini-2.0-flash",
       generationConfig: {
         responseMimeType: "application/json",
         responseSchema: feedbackSchema,
       },
     });

     export async function generateGigfolioFeedback(profileData: any) {
       const prompt = `Given the following worker profile data, generate a short, positive feedback summary (like 'Professional, charming and lively'). Do not mention the user's name. Optionally, list up to 3 strengths and up to 2 suggestions for improvement. Keep the summary concise and impersonal.\n\nProfile Data: ${JSON.stringify(profileData)}`;
       const result = await model.generateContent(prompt);
       return result.response.text();
     }
     ```

4. **Use the Agent in the Profile Page**
   - In `app/user/[userId]/worker/profile/page.tsx`, import and use the agent function:
     ```ts
     import { generateGigfolioFeedback } from "@/app/lib/agents/gigfolioFeedbackAgent";
     // ...
     const aiFeedback = await generateGigfolioFeedback(profileData);
     // Use aiFeedback to display feedback summary, strengths, and suggestions
     ```

5. **Extend as Needed**
   - Add support for more profile fields, recent gig data, or richer feedback as your product evolves.

This modular approach keeps your AI feedback logic clean, testable, and easy to update.

---

## Admin Moderation

Admins will have the ability to view conversations associated with the gigfolio feedback chat flow via an admin panel. They can review message content and update the `moderationStatus` field if necessary. This helps monitor the AI's performance in providing helpful and appropriate feedback.

## PII Handling

When providing worker profile data to the AI agent for feedback generation, sensitive PII fields like location or display name should be excluded from the input (as noted in the "Data Inputs" section). 

- The profile data used to generate feedback should be sanitized or redacted *before* being sent to the AI prompt and before being stored as part of the chat history.
- The scheduled PII removal utility (detailed in [AI Chat Model and Backend Logic Plan](ai-models-plan.md)) will be used to process stored chat data, providing an additional layer of PII protection.

## Data Deletion and Retention

Chat messages from the gigfolio feedback flow will be stored in Firestore under the `/users/{userId}/aiChats` collection with `contextType: 'gigfolio_feedback'` (or similar). These messages will be subject to the general chat retention policy defined in the `system_flags` table and enforced by the scheduled data retention utility. 