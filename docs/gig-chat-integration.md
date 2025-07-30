# Gig Chat Integration Guide

This document explains how to integrate the `/gigs/[gigId]/chat` view with your backend and authentication system to enable real-time messaging between buyers and workers.

---

## 1. Overview
The chat page is designed to be accessible by both the buyer and worker associated with a gig. It currently uses local state for messages and does not persist or fetch messages from a backend.

---

## 2. Integration Steps

### 2.1. Authentication & User Role
- Use your authentication context (e.g., `useAppContext`) to get the current user's ID and role (BUYER or WORKER).
- Pass the correct `senderId` and `senderRole` when sending messages.
- Ensure only the buyer and worker for the gig can access the chat page. Redirect or show an error if unauthorized.

### 2.2. Backend Data Model
- Store chat messages in your backend (e.g., Firestore, PostgreSQL, etc.).
- Example message structure:
  ```ts
  interface ChatMessage {
    id: string;
    gigId: string;
    senderId: string;
    senderRole: 'BUYER' | 'WORKER';
    message: string;
    timestamp: number;
  }
  ```
- Use `gigId` to fetch/send messages for the correct gig.

### 2.3. Fetching Messages
- On page load, fetch all messages for the current `gigId` from the backend.
- (Optional) Implement real-time updates using Firestore's `onSnapshot`, WebSockets, or polling.
- Update the `messages` state with fetched data.

### 2.4. Sending Messages
- When a user sends a message, write it to the backend (e.g., Firestore `addDoc`, REST API, etc.).
- Optimistically update the UI for instant feedback.

### 2.5. Real-Time Updates
- For real-time chat, subscribe to message updates (e.g., Firestore `onSnapshot`, WebSocket events).
- Update the message list as new messages arrive.

### 2.6. Authorization
- On the backend, verify that the user sending or fetching messages is either the buyer or worker for the gig.
- Reject unauthorized requests.

---

## 3. Example Integration (Firestore)

- **Fetching messages:**
  ```ts
  import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
  // ...
  useEffect(() => {
    const q = query(
      collection(db, 'gigChats'),
      where('gigId', '==', gigId),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => doc.data() as ChatMessage));
    });
    return unsubscribe;
  }, [gigId]);
  ```

- **Sending a message:**
  ```ts
  import { addDoc, collection } from 'firebase/firestore';
  // ...
  await addDoc(collection(db, 'gigChats'), {
    gigId,
    senderId: user.uid,
    senderRole: userRole,
    message: input,
    timestamp: Date.now(),
  });
  ```

---

## 4. UI Enhancements
- Show sender name, avatar, and timestamp for each message.
- Support file/image attachments if needed.
- Show loading and error states.

---

## 5. Security & Privacy
- Ensure only authorized users (buyer/worker for the gig) can read/write messages.
- Sanitize and validate all message content.

---

## 6. Next Steps
- Implement backend integration as described above.
- Add tests for chat functionality and authorization.
- Enhance the UI/UX as needed.

---

For questions or further help, see the code in `app/gigs/[gigId]/chat/page.tsx` and the onboarding chat components in `app/components/onboarding/`. 