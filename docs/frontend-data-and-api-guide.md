# Able AI: Frontend Data & API Integration Guide

**Version:** 1.0
**Last Updated:** [Current Date]

## 1. Introduction

Welcome to the Able AI frontend development guide! This document outlines the strategies and conventions for integrating the Next.js frontend application with our backend services, which include Firebase (Firestore for public/real-time data, Firebase Authentication) and a PostgreSQL database (via Next.js API Routes using Drizzle ORM for private/transactional data).

**Key Objectives of this Guide:**

*   Provide a clear understanding of where different types of data reside.
*   Explain how to authenticate users and manage their context (roles).
*   Detail how to fetch and mutate data from both Firestore and our backend APIs.
*   Ensure consistent and secure data handling practices.

**Prerequisites:** Familiarity with Next.js (App Router), React, Firebase (Auth & Firestore), and general concepts of API interaction.

**Core Reference Documents (Assumed to Exist - Please Consult):**

*   **`docs/api-contract.md` (or Swagger/OpenAPI Link):** Defines all Next.js API endpoints that interact with the PostgreSQL database. This is your source of truth for request/response shapes for these APIs.
*   **`docs/firestore-data-models.md`:** Details the intended structure of collections and documents within Firestore.
*   **`firestore.rules`:** Defines security and access control for direct Firestore database access from the client.
*   **`app/lib/drizzle/schema/*`:** Contains the Drizzle ORM schemas defining our PostgreSQL tables.
*   **`app/hooks/useAppContext.ts` (or `useAuth.ts` / `useSession.ts`):** The primary hook for accessing user authentication and role context.
*   **`app/styles/global.css`:** Contains global CSS variables for theming.

## 2. Authentication & User Context

User authentication is handled by **Firebase Authentication**. The primary way to access user state and role information in components is through the `useAppContext` hook (see `app/hooks/useAppContext.ts`).

### 2.1. `useAppContext` Hook

This hook provides the following key properties:

*   `firebaseUser: firebase.User | null`: The current Firebase Auth user object, or `null` if not authenticated.
*   `userId: string | null`: The Firebase UID of the authenticated user.
*   `isAuthenticated: boolean`: True if a user is currently authenticated.
*   `customClaims: object | null`: Custom claims set on the user's Firebase ID token. These are critical for role-based logic.
    *   `appRole: 'ADMIN' | 'QA' | 'USER' | undefined`: The user's global application role (primarily for admin panel access). Set via backend after PostgreSQL user record creation/update.
    *   `isActualBuyer: boolean | undefined`: True if the user has completed buyer profile setup in PostgreSQL. Set via backend.
    *   `isActualGigWorker: boolean | undefined`: True if the user has completed worker profile setup in PostgreSQL. Set via backend.
*   `currentActiveRole: 'BUYER' | 'WORKER' | undefined`: The role the user is *currently operating as* in the web app. This is fetched from their public profile in Firestore (`users/{userId}/currentActiveRole`).
*   `userPublicProfile: object | null`: The user's public profile data fetched from Firestore (`users/{userId}`).
*   `loadingAuth: boolean`: True while the authentication state is being initialized.
*   `setCurrentActiveRole: (newRole: 'BUYER' | 'WORKER') => Promise<void>`: A function to update the user's `currentActiveRole` in their Firestore public profile. This typically involves a call to an API route like `POST /api/users/update-context` or a direct Firestore update if rules allow.

**Example Usage:**

```javascript
import { useAppContext } from '@/app/hooks/useAppContext'; // Adjust path as needed

function MyComponent() {
  const { isAuthenticated, userId, currentActiveRole, appRole, loadingAuth } = useAppContext();

  if (loadingAuth) return <p>Loading authentication...</p>;
  if (!isAuthenticated) return <p>Please log in.</p>;

  return (
    <div>
      <p>User ID: {userId}</p>
      <p>Operating as: {currentActiveRole}</p>
      {appRole === 'ADMIN' && <p>Admin controls visible!</p>}
      {/* ... more UI based on roles ... */}
    </div>
  );
}
```

