# AI Suggestion Banner Integration Plan

## Overview
The AiSuggestionBanner will use an AI model (e.g., Gemini) to generate contextual suggestions for users based on their public profile, calendar, and business data.

## Roles & Target Pages
- **Worker:** `app/user/[userId]/worker/page.tsx`
- **Buyer:** `app/user/[userId]/buyer/page.tsx`

## Data Available to the AI Agent

### For Both Roles (from `userPublicProfile`):
- `uid` (not for display, only for context)
- `appRole`, `lastRoleUsed`, `isBuyerMode`, `isWorkerMode`
- `canBeBuyer`, `canBeGigWorker`
- `lastViewVisitedBuyer`, `lastViewVisitedWorker`
- (Optionally) `displayName`, `email`, `photoURL` (**do not use in suggestions for privacy**)

### For Worker:
- Profile completion status (inferred from profile/gigfolio)
- Skills, experience, gigfolio data (from profile page)
- Calendar/availability (if available)
- Recent gig activity (if available)
- Upcoming offers or shifts (if available)

### For Buyer:
- Recent hiring activity
- Number of available workers nearby (from platform data)
- Calendar (upcoming gigs)
- Payments history (summary, not details)
- Referral status

## PII & Privacy
- **Do not include:** user name, email, address, or any direct identifiers in suggestions.
- **OK to include:** aggregate stats, generic location context (e.g., "in your area"), role-based tips, platform trends.

## Prompt Examples

### Worker Example
```
You are an AI assistant for gig workers. Given the user's profile, skills, and recent activity (but no PII), suggest 1-3 actionable tips to help them get more gigs or improve their profile. Suggestions should be concise, impersonal, and privacy-safe.

Context:
- Profile completion: 80%
- Skills: Bartending, Waiter
- Availability: Next Tuesday open
- Recent activity: No gigs accepted in last 2 weeks

Return a JSON array of suggestions, each with a 'title' and 'description'.
```

### Buyer Example
```
You are an AI assistant for buyers. Given the user's recent hiring activity and platform trends (but no PII), suggest 1-3 ways to find great workers or manage gigs more efficiently. Suggestions should be concise, impersonal, and privacy-safe.

Context:
- Last gig posted: 3 weeks ago
- 10 new bartenders joined within 5 miles
- No upcoming gigs scheduled

Return a JSON array of suggestions, each with a 'title' and 'description'.
```

## Expected Output Schema
```json
[
  { "title": "Update Your Availability", "description": "Add more available dates to increase your chances of getting gigs." },
  { "title": "Complete Your Profile", "description": "Profiles with more details get 2x more offers." }
]
```

## Gemini Library Integration Example
```ts
import { getAI, getGenerativeModel, Schema } from "@firebase/ai";

const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });

const suggestionSchema = Schema.array(
  Schema.object({
    title: Schema.string(),
    description: Schema.string(),
  })
);

const model = getGenerativeModel(ai, {
  model: "gemini-2.5-flash-preview-05-20",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: suggestionSchema,
  },
});

const prompt = `You are an AI assistant for [worker|buyer]. Given the following context, suggest 1-3 actionable, privacy-safe tips. Return a JSON array of suggestions, each with a title and description.\n\nContext: ${JSON.stringify(context)}`;

const result = await model.generateContent(prompt);
console.log(result.response.text());
```

## Quick Test Prompt for Chat UI
```
SYSTEM: You are an AI assistant for [worker|buyer]. Given the user's context (no PII), suggest 1-3 actionable, privacy-safe tips as a JSON array.
USER: {context here}
```

## Future Extensibility
- Add more context (e.g., platform trends, seasonal demand).
- Personalize suggestions based on engagement (e.g., "You haven't posted a gig in a while").
- Support multi-language output.
- Integrate with notification system for timely suggestions.

## Admin Moderation

AI-generated suggestions in the banner are typically short and derived from aggregated/anonymized data. Direct moderation of these specific outputs is less likely to be necessary compared to chat interactions. However, admins may monitor the types of suggestions being generated to ensure they are appropriate and helpful. If the underlying data used to generate suggestions raises moderation concerns, those source data points would be the primary target for review.

## PII Handling

PII handling is paramount for the suggestion banner feature:

- **Input Data**: As noted in the "Data Available to the AI Agent" section, sensitive PII (names, emails, precise location) *must not* be included in the context provided to the AI agent. Only anonymized or aggregated data points and safe contextual information should be used.
- **AI Prompt**: The prompt must explicitly instruct the AI *not* to generate suggestions that include or reveal PII.
- **Output Suggestions**: The generated suggestions must be reviewed to confirm they are privacy-safe and contain no PII before being displayed.
- **Storage**: If the generated suggestions are cached, they should not contain PII. The interactions with the AI agent for generating these suggestions (the prompt and response) might be logged for monitoring or analytics; if these logs contain any intermediate data with potential PII, they must be subject to the PII removal utility detailed in [AI Chat Model and Backend Logic Plan](ai-models-plan.md).

## Data Deletion and Retention

The AI-generated suggestions themselves are typically transient and displayed in the UI. Any temporary storage or caching of these suggestions would follow standard frontend/backend caching practices. Logs of the interactions with the AI agent to generate suggestions will fall under the general chat/AI interaction logging retention policy defined in the `system_flags` table and enforced by the scheduled data retention utility, as outlined in the [AI Chat Model and Backend Logic Plan](ai-models-plan.md).

