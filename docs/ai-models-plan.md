# AI Chat Model and Backend Logic Plan

This document outlines the proposed changes to the Firestore and PostgreSQL schemas and the backend logic required to support various AI and user-to-user chat functionalities.

## Firestore Data Model

We will utilize Firestore for real-time chat messages, leveraging its real-time updates and flexible structure. The proposed collections are:

- `/users/{userId}/aiChats/{chatId}/messages/{messageId}`: For direct user-to-AI conversations (onboarding, support, expand-view, edit-with-AI).
- `/gigs/{gigId}/chats/{chatId}/messages/{messageId}`: For gig-specific chats between buyers and workers. Firestore is the primary real-time store for these messages.
- `/adminChats/{adminChatId}/messages/{messageId}`: For admin-to-user support conversations, specifically for issues flagged by the AI for human intervention.

Each message document will include:
- `senderId`: ID of the sender (user, worker, buyer, admin, or "AI").
- `role`: Role of the sender (`user`, `worker`, `buyer`, `admin`, `ai`).
- `text`: Message content.
- `timestamp`: Server timestamp of when the message was sent.
- `isStreaming`: Boolean, true if the message was streamed (relevant for AI).
- `isChat`: Boolean, true for messages intended as part of a conversation (vs. system messages).
- `contextType`: String, categorizes the chat (e.g., `onboarding`, `support`, `expand_view`, `edit`, `gig`, `admin_support`).
- `gigId`: String, ID of the relevant gig (if `contextType` is `gig`).
- `sessionId`: String, optional ID for grouping related non-gig chats.
- `metadata`: Optional JSON object for additional context or structured data.
- `moderationStatus`: Enum (`PENDING`, `APPROVED`, `REJECTED`, `AUTO_FLAGGED`, `ESCALATED`, `RESOLVED`) for content moderation and issue tracking.

Indexing will be added for `userId`, `gigId`, `timestamp`, and `contextType` to facilitate querying.

## PostgreSQL Model (Drizzle)

While Firestore handles the real-time messages, PostgreSQL will store complementary data, analytics, and configuration.

- `ai_prompts` table: Already exists, can be used to store prompt templates used by AI agents.
- `system_flags` table: Proposed table to store system-wide configurations, including chat retention periods and default AI rate limits.
  - `flag_key`: Unique string key (e.g., `chat_retention_months`, `ai_message_rate_limit_daily_default`).
  - `flag_value`: JSONB or appropriate type to store the value (e.g., `{"value": 3}`, `{"limit": 100}`).
  - `description`: Text description of the flag.
- `user_ai_usage` table: Stores AI interaction counts per user, primarily for rate limiting.
  - `user_id`: UUID, foreign key to `users` table.
  - `date`: Date, day of usage.
  - `ai_message_count`: Integer, number of AI messages received by the user on that day.
  - `last_interaction_timestamp`: Timestamp of the last AI interaction.
- `escalated_issues` table: Stores records of issues escalated from AI chat to human support.
  - `id`: UUID, primary key.
  - `userId`: UUID, foreign key to `users` table.
  - `firestoreMessageId`: String, reference to the Firestore message that triggered escalation.
  - `gigId`: String, ID of the relevant gig (if applicable).
  - `issueType`: String, categorized issue type.
  - `description`: Text, summary of the issue.
  - `status`: Enum (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`).
  - `adminUserId`: UUID, foreign key to `users` table (assigned admin).
  - `resolutionNotes`: Text, notes on how the issue was resolved.
  - `createdAt`: Timestamp.
  - `updatedAt`: Timestamp.
- `chat_messages` table: In PostgreSQL, this table will store only references to Firestore messages or minimal summary data for analytical/archival purposes, updated via Firestore triggers. It will *not* be the primary store for real-time gig messages.

## Backend Logic Plan

- **Message Handling API Endpoints**: Create API endpoints to receive messages from clients and interact with AI models.
- **Firestore Integration**: Backend services will write incoming and outgoing messages to the appropriate Firestore collections. Firestore triggers will be used to update PostgreSQL tables (like `chat_messages` and `user_ai_usage`).
- **AI Agent Orchestration**: Logic to route user messages to the correct AI agent based on `contextType` or conversation history.
- **Rate Limiting**: Implement backend checks against the `user_ai_usage` table before invoking AI. Check against the limit (default from `system_flags`, or configurable per call). If the limit is exceeded, return a hardcoded message and silently log the event.
- **Fallback Mechanism**: In `geminiAIAgent`, implement retry logic. If the primary model fails after `retries - 2` (minimum 1 retry attempt with primary), switch to the `fallbackModelName` for the remaining retries.
- **Moderation**: Implement automated moderation checks on incoming user messages. Allow admin users to view conversations and update `moderationStatus` via an admin interface.
- **Human Escalation Logic**: Implement backend logic to detect user input triggering escalation, create a record in the `escalated_issues` table, update the Firestore message `moderationStatus` to `ESCALATED`, and potentially send an admin notification.
- **Data Retention Utility**: A scheduled backend job to identify and delete old chat documents from Firestore based on the `system_flags.chat_retention_months` setting.
- **PII Removal Utility**: A backend utility function/script to redact or remove sensitive information from chat message text and metadata. This will be detailed in a separate document (`docs/ai-pii-removal.md`). This can be triggered manually by admins or potentially automated.

## Firestore Security Rules Plan

Develop granular security rules for each chat collection (`aiChats`, `chats`, `adminChats`) to ensure:
- Users can only read/write their own `aiChats` or gig chats they are participants in.
- Admins can read/write all chat types and `adminChats`.
- AI/system can write messages but have limited read access.
- Leverage existing `isOwner` and `isGigParticipant` helpers, potentially adding an `isSystemAgent` check.

## New Documentation Needed

- `docs/ai-pii-removal.md`: Detailed plan for the PII removal utility.
- `docs/ai-chat-admin-support.md`: Detailed plan for the admin-to-user support chat flow. 