### 2.2. Switching Operating Role (`currentActiveRole`)

Users who are both a buyer and a worker (`isActualBuyer === true && isActualGigWorker === true`) can switch their operating context.
Use the `setCurrentActiveRole` function from `useAppContext`. This will update the `currentActiveRole` field in the user's public Firestore document (`users/{userId}`).

```javascript
const { setCurrentActiveRole, isActualBuyer, isActualGigWorker } = useAppContext();

// ...
if (isActualBuyer && isActualGigWorker) {
  <button onClick={() => setCurrentActiveRole('BUYER')}>Switch to Buyer Mode</button>
  <button onClick={() => setCurrentActiveRole('WORKER')}>Switch to Worker Mode</button>
}
```
The `RoleToggle.tsx` component in shared components likely handles this.

## 3. Data Fetching Strategy

### 3.1. Firestore (Public & Real-time Data)

Direct client-side interaction with Firestore is used for publicly accessible data and features requiring real-time updates.

*   **Key Collections (Refer to `docs/firestore-data-models.md` for full structures):**
    *   `users/{userId}`: Public user profiles (display name, profile image, `currentActiveRole`, denormalized ratings/gig counts, worker public bio, etc.).
    *   `gigs/{gigId}`: Public gig details (title, public description, status, public location, buyer/worker display info once assigned).
    *   `gigOffers/{offerId}`: For managing explicit offers before a gig is fully formed.
    *   `gigs/{gigId}/messages/{messageId}` (or `chats/{chatId}/messages`): Real-time chat messages.
    *   `users/{userId}/notifications/{notificationId}`: Real-time user notifications.
    *   `public_reviews/{reviewId}`: Publicly viewable, moderated reviews (read-only for clients).
    *   `badge_definitions/{badgeDefId}`: Definitions of available badges (read-only for clients).
*   **Fetching Data:**
    *   **One-time reads:** Use `getDoc` or `getDocs` from the Firebase SDK.
    *   **Real-time updates:** Use `onSnapshot` to listen for changes.
    *   **Server Components (Next.js App Router):** You can fetch initial Firestore data in Server Components to improve performance and SEO.
*   **Writing Data:**
    *   Use `setDoc`, `addDoc`, `updateDoc`, `deleteDoc`.
    *   **All client-side writes to Firestore are subject to `firestore.rules`.** Ensure your operations are permitted.
*   **Example (Fetching public user profile):**

    ```javascript
    import { doc, getDoc } from 'firebase/firestore';
    import { db } from '@/app/lib/firebase/config'; // Your Firebase config

    async function getUserPublicProfile(userId) {
      const userDocRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    }
    ```

### 3.2. PostgreSQL/Drizzle (via Next.js API Routes - Private/Transactional Data)

For sensitive data, complex business logic, financial transactions, and admin operations, the frontend will communicate with Next.js API Routes. These routes use Drizzle ORM to interact with our PostgreSQL database.

*   **API Contract:** **The primary reference for these endpoints is `docs/api-contract.md` (or your Swagger/OpenAPI documentation).** It details:
    *   Endpoint URLs (e.g., `/api/gigs/create`, `/api/users/settings`, `/api/payments/initiate`).
    *   HTTP Methods (GET, POST, PUT, DELETE).
    *   Required Authentication (Firebase ID Token in `Authorization: Bearer <token>`).
    *   Request body schemas.
    *   Response schemas (success and error).
*   **Fetching Data (Client-Side):**
    *   Use `fetch` or a data-fetching library like SWR or React Query.
    *   Always include the Firebase ID token in the `Authorization` header.

    ```javascript
    // Example: Fetching private user settings
    async function fetchUserSettings(idToken) {
      const response = await fetch('/api/users/settings', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user settings');
      }
      return response.json();
    }
    ```
