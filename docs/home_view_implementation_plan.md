# Home View Implementation Plan

## 1. Project Setup and Component Structure:

*   Confirm the existence of the following directories:
    *   `app/components/shared/`
    *   `app/hooks/`
*   Create the following files if they don't exist:
    *   `app/components/shared/AiSuggestionBanner.jsx`
    *   `app/components/shared/AiSuggestionBanner.module.css`
    *   `app/components/shared/IconGrid.jsx`
    *   `app/components/shared/IconGrid.module.css`
    *   `app/components/shared/ReferralBanner.jsx`
    *   `app/components/shared/ReferralBanner.module.css`
    *   `app/components/shared/RoleToggle.jsx`
    *   `app/components/shared/RoleToggle.module.css`
    *   `app/components/shared/SettingsButton.jsx`
    *   `app/components/shared/SettingsButton.module.css`
    *   `app/hooks/useAppContext.ts`
*   Populate these files with the code provided in the initial task description.

## 2. Implement Shared Components:

*   Implement the `AiSuggestionBanner`, `IconGrid`, `ReferralBanner`, `RoleToggle`, and `SettingsButton` components in their respective files, using the provided code.
*   Pay close attention to the CSS module styles and ensure they are correctly applied.
*   Ensure the `RoleToggle` component correctly uses the `useAppContext` hook to manage the user's role and navigation.

## 3. Implement Buyer Home View (`app/user/[userId]/buyer/page.tsx`):

*   Create the file `app/user/[userId]/buyer/page.tsx`.
*   Implement the Buyer home view using the provided code as a template.
*   Replace the placeholder content with the specific content for the Buyer role, as described in the initial task description.
*   Ensure the `actionItems` array is populated with the correct links and icons for the Buyer role.
*   Implement the `handleReferralClick` function.
*   Implement the optional "Upcoming Gigs Summary" section, fetching data from an API endpoint (this will be a placeholder for now).
*   Create a CSS module file `app/user/[userId]/buyer/HomePage.module.css` and add the styles from the provided `HomePage.module.css` content.

## 4. Implement Worker Home View (`app/user/[userId]/worker/page.tsx`):

*   Create the file `app/user/[userId]/worker/page.tsx`.
*   Implement the Worker home view using the provided code as a template.
*   Replace the placeholder content with the specific content for the Worker role, as described in the initial task description.
*   Ensure the `actionItems` array is populated with the correct links and icons for the Worker role.
*   Implement the `handleReferralClick` function.
*   Implement the optional "Active/Upcoming Gig Summary" section, fetching data from an API endpoint (this will be a placeholder for now).
*   Create a CSS module file `app/user/[userId]/worker/HomePage.module.css` and add the styles from the provided `HomePage.module.css` content.

## 5. Update `useAppContext` Hook:

*   Ensure the `useAppContext` hook is correctly implemented, using the provided code.
*   Verify that it correctly fetches user data, manages authentication, and determines the user's role.
*   Implement the `updateUserContext` function to update the user's context in the backend.

## 6. Route Protection:

*   Implement route protection using Next.js Middleware to verify authentication and `currentActiveRole` before rendering the page. This will ensure that users are redirected to the correct dashboard based on their role and authentication status.

## 7. Testing:

*   Thoroughly test both the Buyer and Worker home views to ensure they are functioning correctly.
*   Verify that the navigation links are working, the content is displayed correctly, and the `RoleToggle` component is switching roles as expected.

## Mermaid Diagram:

```mermaid
graph LR
    A[Project Setup] --> B(Implement Shared Components);
    B --> C{Implement Buyer Home View};
    B --> D{Implement Worker Home View};
    C --> E(Update useAppContext Hook);
    D --> E;
    E --> F(Route Protection);
    F --> G(Testing);