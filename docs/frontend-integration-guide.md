# Frontend Integration Guide (Next.js, Firebase Auth, Firestore, PostgreSQL/Drizzle)

This guide outlines the strategy for integrating the frontend of the Able AI platform with its backend services, primarily focusing on user authentication, role management, data fetching, and state management within a Next.js application.

## 1. Core Principles

*   **Clear Data Ownership:** Understand which database (Firestore or PostgreSQL) is the source of truth for different pieces of data.
*   **Role-Based Access Control (RBAC):** UI and data access should strictly adhere to the user's current role and permissions.
*   **API Contract Adherence:** Frontend API calls (to Next.js API routes interacting with PostgreSQL/Drizzle) must follow the defined API contract.
*   **Optimistic UI (Optional but Recommended):** For a smoother UX, consider optimistic UI updates for actions that are likely to succeed, with proper error handling for rollbacks.
*   **Reusable Components:** Maximize the use of shared UI components.
*   **Loading & Error States:** Implement clear loading indicators and user-friendly error messages for all data fetching and mutations.

## 2. Authentication & User Context

### 2.1. Authentication with Firebase Auth

*   **Client-Side Setup:** Use the Firebase client SDK (`firebase/auth`) for sign-up, sign-in, sign-out, password reset, and email verification.
*   **Session Management:** Firebase Auth handles client-side session persistence automatically.
*   **NextAuth.js (Optional but Recommended for Server-Side Context):**
    *   While Firebase client SDK manages client sessions, `next-auth` with its `FirebaseAdapter` (or a custom adapter for your PG user table) can be invaluable for:
        *   Easily accessing user session and token information in Next.js Server Components, API Routes, and Route Handlers (App Router).
        *   Managing custom claims on the Firebase ID token.
        *   Simplifying server-side protected routes.
    *   If not using `next-auth`, you'll need to manually verify Firebase ID tokens in your Next.js API routes/server actions.

### 2.2. User Context Hook (`useAuth` or via NextAuth's `useSession`)

This hook will be the primary way components access authentication status and core user information.

**Responsibilities:**

*   Provide the current Firebase Auth user object (`firebase.User`).
*   Provide loading state for authentication.
*   Provide custom claims from the ID token (e.g., `appRole`, `isActualBuyer`, `isActualGigWorker`). These claims should be set by a backend process (e.g., Firebase Function or API route) after the corresponding PostgreSQL user record is created/updated with these roles.
*   Provide the user's *currently selected operating role* (`currentActiveRole`: 'BUYER' or 'WORKER'). This should be fetched from the user's public profile in Firestore (`users/{userId}`).