*   **Mutating Data (Client-Side):**
    *   Use `fetch` with appropriate methods (POST, PUT, DELETE).
    *   Include the ID token and a JSON body if required by the API contract.

    ```javascript
    // Example: Updating user settings
    async function updateUserSettings(idToken, settingsData) {
      const response = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update settings');
      }
      return response.json();
    }
    ```
*   **Server-Side Data Scoping:** Backend API routes use the `userId` extracted from the *verified Firebase ID token* to scope database queries. This ensures users can only access/modify their own data or data they are permitted to see based on their role (e.g., an admin accessing other users' data as per PG permissions).

## 4. Role-Based UI & Data Presentation

Use the values from `useAppContext` hook (`appRole`, `currentActiveRole`, `isActualBuyer`, `isActualGigWorker`) to:

*   **Conditionally Render Components:** Show/hide UI elements, sections, or navigation links.
*   **Adapt Views:** Display different data or actions based on the user's context.
*   **Protect Routes/Pages:** Next.js Middleware can be used in conjunction with `useAppContext` (or server-side session checks) to protect routes that require specific roles.

**Example:**

```javascript
const { currentActiveRole, isActualGigWorker } = useAppContext();

// In a worker's dashboard
{currentActiveRole === 'WORKER' && isActualGigWorker && (
  <WorkerSpecificSection />
)}

// In a navigation menu
{isActualBuyer && (
  <Link href="/buyer/dashboard">Buyer Dashboard</Link>
)}
```

## 5. Styling

*   Refer to **`app/styles/global.css`** for global CSS variables (theme colors, fonts, spacing).
*   Use **CSS Modules** for component-level styling to ensure encapsulation.
*   Shared components (from `app/components/shared/`) should have their own well-defined styles and prop interfaces.

## 6. Real-time Updates

*   **Firestore Listeners (`onSnapshot`):** Primary mechanism for real-time UI updates for data stored in Firestore (e.g., chat, notifications, gig status changes).
*   **Socket.IO (If Implemented):** For specific server-initiated pushes that don't fit the Firestore model well, refer to documentation on available Socket.IO events and how to connect (details to be added if this becomes a core part of real-time strategy beyond Firestore).

## 7. State Management

*   **Local Component State (`useState`, `useReducer`):** For state confined to a single component or a small part of the component tree.
*   **Next.js Server Components:** Fetch data on the server; state is inherently managed by the request-response cycle for initial loads.
*   **React Context (`useAppContext` and potentially others):** For global state like authentication, user roles, and potentially widely shared application settings or data (e.g., `ChatContext`, `NotificationContext`).
*   **URL State:** For filters, pagination, and shareable view states.
*   **Data Fetching Libraries (SWR, React Query):** Manage server state (caching, revalidation, optimistic updates) for data fetched from your Next.js API routes.

## 8. Error Handling

*   **API Responses:** Expect standardized error responses from Next.js API routes (as defined in `docs/api-contract.md`). Typically include a `message` field.
*   **UI Feedback:** Provide clear, user-friendly error messages. Avoid exposing raw technical errors to the user.
*   **Global Error Boundary (Next.js):** Implement a root error boundary (`app/error.js` or `app/global-error.js`) for unhandled exceptions.

## 9. Key Data Flows (Examples - Refer to Full System Design for Details)

*   **User Onboarding:** Involves Firebase Auth, client-side updates to Firestore (`users/{uid}`), and API calls to `/api/users/onboard` (or similar) to create corresponding PostgreSQL records and set custom claims.
*   **Gig Creation (Buyer):** UI collects data -> API call to `/api/gigs/create` (writes to PG) -> Backend (or client via rules) creates/updates public gig doc in Firestore -> FCM notification to potential workers.
*   **Viewing a Gig:** Public details from Firestore. Sensitive/internal details via an API call if needed.

