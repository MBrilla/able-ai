# AI Chat Agent for Reporting Issues

## Overview
The platform will use an AI chat agent (e.g., Gemini) to help users report issues in a conversational manner, collecting all relevant information and structuring it for support.

## Data Inputs
- User context (role, profile, current action)
- Issue description
- Related gig info (if applicable)
- User input at each step

## AI Model Usage
- **Model:** Gemini (e.g., gemini-2.0-flash)
- **Integration:**
  - Use the Firebase AI SDK as in other features.
  - At each step, send the current issue context and user input to the model.

## Extended Issue Types
The AI agent should support and help clarify/report issues such as:
- **Payment Issue**
  - Payment was rejected/failed
  - Did not receive payment
  - Overcharged/undercharged
- **Service Quality**
  - Gig worker did not show up
  - Gig worker was late
  - Gig worker was unprofessional
  - Work was not completed as agreed
- **Technical Problem**
  - App is malfunctioning (crash, bug, can't upload files, etc.)
  - Can't access gig details
  - Notification issues
- **Other**
  - Communication problems
  - Dispute with another user
  - Something else (free text)

## Updated Schema

### Input to AI Agent
```json
{
  "gigId": "string",
  "issueType": "payment_issue" | "service_quality" | "technical_problem" | "other",
  "description": "string",
  "attachedFiles": ["filename1.png", "filename2.pdf"]
}
```

### Expected Output from AI Agent
```json
{
  "clarifiedIssueType": "service_quality",
  "clarifiedDescription": "The gig worker did not show up for the scheduled event.",
  "suggestedActions": [
    "Contact support for a refund.",
    "Provide any evidence (screenshots, messages) if available."
  ],
  "isUrgent": true
}
```

## Prompt Example
```
Given the following issue report for a gig, clarify the issue type and description. Suggest up to 2 actions the user or support can take. If the issue is urgent (e.g., payment failure, worker no-show), set isUrgent to true.

Possible issue types: payment_issue, service_quality, technical_problem, other.

Input:
{
  "gigId": "...",
  "issueType": "...",
  "description": "...",
  "attachedFiles": [...]
}
```

## Response Format
```json
{
  "field": "issueDescription",
  "value": "The gig was cancelled without notice."
}
```

## Gemini Library Integration Example

To ensure the AI returns a structured feedback object, use a response schema:

```ts
import { getAI, getGenerativeModel, Schema } from "@firebase/ai";

const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });

const reportIssueSchema = Schema.object({
  clarifiedIssueType: Schema.string(),
  clarifiedDescription: Schema.string(),
  suggestedActions: Schema.optional(Schema.array(Schema.string())),
  isUrgent: Schema.optional(Schema.boolean()),
});

const model = getGenerativeModel(ai, {
  model: "gemini-2.5-flash-preview-05-20",
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: reportIssueSchema,
  },
});

export async function clarifyIssueReport(issueData: any) {
  const prompt = `Given the following issue report for a gig, clarify the issue type and description. Suggest up to 2 actions the user or support can take. If the issue is urgent (e.g., payment failure, worker no-show), set isUrgent to true.\n\nPossible issue types: payment_issue, service_quality, technical_problem, other.\n\nInput:\n${JSON.stringify(issueData)}`;
  const result = await model.generateContent(prompt);
  return result.response.text();
}
```

### Real-Time Chat Example (Streaming)

For a user-facing chat, you can use the latest Gemini model and real-time streaming:

```ts
import { getAI, getGenerativeModel, Schema } from "@firebase/ai";

const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, { model: "gemini-2.5-flash-preview-05-20" });

async function runChat() {
  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: "I have a problem with my payment for gig #123." }],
      },
      {
        role: "model",
        parts: [{ text: "I'm here to help. Can you describe the payment issue?" }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 200,
    },
  });

  const msg = "The payment was rejected by my bank.";
  const result = await chat.sendMessageStream(msg);

  let text = '';
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    console.log(chunkText);
    text += chunkText;
  }
}

runChat();
```

### Quick Test Prompt for Chat UI
```
SYSTEM: You are a gig issue assistant. Given a user's issue report, clarify the issue type and description, suggest up to 2 actions, and flag if urgent.
USER: {issue report data here}
```

## Future Extensibility
- Add more granular issue types (e.g., "worker left early", "incomplete payment").
- Integrate with real-time support chat or escalation.
- Allow the user to track issue status and updates.
- Suggest relevant help articles or FAQ links.
- Multi-language support.
- Automatically attach relevant gig data (date, participants) for context.
- Use AI to triage and escalate urgent issues to human support.

## Integration Plan for `app/gigs/[gigId]/report-issue/page.tsx`

1. **Export the AI Instance**
   - In `app/lib/firebase/clientApp.ts`, ensure you export the `ai` instance.

2. **Create the Agent File**
   - In `app/lib/agents/`, create `reportIssueAgent.ts`.

3. **Implement the Agent Function**
   - Import `ai`, define the model and schema as above, and export a function (e.g., `clarifyIssueReport`).
   - Optionally, implement a streaming chat function for real-time user interaction.

4. **Use the Agent in the Page**
   - In `app/gigs/[gigId]/report-issue/page.tsx`, import and use the agent function:
     ```ts
     import { clarifyIssueReport } from "@/app/lib/agents/reportIssueAgent";
     // ...
     const aiClarified = await clarifyIssueReport({ gigId, issueType, description, attachedFiles });
     // Use aiClarified to display suggestions, urgency, etc.
     ```
   - For real-time chat, use the streaming chat API and update the UI as new chunks arrive.

5. **Extend as Needed**
   - Add support for more fields, real-time chat, or richer feedback as your product evolves.

This modular approach keeps your AI issue reporting logic clean, testable, and easy to update.

## Real-Time Chat Example (React 19/Next.js)

For a user-facing chat in React 19/Next.js, use async iterators and hooks to stream the AI response. Here's a simplified example:

```tsx
import React, { useState } from "react";
import { getAI, getGenerativeModel } from "@firebase/ai";

const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, { model: "gemini-2.5-flash-preview-05-20" });

export default function ReportIssueChat() {
  const [messages, setMessages] = useState([
    { role: "model", text: "Hi! How can I help you with your gig issue today?" },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  async function handleSend() {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput("");
    setIsStreaming(true);

    const chat = model.startChat({
      history: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      generationConfig: { maxOutputTokens: 200 },
    });
    const result = await chat.sendMessageStream(input);
    let aiText = "";
    for await (const chunk of result.stream) {
      aiText += chunk.text();
      setMessages((msgs) => [
        ...msgs.slice(0, -1),
        { role: "model", text: aiText },
      ]);
    }
    setIsStreaming(false);
  }

  return (
    <div>
      <div style={{ minHeight: 200, border: "1px solid #ccc", padding: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ color: m.role === "user" ? "#333" : "#0070f3" }}>
            <b>{m.role === "user" ? "You" : "Support"}:</b> {m.text}
          </div>
        ))}
        {isStreaming && <div>Support is typing...</div>}
      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSend();
        }}
        style={{ marginTop: 8 }}
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={isStreaming}
          style={{ width: "80%" }}
        />
        <button type="submit" disabled={isStreaming || !input.trim()}>Send</button>
      </form>
    </div>
  );
}
```

## Relaying to a Human & Calming the User

The AI agent should detect if the user expresses frustration, urgency, or requests further assistance (e.g., "reset password", "verify payment", "I want to talk to a human"). In these cases:

- **Relay to Human:**
  - The AI should respond with empathy and reassurance, e.g.:
    > "I'm sorry you're having trouble. I'm connecting you to a human support agent who can help further. Your issue will be prioritized."
  - Optionally, trigger a backend escalation (e.g., notify support staff, open a live chat, or create a high-priority ticket).

- **Calm and Reassure:**
  - The AI should always:
    - Acknowledge the user's frustration or concern.
    - Assure the user that their issue will be resolved as soon as possible.
    - Provide clear next steps or what to expect (e.g., "A support agent will contact you shortly.")

- **Example AI Response:**
  > "I understand this is frustrating. I'm escalating your issue to our human support team right now. You will receive a response as soon as possible. Thank you for your patience."

- **Implementation Note:**
  - In your agent function, you can add logic to detect trigger phrases ("talk to a human", "angry", "not working", etc.) and switch to a human handoff mode.
  - Optionally, log or flag these conversations for immediate review by your support team.

## Backend Integration for Human Escalation

To ensure robust, auditable, and actionable escalation of user issues from AI chat to human support, integrate Firestore and Postgres as follows:

### 1. **Store Chat in Firestore**
- All user/AI (and later, human) chat messages are stored in the Firestore `messages` collection.
- Each message should include:
  - `senderFirebaseUid`
  - `text`
  - `timestamp`
  - `isReadByReceiver`
  - `moderationStatus` (e.g., 'PENDING', 'ESCALATED', 'RESOLVED')
  - `gigId` (if relevant)
- When escalation is triggered, record the relevant `messageId` (the Firestore document ID for the triggering message or conversation).

### 2. **Create Escalation Record in Postgres**
- In Drizzle/Postgres, create a new record in the `escalated_issues` table (see schema above) when the AI detects a need for human handoff.
- Fields should include:
  - `userId` (from session/auth)
  - `messageId` (from Firestore)
  - `gigId`, `issueType`, `description`, etc.
  - `status` (default 'OPEN')
  - `createdAt`
- This record is the permanent, auditable log of the escalation event.

### 3. **Link Firestore and Postgres**
- The `messageId` field in Postgres links the escalation record to the full chat history in Firestore.
- This allows admins to view the entire conversation context for any escalated issue.

### 4. **Notify Admins**
- When an escalation is created, add a notification to your `notifications` collection (Firestore or Postgres), referencing both the `messageId` and the `escalated_issues.id`.
- Example notification payload:
  ```json
  {
    "type": "escalation",
    "userId": "...",
    "messageId": "...",
    "escalationId": "...",
    "gigId": "...",
    "status": "OPEN",
    "createdAt": "..."
  }
  ```
- Admins can subscribe to this collection for real-time alerts and review.

### 5. **Admin Review & Resolution**
- Admins use the escalation record (Postgres) and chat history (Firestore) to resolve the issue.
- They can update the `status` in Postgres and optionally add resolution notes.
- The user can be notified of updates via the notifications system.

### 6. **Security & Auditability**
- Only authorized support/admin users can view and update escalated issues and related chat history.
- Use Firestore security rules and Postgres row-level security as appropriate.
- All actions are logged for audit purposes.

---

**Summary:**
- **Firestore**: Stores the full chat history and real-time notifications.
- **Postgres**: Stores permanent escalation records, status, and links to chat.
- **Notifications**: Bridge between systems for real-time admin alerting and user updates.

This integration ensures every escalated user request is tracked, actionable, and auditable across both systems.

## Admin Moderation

Admins will have the ability to view conversations associated with the issue reporting chat flow via an admin panel. They can review message content, including the initial report details and AI interactions, and update the `moderationStatus` field. This allows for oversight of the issue reporting process and helps in identifying trends or problematic interactions.

## PII Handling

Issue reports often contain sensitive information and PII related to the user, gig, or other parties involved. 

- User input and attached files must be handled securely. Frontend and backend logic should minimize the exposure of sensitive PII when processing or displaying this information, especially when involving the AI.
- While the AI may help structure the report, the raw, potentially sensitive input should be stored securely and accessed only by authorized personnel.
- The scheduled PII removal utility (detailed in [AI Chat Model and Backend Logic Plan](ai-models-plan.md)) will be crucial for managing PII in stored issue report chat data, ensuring compliance with data retention and privacy policies.

## Data Deletion and Retention

Chat messages from the issue reporting flow will be stored in Firestore under the `/users/{userId}/aiChats` collection with `contextType: 'report_issue'` (or similar). These messages, including the initial report details if stored as part of the chat, will be subject to the general chat retention policy defined in the `system_flags` table and enforced by the scheduled data retention utility. Longer retention for critical issues might be considered but should be explicitly planned and documented. 