**Implementation Sketch (if not using NextAuth's `useSession`):**

```javascript
// app/contexts/AuthContext.js (or similar)
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } // your Firebase instances

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [customClaims, setCustomClaims] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // Firestore public profile
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setFirebaseUser(user);
        const tokenResult = await getIdTokenResult(user);
        setCustomClaims(tokenResult.claims);

        // Listen to user's public profile in Firestore for currentActiveRole, etc.
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data());
          } else {
            setUserProfile(null); // Or handle profile creation
          }
          setLoading(false);
        });
        return () => unsubscribeProfile(); // Cleanup Firestore listener
      } else {
        setFirebaseUser(null);
        setCustomClaims(null);
        setUserProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribeAuth(); // Cleanup auth listener
  }, []);

  const value = {
    firebaseUser,
    userId: firebaseUser?.uid,
    isAuthenticated: !!firebaseUser,
    customClaims,
    appRole: customClaims?.appRole, // e.g., ADMIN, QA, USER
    isActualBuyer: customClaims?.isActualBuyer === true,
    isActualGigWorker: customClaims?.isActualGigWorker === true,
    currentActiveRole: userProfile?.currentActiveRole, // WORKER or BUYER
    userPublicProfile: userProfile,
    loadingAuth: loading,
    // Function to update currentActiveRole in Firestore
    setCurrentActiveRole: async (newRole) => {
        if (firebaseUser && (newRole === 'BUYER' || newRole === 'WORKER')) {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            try {
                await updateDoc(userDocRef, { currentActiveRole: newRole });
            } catch (error) {
                console.error("Error updating active role:", error);
            }
        }
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
```

**Note on Custom Claims:**
Custom claims (`appRole`, `isActualBuyer`, `isActualGigWorker`) are powerful for security rules and client-side role checks. They should be set:
1.  After a user registers and their PostgreSQL record (with `appRole`, and flags for having buyer/worker profiles) is created.
2.  Via a secure backend mechanism (e.g., a Next.js API route that calls Firebase Admin SDK's `setCustomUserClaims`).
3.  The client needs to refresh its ID token (`user.getIdToken(true)`) to see new claims.

## 3. Data Fetching Strategy

### 3.1. Public Data (Firestore)

*   **Direct Client-Side Fetching:** For most public data (user profiles, public gig listings, basic availability), the frontend can directly query Firestore using the Firebase client SDK.
*   **Real-time Listeners:** Utilize `onSnapshot` for data that needs to update in real-time (e.g., chat messages, gig status, notifications).
*   **Next.js Server Components (App Router):** Fetch Firestore data directly in Server Components for initial page loads where appropriate to improve SEO and reduce client-side waterfalls.
*   **Security Rules:** Firestore Security Rules are the primary line of defense for this data. Ensure they are robust and well-tested.

### 3.2. Private/Sensitive Data & Complex Queries (PostgreSQL via Next.js API Routes)

*   **Next.js API Routes (`app/api/...`):** Create dedicated API endpoints for fetching/mutating data stored in PostgreSQL.
    *   These routes will use Drizzle ORM to interact with the database.
    *   They **MUST** verify the user's Firebase ID token (passed in the `Authorization` header) and check app-specific roles/permissions from the PostgreSQL `Users` table before processing requests.
*   **Data Fetching Libraries:** Use `fetch` (native) or libraries like `SWR`/`React Query` on the client-side to call these API routes. These libraries offer caching, revalidation, etc.
*   **Scoped Data:**
    *   For role-specific data (e.g., a worker's private gig details, a buyer's payment history), the API route will use the authenticated `userId` (from the verified token) to scope the database query.
    *   Example: `/api/worker/gigs` would fetch gigs where `workerId` in PostgreSQL matches the authenticated user's ID.
*   **Server-Side Data Protection:** The server-side API route is responsible for ensuring a user (e.g., acting as a worker) cannot access data they aren't authorized for, even if the client tries to request it. The `userId` from the *verified token* is used for these checks, not any `userId` passed in the request body.

### 3.3. Fetching User-Specific Data for Views

*   **Settings View:**
    1.  **Auth Hook:** Get `firebaseUser.uid`.
    2.  **Firestore Call (Client-side or Server Component):** Fetch `users/{uid}` for public profile data (displayName, profileImage, currentActiveRole).
    3.  **API Call (Client-side to Next.js API Route):** Fetch `/api/users/settings` (protected route). This API route gets the UID from the token, then queries PostgreSQL for sensitive/detailed settings (e.g., full name from PG `Users` table, Stripe account status, notification preferences from PG).
*   **Role-Specific Dashboards (Buyer/Worker):**
    1.  **Auth Hook:** Determine `currentActiveRole`.
    2.  **Firestore Calls:** Fetch relevant public data for that role (e.g., if 'WORKER', fetch public worker profile details from `users/{uid}` or `workerProfiles/{uid}`).
    3.  **API Calls:** Fetch role-specific private or aggregated data from PostgreSQL via dedicated API routes (e.g., `/api/worker/earnings-summary`, `/api/buyer/booking-history`).

## 4. Specialized Frontend Contexts (Optional but useful for global state)

While Next.js App Router promotes co-locating state with components that need it (often fetched in Server Components), some global or cross-cutting concerns might benefit from React Context.

*   **`UserRoleDataContext` (Example):**
    *   Could hold data specific to the user's *current operating role* that is fetched once and used across many components within that role's views (e.g., detailed worker profile if in worker mode, buyer settings if in buyer mode).
    *   This data would typically be fetched from PostgreSQL via an API call when the role is activated or the relevant dashboard is loaded.
    *   **Provider:** Wrap sections of your app (e.g., the buyer dashboard, the worker dashboard) with this context provider.
    *   **Consumer:** Components within these sections can consume this context.
*   **`ChatContext`:**
    *   Manage active chat sessions, unread message counts (globally).
    *   Handle WebSocket/Firestore listener setup for chat.
*   **`NotificationContext`:**
    *   Manage unread notification counts.
    *   Handle WebSocket/Firestore listener setup for notifications.
*   **`PaymentContext` (Less likely global, more for payment flows):**
    *   Could manage state during a Stripe checkout flow if complex.

**Considerations for Contexts:**

*   **Avoid Overuse:** Don't put everything in context. Server Components and props drilling are often sufficient.
*   **Performance:** Large, frequently changing context values can lead to performance issues. Memoize context values.
*   **Alternative State Managers:** For very complex global state, consider Zustand or Jotai as they can offer better performance and more granular updates.

## 5. UI Logic Based on Role

*   **Conditional Rendering:** Use `appRole` (from custom claims) and `currentActiveRole` (from Firestore via `useAuth`) to conditionally render UI elements, navigation links, and entire sections of pages.
    ```javascript
    const { appRole, currentActiveRole, isActualBuyer, isActualGigWorker } = useAuth();

    // Show admin link
    { (appRole === 'ADMIN' || appRole === 'SUPER_ADMIN') && <AdminLink /> }

    // Show components based on current operating role
    { currentActiveRole === 'BUYER' && <BuyerDashboardSpecifics /> }
    { currentActiveRole === 'WORKER' && <WorkerDashboardSpecifics /> }

    // Enable "Switch to Buyer" only if they *can* be a buyer
    { isActualBuyer && <SwitchRoleButton targetRole="BUYER" /> }
    ```
*   **Layouts:** Next.js layouts can be used to provide different structural UIs for `/admin`, `/buyer`, `/worker` route groups.

## 6. API Error Handling

*   Standardize API error responses from Next.js API routes.
*   Implement a global error handler or use `SWR`/`React Query`'s error handling capabilities to display user-friendly messages.

## 7. Workflow Example: Buyer Hires Worker

1.  **Buyer UI (in 'BUYER' `currentActiveRole`):**
    *   Displays worker profiles (public data from Firestore).
    *   Buyer clicks "Hire" on a worker.
2.  **Frontend Action:**
    *   Collects gig details (date, time, specific needs).
    *   Sends a request to a Next.js API Route: `POST /api/gigs/create`. The request includes the gig details and is authenticated with the buyer's Firebase ID token.
3.  **Next.js API Route (`/api/gigs/create`):**
    *   Verifies Firebase ID token. Gets buyer's `userId`.
    *   Checks if the user is an `isActualBuyer` and has `appRole` that allows hiring (if such specific app roles exist in PG beyond just being a "USER").
    *   Performs business logic (e.g., check worker availability against PostgreSQL `GigWorkerProfiles.availabilityJson`).
    *   Creates a `Gigs` record in PostgreSQL (Drizzle) with `statusInternal = 'PENDING_WORKER_ACCEPTANCE'`, linking buyer and (potentially initially null) worker.
    *   Creates/updates a corresponding public gig document in Firestore's `gigs` collection with `status = 'PENDING_WORKER_ACCEPTANCE'`.
    *   (Optionally) Creates a `gigOffers` document in Firestore.
    *   Triggers a notification (FCM via Firebase Functions or backend) to the targeted worker (`SVR-S08`).
    *   Returns a success/error response to the frontend.
4.  **Frontend Update:**
    *   Shows confirmation or error message.
    *   The worker's UI (listening to Firestore `gigOffers` or `notifications`) will update in real-time.
