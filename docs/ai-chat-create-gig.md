# AI Chat Agent for Gig Creation

## Overview
The platform will use an AI chat agent (e.g., Gemini) to help buyers create new gigs through a conversational interface, collecting all necessary details step by step.

## Data Inputs
- User context (role, profile)
- Current gig creation data (role, date, time, pay, etc.)
- User input at each step

## Step-by-Step Prompting and Schema

### Step Schema
```ts
const gigStepSchema = Schema.object({
  field: Schema.string(),
  value: Schema.string(),
  prompt: Schema.string(),
  isComplete: Schema.boolean(),
});
```

### Final Summary Schema
```ts
const gigSummarySchema = Schema.object({
  gigDescription: Schema.string(),
  additionalInstructions: Schema.string(),
  hourlyRate: Schema.number(),
  gigLocation: Schema.string(),
  gigDate: Schema.string(),
  discountCode: Schema.optional(Schema.string()),
  selectedWorker: Schema.optional(Schema.string()),
});
```

### Example Prompts (per step)
- **Gig Description:**  
  `What kind of gig do you need to fill?`
- **Additional Instructions:**  
  `Any special skills or instructions for your hire?`
- **Hourly Rate:**  
  `How much would you like to pay per hour?`
- **Location:**  
  `Where is the gig?`
- **Date:**  
  `What date is the gig?`
- **Discount Code:**  
  `Do you have a discount code?`
- **Worker Selection:**  
  `Here are available workers. Who would you like to book?`
- **Summary:**  
  `Here is a summary of your gig. Please confirm all details.`

### Example Step Response
```json
{
  "field": "gigDescription",
  "value": "Bartender for a wedding reception",
  "prompt": "What kind of gig do you need to fill?",
  "isComplete": true
}
```

### Example Final Summary Response
```json
{
  "gigDescription": "Bartender for a wedding reception",
  "additionalInstructions": "Cocktail making experience would be ideal",
  "hourlyRate": 15,
  "gigLocation": "The Green Tavern, Rye Lane, Peckham, SE15 5AR",
  "gigDate": "2024-07-25",
  "discountCode": "2FREEABLE",
  "selectedWorker": "Benji Asamoah"
}
```

## Gemini Library Integration Example

To ensure the AI returns structured gig creation data, use a response schema. For example, to collect a field and value as JSON for each step:

```ts
import { getAI, getGenerativeModel, Schema } from "@firebase/ai";

const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });

const gigStepSchema = Schema.object({
  field: Schema.string(),
  value: Schema.string(),
  prompt: Schema.string(),
  isComplete: Schema.boolean(),
});

const model = getGenerativeModel(ai, {
  model: "gemini-2.0-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: gigStepSchema,
  },
});

const prompt = `What kind of gig do you need to fill?`;
const result = await model.generateContent(prompt);
console.log(result.response.text());
```

For the final summary, use:

```ts
const gigSummarySchema = Schema.object({
  gigDescription: Schema.string(),
  additionalInstructions: Schema.string(),
  hourlyRate: Schema.number(),
  gigLocation: Schema.string(),
  gigDate: Schema.string(),
  discountCode: Schema.optional(Schema.string()),
  selectedWorker: Schema.optional(Schema.string()),
});

const summaryModel = getGenerativeModel(ai, {
  model: "gemini-2.0-flash",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: gigSummarySchema,
  },
});

const summaryPrompt = `Here is a summary of your gig. Please confirm all details.`;
const summaryResult = await summaryModel.generateContent(summaryPrompt);
console.log(summaryResult.response.text());
```

### Quick Test Prompt for Chat UI
```
SYSTEM: You are a gig creation assistant. For each step, extract the relevant field, value, prompt, and isComplete as JSON. At the end, return a summary object with all fields.
USER: {gigData, userInput here}
```

## Future Extensibility
- Add support for more gig fields (location, requirements, etc.)
- Multi-turn conversation and summary confirmation
- Multi-language support 

## Integration Plan for `app/user/[userId]/buyer/gigs/new/page.tsx`

To integrate the AI chat agent into the gig creation page, follow this plan:

1. **Export the AI Instance**
   - In `app/lib/firebase/clientApp.ts`, export the `ai` instance:
     ```ts
     // app/lib/firebase/clientApp.ts
     export const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
     ```

2. **Create Agent Files**
   - In a new folder, e.g., `app/lib/agents/`, create a file for each agent. For gig creation:
     - `app/lib/agents/gigCreationAgent.ts`

3. **Implement the Agent Function**
   - In `gigCreationAgent.ts`, import `ai` and define the model and schema as described above.
   - Export a function (e.g., `generateGigStep` or `generateGigSummary`) that takes the prompt/context and returns the AI response.
   - Example:
     ```ts
     // app/lib/agents/gigCreationAgent.ts
     import { ai } from "../firebase/clientApp";
     import { getGenerativeModel, Schema } from "@firebase/ai";

     const gigStepSchema = Schema.object({
       field: Schema.string(),
       value: Schema.string(),
       prompt: Schema.string(),
       isComplete: Schema.boolean(),
     });

     const model = getGenerativeModel(ai, {
       model: "gemini-2.0-flash",
       generationConfig: {
         responseMimeType: "application/json",
         responseSchema: gigStepSchema,
       },
     });

     export async function generateGigStep(prompt: string) {
       const result = await model.generateContent(prompt);
       return result.response.text();
     }
     ```

4. **Use the Agent in the Page**
   - In `app/user/[userId]/buyer/gigs/new/page.tsx`, import and use the agent function:
     ```ts
     import { generateGigStep } from "@/app/lib/agents/gigCreationAgent";
     // ...
     const aiResponse = await generateGigStep(prompt);
     // Use aiResponse to update chat state
     ```

5. **Extend for Other Steps or Summary**
   - Add similar functions for summary or other steps as needed, using the appropriate schema.

This structure keeps your AI logic modular, testable, and easy to update as your flows evolve.

---

## Admin Moderation

Admins will have the ability to view conversations associated with the gig creation chat flow via an admin panel. They can review message content and update the `moderationStatus` field if necessary. This helps monitor the AI's performance and user interactions during the critical gig creation process.

## PII Handling

User input during the gig creation process (e.g., location details, contact info mentioned in descriptions) may contain PII. 

- Implement sanitization or redaction logic in the frontend before sending sensitive data to the AI prompt.
- Be mindful of the data included in the `metadata` field when storing the chat, ensuring sensitive details are not unnecessarily captured.
- The scheduled PII removal utility (detailed in [AI Chat Model and Backend Logic Plan](ai-models-plan.md)) will be used to process stored chat data.

## Data Deletion and Retention

Chat messages from the gig creation flow will be stored in Firestore under the `/users/{userId}/aiChats` collection with `contextType: 'create_gig'` (or similar). These messages will be subject to the general chat retention policy defined in the `system_flags` table and enforced by the scheduled data retention utility. 