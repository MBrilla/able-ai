# AI Customer Reviews Section Integration Plan

## Overview
The platform will use an AI model (e.g., Gemini) to generate a concise, privacy-safe "Customer Reviews" summary for each worker's skill profile. This summary is based on raw buyer feedback, explicit recommendations, and past event data (including feedback and rehire frequency).

## Purpose
- Display a customer review summary for a gig worker on their skill profile page.
- The summary highlights strengths, positive trends, and rehire frequency, helping buyers quickly assess the worker's reputation for that skill.
- All data is privacy-safe: no worker or buyer names, emails, or direct identifiers are used.

## Data Available to the AI Agent

**Skill Profile Context:**
- Skill name/title (e.g., "Bartender")
- Hashtags/keywords (e.g., "#mixology", "#timemanagement")
- Number of gigs completed for this skill
- Years of experience for this skill
- Hourly rate for this skill
- Badges/awards (e.g., "Mixology Master")
- Qualifications/training (e.g., "Licensed bar manager")

**Customer Feedback Data:**
- Array of public comments from buyers (text only, no names/PII)
- Array of explicit recommendations (if any)
- Array of `wouldHireAgain` responses ("yes" | "no" | "maybe")
- Rehire frequency (number of times this worker was rehired for this skill)
- Review keywords (e.g., ["professional", "friendly"])

**Event Data:**
- List of past gigs for this skill (dates, feedback, rehire status)

## Prompt Example
```
You are an AI assistant for gig platforms. Given the following skill profile and customer feedback data (no PII), generate a concise, privacy-safe summary of customer sentiment for this worker's skill. Highlight strengths, positive trends, and rehire frequency. Do not mention the worker's name or any buyer names.

Skill Profile: {skillProfile}
Customer Feedback: {feedbackArray}
Recommendations: {recommendationsArray}
Rehire Data: {rehireStats}
```

## Expected Output Schema
```json
{
  "customerReviewSummary": "Professional, charming and lively. Frequently rehired for events. Highly recommended by buyers.",
  "strengths": ["Excellent communication", "Great with guests", "Punctual"],
  "rehireStats": {
    "totalGigs": 15,
    "rehireCount": 7,
    "wouldHireAgainYes": 12,
    "wouldHireAgainNo": 1,
    "wouldHireAgainMaybe": 2
  }
}
```

## Gemini Library Integration Example
```ts
import { getAI, getGenerativeModel, Schema } from "@firebase/ai";

const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });

const reviewSchema = Schema.object({
  customerReviewSummary: Schema.string(),
  strengths: Schema.optional(Schema.array(Schema.string())),
  rehireStats: Schema.object({
    totalGigs: Schema.number(),
    rehireCount: Schema.number(),
    wouldHireAgainYes: Schema.number(),
    wouldHireAgainNo: Schema.number(),
    wouldHireAgainMaybe: Schema.number(),
  }),
});

const model = getGenerativeModel(ai, {
  model: "gemini-2.5-flash-preview-05-20",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: reviewSchema,
  },
});

const prompt = `You are an AI assistant for gig platforms. Given the following skill profile and customer feedback data (no PII), generate a concise, privacy-safe summary of customer sentiment for this worker's skill. Highlight strengths, positive trends, and rehire frequency. Do not mention the worker's name or any buyer names.\n\nSkill Profile: ${JSON.stringify(skillProfile)}\nCustomer Feedback: ${JSON.stringify(feedbackArray)}\nRecommendations: ${JSON.stringify(recommendationsArray)}\nRehire Data: ${JSON.stringify(rehireStats)}`;

const result = await model.generateContent(prompt);
console.log(result.response.text());
```

## Quick Test Prompt for Chat UI
```
SYSTEM: You are an AI assistant for gig platforms. Given a skill profile, customer feedback, recommendations, and rehire data, generate a JSON object with a customerReviewSummary, strengths, and rehireStats.
USER: {skillProfile, feedbackArray, recommendationsArray, rehireStats}
```

## Integration Plan for `app/user/[userId]/worker/profile/skills/[skillId]/page.tsx`
1. **Export the AI Instance**
   - In `app/lib/firebase/clientApp.ts`, export the `ai` instance.
2. **Create the Agent File**
   - In `app/lib/agents/`, create `customerReviewAgent.ts`.
3. **Implement the Agent Function**
   - Import `ai`, define the model and schema as above, and export a function (e.g., `generateCustomerReviewSummary`).
4. **Use the Agent in the Skill Page**
   - In the skill profile page, import and use the agent function:
     ```ts
     import { generateCustomerReviewSummary } from "@/app/lib/agents/customerReviewAgent";
     // ...
     const reviewSummary = await generateCustomerReviewSummary(skillProfile, feedbackArray, recommendationsArray, rehireStats);
     // Display reviewSummary.customerReviewSummary, strengths, and rehireStats in the UI
     ```
5. **Review Management**
   - Update the summary when new feedback or recommendations are added.
   - Optionally, allow workers to request a refreshed summary after new gigs.

## Future Extensibility
- Add support for multi-language summaries.
- Add analytics (e.g., trends in rehire rate).
- Optionally, allow buyers to see anonymized aggregate feedback.
- Support richer context as more data becomes available.

## Admin Moderation

Admins will not typically moderate the AI-generated review summaries directly, as they are derived from aggregated and anonymized data. However, admins may need to review the underlying raw feedback or recommendations that feed into the summary if moderation concerns arise with the source data itself.

## PII Handling

PII handling is critical for the AI customer reviews summary.

- **Input Data**: Ensure that all data provided to the AI agent (comments, recommendations, event data) is already anonymized or redacted, removing any direct identifiers (names, emails, specific dates/locations if sensitive).
- **AI Prompt**: The prompt should explicitly instruct the AI *not* to include any PII or identifiers in the generated summary.
- **Output Summary**: The AI-generated summary should be reviewed to confirm no PII is present before being displayed or stored.
- **Storage**: If the AI-generated summaries are stored (e.g., cached), they should ideally not contain PII. If intermediate data containing potential PII is stored for processing, it must be subject to the PII removal utility detailed in [AI Chat Model and Backend Logic Plan](ai-models-plan.md).

## Data Deletion and Retention

While the AI-generated summary itself might be cached or stored briefly, the underlying raw data (buyer comments, recommendations) is subject to its own retention policy. The chat logs related to the *generation* of the summary (the prompt and response if stored as a temporary chat) will fall under the general chat retention policy defined in the `system_flags` table and enforced by the scheduled data retention utility. The primary focus for retention here is on the source data feeding the AI. 