# AI Chat: Admin Support

This document describes the functionality and implementation plan for the Admin Support chat flow, used when an AI interaction requires human intervention.

## Feature Description

The Admin Support chat flow is a dedicated channel for communication between a user and an administrator/support agent. It is specifically initiated when an AI agent identifies that it cannot adequately resolve a user's request or detects user frustration, triggering an escalation for human review and assistance.

## Use Cases

- Handling complex or nuanced user issues beyond AI capabilities.
- Addressing user frustration or dissatisfaction.
- Responding to specific user requests that require human action (e.g., account recovery, manual review).
- Providing human oversight and resolution for issues initially reported via AI.

## Initiation Flow

1.  User interacts with an AI agent (e.g., Report Issue chat, Onboarding chat).
2.  The AI agent detects a trigger condition (e.g., specific keywords, sentiment analysis, exceeding retry attempts).
3.  The AI agent informs the user that their issue is being escalated to human support.
4.  Backend logic creates a record in the `escalated_issues` PostgreSQL table, referencing the user and the specific message/conversation in Firestore that triggered the escalation.
5.  A new chat session is potentially initiated in the `/adminChats` Firestore collection, or the existing AI chat session is marked for admin visibility/participation (TBD on exact chat UI model - separate thread or shared?). The `contextType` for this chat should be `admin_support`.
6.  An admin user is notified (e.g., via a notification referencing the `escalated_issues` record).
7.  An admin user can access the chat history (from the original AI chat or the new admin chat) and communicate directly with the user.

## Data Model Considerations

- **Firestore**: Use the `/adminChats/{adminChatId}/messages/{messageId}` collection. Messages will follow the standard structure (`senderId`, `role`, `text`, `timestamp`, etc.) with `contextType: 'admin_support'`. The `adminChatId` could be linked to the `escalated_issues.id` from Postgres.
- **PostgreSQL**: The `escalated_issues` table is central to this flow, storing the structured record of the escalation, its status, and the assigned admin. The `firestoreMessageId` links back to the specific point in the Firestore chat history that caused the escalation.

## Backend Logic

- Logic within AI agent handlers to detect escalation triggers.
- API endpoint or function to create `escalated_issues` records in Postgres.
- Logic to initiate/transition chat session to `admin_support` context in Firestore.
- Admin notification trigger based on new `escalated_issues` records.
- API endpoints for admins to read and write messages in `/adminChats`.
- Logic for admins to update the `status` and `resolutionNotes` in the `escalated_issues` table.

## Firestore Security Rules

Rules for the `/adminChats` collection will allow read and write access only to the involved user (`userId`) and users with the 'ADMIN' app role. System agent will have write access to log initial escalation messages.

## Admin Moderation

The Admin Support chat flow is inherently a moderated space. Administrators are the primary participants and have full visibility and control over messages within `/adminChats`. The `moderationStatus` field on messages could still be used internally for tracking (e.g., auto-flagging certain content even in admin chats), but the main moderation/resolution status is managed in the `escalated_issues` table.

## PII Handling

This chat flow is likely to contain PII as users discuss their specific issues. 

- Access to `/adminChats` is restricted to the user and authorized admins.
- Admins are trained in handling sensitive data.
- PII contained within messages in `/adminChats` will be subject to the same scheduled PII removal utility detailed in [AI PII Removal Utility](ai-pii-removal.md), based on the general chat retention policy.
- PII within the `escalated_issues` table (e.g., in the description or resolution notes) must also be considered in the scope of the PII removal utility or separate data management processes.

## Data Deletion and Retention

Chat messages within the `/adminChats` collection will be stored and subject to the general chat retention policy defined in the `system_flags` table. The scheduled data retention utility will delete these chat documents after the configured period. Records in the `escalated_issues` table will have their own retention policy, potentially longer than chat messages for audit purposes. 