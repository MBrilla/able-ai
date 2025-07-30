# AI PII Removal Utility

This document outlines the plan for a backend utility to identify, redact, or delete Personally Identifiable Information (PII) from chat logs and potentially other data stores within the platform.

## Purpose

Ensure compliance with data privacy regulations (e.g., GDPR, CCPA) by providing a mechanism to manage and remove PII from stored data, particularly chat history, after a defined retention period or upon user request.

## Scope

- Primarily targets chat message content (`text` field in Firestore message documents).
- May extend to metadata fields (`metadata` in Firestore) if they are found to contain PII.
- Considers potential PII in associated PostgreSQL tables (e.g., `chat_messages` references, `escalated_issues` descriptions) if mirrored or linked data includes PII.

## Identification Methods

The utility will employ methods to identify potential PII within text data:
- **Pattern Matching:** Using regular expressions to identify common PII patterns (e.g., email addresses, phone numbers, common name formats, addresses - though this is challenging and error-prone).
  - _Technical Detail:_ Implement specific regex patterns for common formats like email (`\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b`), phone numbers (requires region-specific patterns), and potentially less reliable patterns for names or basic addresses. A library like `re` in Python or built-in regex in other languages will be used.
- **Named Entity Recognition (NER):** Utilizing NLP libraries to identify and classify entities like persons, organizations, locations, etc. (More robust but requires more setup).
  - _Technical Detail:_ Integrate with a cloud-based NER service (e.g., Google Cloud Natural Language, AWS Comprehend) or an open-source library (e.g., spaCy, NLTK with a pre-trained model). The service/library will process text chunks to tag potential entities.
- **Contextual Clues:** Identifying PII based on surrounding text or metadata (e.g., a field labeled "customer_address").
  - _Technical Detail:_ When processing structured/semi-structured data (like metadata fields or specific message types), check field names or nearby keywords for strong indicators of PII type before applying pattern matching or NER.

## Handling Methods

Once potential PII is identified, the utility will apply configured handling methods:
- **Redaction:** Replacing PII with a placeholder (e.g., `[EMAIL]`, `[PERSON_NAME]`, `[REDACTED]`). This preserves the message structure and context but removes the sensitive data.
  - _Technical Detail:_ Replace identified PII strings with consistent, type-specific placeholders (e.g., `[EMAIL_REDACTED]`, `[PHONE_REDACTED]`, `[NAME_REDACTED]`, `[ADDRESS_REDACTED]`, `[PII_REDACTED]` for generic). Ensure redaction handles overlapping or nested matches correctly.
- **Deletion:** Deleting the message document or record entirely. This is the most aggressive method and might impact conversation flow.
  - _Technical Detail:_ Implement soft deletion by marking records/documents with a flag (`is_deleted: true`, `deleted_at: timestamp`) rather than immediate hard deletion. A separate garbage collection process can perform hard deletes later. This allows for potential recovery if needed.
- **Hashing/Tokenization:** Replacing PII with a one-way hash or a token, allowing for checking against known PII without storing the raw data. (More complex, might be overkill for simple chat logs).
  - _Technical Detail (Optional/Future):_ If required for specific compliance or analytics, implement a vaulting system where PII is replaced by a token, and the actual PII is stored encrypted elsewhere, accessible only with strict authorization.

The primary method for chat text will likely be **Redaction** to preserve conversational context, with **Deletion** used for entire chat documents based on retention policies.

## Triggering

The PII removal utility can be triggered by:
- **Scheduled Jobs:** Automatically run periodically (e.g., daily, weekly) to process data older than the defined retention period (`system_flags.chat_retention_months`).
  - _Technical Detail:_ Configure a scheduled job using a platform-native scheduler (e.g., Firebase Scheduled Functions, Cloud Scheduler + Cloud Functions/Run, or a cron job on a dedicated server). The job will read the `chat_retention_months` value from the `system_flags` table and query data older than that period.
- **Manual Admin Action:** Allow administrators to trigger PII removal for specific users, chats, or date ranges via an admin interface.
  - _Technical Detail:_ Create a protected backend API endpoint (`/api/admin/trigger-pii-removal`) that accepts parameters like `userId`, `gigId`, `chatId`, `dateRange`. This endpoint would be accessible only by authenticated and authorized admin users via an internal admin dashboard.
- **User Data Deletion Request:** Integrate with a user account deletion or data removal request process to ensure all associated PII is handled.
  - _Technical Detail:_ Hook into the user account deletion process. When a user requests data deletion, queue a PII removal task specifically for that user's data across all relevant collections and tables.

## Implementation Details

- Develop a backend service or serverless function dedicated to this task.
  - _Technical Detail:_ Implement the utility as a Firebase Scheduled Function or a microservice deployed on a platform like Cloud Run. This allows it to scale and have necessary permissions.
- Define configurable rules for PII identification (patterns, NER models) and handling (redaction format, deletion criteria).
  - _Technical Detail:_ Store PII rules and configurations securely (e.g., in Firebase Remote Config, a dedicated config file, or environment variables). The utility should load these rules on startup or on each invocation.
- Implement logic to iterate through relevant data stores (Firestore collections, potentially Postgres tables).
  - _Technical Detail:_ For Firestore, use cursor-based pagination to process documents in batches to avoid memory issues and stay within query limits. For PostgreSQL, use `LIMIT` and `OFFSET` or cursor-based fetching for large tables.
- Handle potential rate limits or performance considerations when processing large volumes of data.
  - _Technical Detail:_ Implement rate limiting when writing back to Firestore/Postgres. Design the process to be resumable in case of interruptions.
- Log all PII removal actions for audit purposes.
  - _Technical Detail:_ Log details of each removal (e.g., timestamp, data store, document/record ID, type of PII found, action taken - redacted/deleted, by whom/which trigger) to a dedicated logging service (e.g., Cloud Logging) or an `admin_logs` table in Postgres.

## Data Model Impact

- Requires read access to chat collections in Firestore.
- Requires write access to modify/delete message documents (for redaction or deletion).
- May require interaction with PostgreSQL tables if PII is mirrored there.
- The `system_flags` table will store the PII retention period configuration.
  - _Technical Detail:_ The utility will read from `/users/{userId}/aiChats/{chatId}/messages`, `/gigs/{gigId}/chats/{chatId}/messages`, and `/adminChats/{chatId}/messages` in Firestore. It will write back to these collections to update `text` and `moderationStatus` fields (for redaction or flagging for deletion) or perform soft/hard deletes.
  - _Technical Detail:_ It will read the `chat_retention_months` value from the `system_flags` table in PostgreSQL. It might also interact with the `chat_messages` table in Postgres if chat summaries/references stored there contain PII, or the `escalated_issues` table if issue descriptions contain PII.

## Security Considerations

- The utility must run with appropriate, locked-down credentials that only grant necessary read and write permissions to the targeted data.
- Access to the utility's logs and configuration must be restricted to authorized personnel.
- Ensure the utility itself does not inadvertently log or store PII during processing. 