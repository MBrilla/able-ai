# AI Chat: Edit with AI

This document describes the functionality and implementation plan for the "Edit with AI" chat feature.

## Feature Description

The "Edit with AI" chat allows users to collaborate with an AI agent to refine or generate content within the application, such as editing a profile bio, drafting a gig description, or composing a message. The interaction is typically short-lived and focused on a specific piece of content.

## Use Cases

- Improving profile descriptions or summaries.
- Drafting or refining gig titles and descriptions.
- Generating initial drafts for messages or responses.
- Getting suggestions for improving written content.

## Implementation Details

- **Content Provision**: The frontend will send the content to be edited or the context for generation to the backend API.
- **AI Agent**: A dedicated AI agent or a specific prompt will handle content editing/generation tasks.
- **Firestore Storage**: Although often short-lived, interactions will be stored in Firestore under `/users/{userId}/aiChats/{chatId}/messages/{messageId}` with `contextType: 'edit'` for historical tracking and analysis.
- **Backend Endpoint**: A new API endpoint (e.g., `/api/ai/chat/edit`) will manage the interaction, pass content to the AI, receive suggestions, and save the conversation.

## Data Model Considerations

- **Firestore**: Use the general `aiChats` structure. The `metadata` field can store the original content being edited or the context for generation.
- **PostgreSQL**: No specific model changes required beyond general AI usage tracking and system flags.

## Backend Logic

- Receive content/context and user instructions.
- Pass content/context and instructions to the AI agent.
- Receive edited/generated content from AI.
- Return suggestions to the frontend.
- Save messages (user input and AI output) to Firestore.
- Implement rate limiting based on AI usage.

## Firestore Security Rules

Rules will be based on the `/users/{userId}/aiChats` collection, allowing read/write access to the owner (`userId`) and admins. System agent will have write access.

## Admin Moderation

Admins will be able to view conversations with `contextType: 'edit'` via an admin panel. They can review message content and update the `moderationStatus` field. This can be useful for monitoring AI performance and identifying potential misuse.

## PII Handling

Content sent for editing might contain PII. Implement sanitization or redaction logic in the frontend before sending and in the backend before storing/processing by the AI. Utilize the PII removal utility for stored data.

## Data Deletion and Retention

Chat messages for "Edit with AI" will be subject to the general chat retention policy defined in the `system_flags` table. The scheduled retention utility will delete these chats after the configured period. 