# Plan for `app/user/[userId]/settings/page.tsx` Update

## Project Goal:
Enhance the user settings page (`app/user/[userId]/settings/page.tsx`) to include new features like Stripe integration prompts/management, a structured layout with distinct sections, and a reusable toggle switch component.

## Completed Frontend Implementation:

1.  **Created the `SwitchControl` Component:**
    *   Created the directory `app/components/shared/`.
    *   Created the file `app/components/shared/SwitchControl.jsx` with the provided JSX content.
    *   Created the file `app/components/shared/SwitchControl.module.css` with the provided CSS content.
    *   (Note: Ensure Radix UI Switch is installed: `npm install @radix-ui/react-switch`)

2.  **Created Settings Page CSS:**
    *   Created the file `app/user/[userId]/settings/SettingsPage.module.css` with the provided CSS content.

3.  **Updated the Settings Page Component (`app/user/[userId]/settings/page.tsx`):**
    *   Corrected import paths for `useAppContext`, `firebaseClientApp`, `InputField`, and `SwitchControl`.
    *   Added imports for necessary Lucide icons.
    *   Updated the `UserSettingsData` interface to include `phone`, `stripeAccountId`, `stripeAccountStatus`, `canReceivePayouts`, and `privacySettings`.
    *   Added state variables for Stripe integration, account deletion, privacy settings, and phone number.
    *   Updated the settings fetching logic to include mock data for the new fields.
    *   Implemented placeholder functions for `handleStripeConnect`, `handleManageStripeAccount`, `handleDeleteAccountConfirmed`, and `handleProfileVisibilityChange`.
    *   Updated the JSX structure to include:
        *   Descriptive text below the header.
        *   A phone number field in the "Profile Information" section.
        *   The email field is disabled.
        *   The SMS notification option is commented out.
        *   Inline Stripe prompt/status banner logic.
        *   "Payment Settings" section with a link to manage Stripe or a prompt to connect.
        *   "Privacy Settings" section with a profile visibility toggle using `SwitchControl`.
        *   "Community & Legal" section.
        *   Updated "Actions Section" with Logout and Delete Account buttons.
        *   Basic modal structure for the "Delete Account" confirmation.

## Next Steps:

1.  **Implement Backend API Endpoints:**
    *   `GET /api/users/settings`: Modify to fetch and return `displayName`, `email`, `phone`, Stripe-related fields (`stripeAccountId`, `stripeAccountStatus`, `canReceivePayouts`), and `privacySettings` from the database (PostgreSQL and potentially Firestore).
    *   `PUT /api/users/profile`: Implement to update `displayName` and `phone` in the database.
    *   `PUT /api/users/notification-preferences`: Implement to update email notification preferences in the database.
    *   `PUT /api/users/privacy-settings`: Implement to update privacy settings (e.g., `profileVisibility`) in the database.
    *   `POST /api/stripe/create-connect-account`: Implement to create a Stripe Connect Account for the user (if they don't have one) and generate a Stripe Account Link for onboarding. Return the URL to the frontend.
    *   `POST /api/stripe/create-portal-session`: Implement to retrieve the user's Stripe Account ID and create a Stripe portal session URL for managing their account. Return the URL to the frontend.
    *   `DELETE /api/users/account`: Implement to safely delete the user's account from Firebase Auth, PostgreSQL, and potentially other services like Firestore and Stripe Connect.

2.  **Refine Stripe Integration UI/UX:**
    *   Implement the Stripe notice using a modal or inline banner as decided. The current frontend code includes the inline banner logic.
    *   Consider using a headless toast library like Sonner for displaying success/error messages related to API calls, as suggested. This would involve installing the library and integrating it into the component.

3.  **Implement Account Security Actions:**
    *   Ensure the `handleChangePassword` and `handleForgotPassword` functions are fully connected to Firebase Authentication and handle re-authentication if necessary for password changes.

4.  **Add More Privacy Settings:**
    *   Expand the "Privacy Settings" section with additional toggles or options as needed (e.g., data sharing preferences).

5.  **Integrate with App Context/State Management:**
    *   Ensure that successful updates to profile, notifications, and privacy settings trigger necessary updates in the `useAppContext` or relevant global state to keep the UI consistent across the application.

## Conceptual Flow (Updated):

```mermaid
graph TD
    A[User visits Settings Page] --> B{Is Authenticated & Correct User?};
    B -- Yes --> C[Fetch User Settings (incl. Stripe Status, Phone, Privacy) from API];
    C --> D{Loading Complete?};
    D -- Yes --> E[Render Settings Page];
    E --> F{Is User a Worker AND Stripe Not Connected?};
    F -- Yes --> G[Show Inline Stripe Prompt];
    F -- No --> H[Show Stripe Status/Manage Link];
    E --> I[Render Profile Section (incl. Phone, Disabled Email)];
    E --> J[Render Notification Section (Email only)];
    E --> K[Render Security Section];
    E --> L[Render Privacy Section (incl. Profile Visibility Toggle)];
    E --> M[Render Community & Legal Section];
    E --> N[Render Actions Section (Logout, Delete)];
    G -- Click Connect --> O[Call POST /api/stripe/create-connect-account];
    O --> P{API Success?};
    P -- Yes --> Q[Redirect to Stripe Onboarding URL];
    H -- Click Manage --> R[Call POST /api/stripe/create-portal-session];
    R --> S{API Success?};
    S -- Yes --> T[Redirect to Stripe Portal URL];
    N -- Click Delete --> U[Show Delete Account Modal];
    U -- Confirm --> V[Call DELETE /api/users/account];
    V -- Yes --> X[Logout & Redirect to Signin];
    I -- Save Profile --> Y[Call PUT /api/users/profile];
    J -- Save Notifications --> Z[Call PUT /api/users/notification-preferences];
    L -- Toggle Privacy --> AA[Call PUT /api/users/privacy-settings];
    K -- Change Password --> AB[Call Firebase updatePassword];
    K -- Forgot Password --> AC[Call Firebase sendPasswordResetEmail];
    N -- Logout --> AD[Call Firebase signOut & NextAuth signOut];
    B -- No --> AE[Redirect to Signin];
    D -- No --> AF[Show Loading State];