## Integration Plan for `app/user/[userId]/worker/page.tsx` and `app/user/[userId]/buyer/page.tsx`
1. **Export the AI Instance**
   - In `app/lib/firebase/clientApp.ts`, export the `ai` instance.

2. **Create the Agent File**
   - In `app/lib/agents/`, create `suggestionBannerAgent.ts`.

3. **Implement the Agent Function**
   - Import `ai`, define the model and schema as above, and export a function (e.g., `generateSuggestions`).

4. **Use the Agent in the Page**
   - In the dashboard page, import and use the agent function:
     ```ts
     import { generateSuggestions } from "@/app/lib/agents/suggestionBannerAgent";
     // ...
     const suggestions = await generateSuggestions(context);
     // Use suggestions[0].description for the AiSuggestionBanner message
     ```

5. **Extend as Needed**
   - Add support for more context fields, richer suggestions, or multi-turn interactions as your product evolves. 

## Development Progress Checklist

This section tracks the implementation status of the AI Suggestion Banner and related features.

### Completed

-   [x] **AI Suggestion Schema Enhancement:**
    -   [x] Updated `Suggestion` interface to include `id`, `title`, `description`, and `suggestedActions` (optional array with `text` and `linkKey`).
    -   [x] Defined `SuggestedAction` interface.
-   [x] **AI Agent (`suggestionBannerAgent.ts`) Updates:**
    -   [x] Modified Firebase AI `suggestionSchema` to reflect the new structure.
    -   [x] Updated AI prompt for generating `id`, `title`, `description`, and `suggestedActions` with `linkKey`s.
    -   [x] Adjusted `generateSuggestions` return type to `Promise<Suggestion[]>`.
    -   [x] Ensured fallback logic conforms to the new schema.
    -   [x] Corrected schema optional field declaration (using `optionalProperties`).
-   [x] **Custom Hook (`useAiSuggestionBanner.tsx`) Adjustments:**
    -   [x] Imported `SuggestedAction` interface.
    -   [x] Ensured default and fetched suggestions map to the full `Suggestion` structure.
    -   [x] Managed session storage caching and loading of enriched suggestions.
-   [x] **AI Suggestion Banner Component (`AiSuggestionBanner.tsx`):**
    -   [x] Updated interfaces to support the new suggestion schema (UI remains description-only for the banner itself).
-   [x] **AI Chat Page (`app/user/[userId]/able-ai/page.tsx`) Enhancements:**
    -   [x] Updated interfaces for enriched `Suggestion` and `SuggestedAction`.
    -   [x] Added UI to display suggestion titles.
    -   [x] Rendered `suggestedActions` as clickable buttons.
    -   [x] Implemented initial `handleActionClick` for logging/alerting.
    -   [x] Implemented routing logic in `handleActionClick` based on `linkKey`s using `router.push()`.
    -   [x] Defined `linkKeyRoutes` for mapping `linkKey`s to app routes.
-   [x] **UI Enhancements for Banner:**
    -   [x] Implemented a skeleton loader with animation for the `isLoading` state in `AiSuggestionBanner.tsx`.

#### Phase 1 Changelog
- Refactored AiSuggestionBanner.module.css:
    - Moved CSS variables to app/globals.css, removed local :root, and cleaned up redundant/commented styles.
    - Ensured color and style variables are reused across the app for consistency.
- Refactored AiSuggestionBanner.tsx:
    - Removed orphaned classNames and ensured all referenced CSS classes exist.
    - Used useCallback for event handlers to optimize performance.
    - Confirmed and improved TypeScript typings for props and suggestion data.
- Enhanced logging utility (app/lib/log.ts):
    - Added granular error codes for all major error types (general, storage, auth, AI-specific, component logic).
    - Improved log formatting and added info/debug log types.
    - Differentiated log levels (error, warning, info) and provided placeholders for future remote logging integration.

### In Progress

-   [x] **Chat Input Integration for Suggested Actions:**
    -   [x] Implement UI for chat input on the AI Chat Page. *(In progress)*
    -   [x] Integrate suggested action texts (for actions *without* a `linkKey`) to pre-fill or send messages in the chat. *(In progress)*
-   [x] **Documentation Updates:**
    -   [x] Update technical documentation to reflect the new suggestion schema and usage (this document is part of that). *(In progress)*
    -   [x] Document the `linkKey` to route mapping and action handling logic. *(In progress)*

### To Do

-   [ ] **End-to-End Testing:**
    -   [ ] Test the entire flow: suggestion generation, caching, banner display, chat page interaction (title, actions), and navigation.
    -   [ ] Validate loading states, dismissal, refresh, carousel controls, and action button behavior.
-   [ ] **Refine `linkKeyRoutes`**

---

## Phase 2 & 3 Notes

- **Phase 2: Chat Input Integration**
    - Work is underway to allow suggested actions (without a `linkKey`) to pre-fill or send chat messages on the AI Chat Page. This enhances user interaction and streamlines acting on suggestions.
- **Phase 3: Documentation & Testing**
    - Documentation is being updated to reflect the new schema, action handling, and routing logic. End-to-end testing will follow to ensure all flows (suggestion generation, caching, banner, chat, navigation) are robust.

    -   [ ] Verify and update all placeholder routes in `linkKeyRoutes` in `app/user/[userId]/able-ai/page.tsx` to match actual application paths.
    -   [ ] Consider and implement handling for role-specific routes if necessary.
-   [ ] **User Feedback and Iteration:**
    -   [ ] Gather user feedback on enriched suggestions and the chat page experience.
    -   [ ] Iterate on UI/UX and AI prompt tuning based on feedback.
