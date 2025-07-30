# AI Chat: Expand on a View

This document describes the functionality and implementation plan for the "Expand on a View" AI chat feature.

## Feature Description

The "Expand on a View" chat allows a user to get more detailed information, explanations, or suggestions related to the content currently displayed in a specific application view (page). The AI agent receives context about the user's current view and uses it to provide relevant assistance.

## Use Cases

- Explaining complex data points on a dashboard.
- Providing definitions or context for terms used in a document or page.
- Suggesting next steps based on the current state of a form or workflow.
- Offering related resources or links based on the displayed content.

## Implementation Details

- **Context Provision**: The frontend will capture relevant data and context from the user's current view and send it to the backend API endpoint for the AI chat.
- **AI Agent**: A dedicated AI agent or a specific prompt within a general agent will process the view context and the user's query.
- **Firestore Storage**: Interactions will be stored in Firestore under `/users/{userId}/aiChats/{chatId}/messages/{messageId}` with `contextType: 'expand_view'`.
- **Backend Endpoint**: A new API endpoint (e.g., `/api/ai/chat/expand-view`) will handle incoming requests, forward context and queries to the AI agent, and store the conversation in Firestore.

## Data Model Considerations

- **Firestore**: Use the general `aiChats` structure. The `metadata` field can store the specific view context passed from the frontend.
- **PostgreSQL**: No specific model changes required beyond the general AI usage tracking and system flags.

## Backend Logic

- Receive view context and user query.
- Validate and process view context.
- Pass context and query to the AI agent.
- Stream or return AI response.
- Save messages (user query and AI response) to Firestore.
- Implement rate limiting based on AI usage.

## Firestore Security Rules

Rules will be based on the `/users/{userId}/aiChats` collection, allowing read/write access to the owner (`userId`) and admins. System agent will have write access.

## Admin Moderation

Admins will be able to view conversations with `contextType: 'expand_view'` via an admin panel. They can review message content and update the `moderationStatus` field if necessary.

## PII Handling

View context passed to the AI agent and stored in Firestore must be carefully reviewed for PII. Implement sanitization or redaction logic in the frontend before sending and in the backend before storing/processing by the AI. Utilize the PII removal utility for stored data if needed.

## Data Deletion and Retention

Chat messages for "Expand on a View" will be subject to the general chat retention policy defined in the `system_flags` table. The scheduled retention utility will delete these chats after the configured period. 