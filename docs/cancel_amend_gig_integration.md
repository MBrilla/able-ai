# Cancel or Amend Gig Details Page Integration

This document outlines the integration details for the `CancelOrAmendGigDetailsPage` component located at `app/gigs/[gigId]/amend/[amendId]/page.tsx`.

## Purpose

This page allows users (both buyers and gig workers) to view the details of a specific gig amendment request and propose changes or cancel the request. The UI and editable fields are adapted based on the user's role.

## Location and Routing

The page component is located at `app/gigs/[gigId]/amend/[amendId]/page.tsx`. This is a dynamic route in Next.js, meaning the `[gigId]` and `[amendId]` segments in the path are parameters that will be available to the component via the `params` prop.

To access this page, you must navigate to a URL following the pattern `/gigs/<gigId>/amend/<amendId>`, where `<gigId>` is the unique identifier for the gig and `<amendId>` is the unique identifier for the amendment request.

Example URL: `/gigs/12345/amend/abcdef`

## User Role Adaptation

The page uses the `useAppContext` hook to determine if the current user is a buyer (`isBuyerMode`) or a gig worker (`isWorkerMode`). This information is used to conditionally disable or enable specific input fields in the "Updated gig details" section when it is in edit mode.

- **Buyers:** Can edit most details (Location, Date, Time, Pay per hour).
- **Gig Workers:** Can primarily edit the Time field. Location, Date, and Pay per hour are disabled.
- The Total Pay field is always disabled as it is expected to be a calculated value.

## Editable Gig Details Section

The "Updated gig details" section has two states:

1.  **Read-Only Mode (Default):** Displays the current gig details as static text.
2.  **Edit Mode:** Activated by clicking the pen (`Edit3`) icon. This transforms the static details into input fields, allowing the user to propose changes according to their role permissions.

Clicking the pen icon toggles between these two modes.

## Submitting Changes

The page includes a textarea for the user to provide a message (e.g., explaining the requested changes) and a "Submit for Confirmation" button.

When the submit button is clicked:

- The `handleSubmit` function is triggered.
- It currently logs the user's message and the `editedGigDetails` state.
- **TODO:** This function needs to be updated to make an API call to the backend. The API endpoint should receive the `gigId`, `amendId`, the `userMessage`, and the `editedGigDetails` object to process the amendment request.

## Integration Steps

1.  **Navigation:** Implement navigation from relevant parts of your application (e.g., a list of amendments or a gig details page) to the `/gigs/<gigId>/amend/<amendId>` URL, passing the correct `gigId` and `amendId` as parameters.
2.  **API Endpoint:** Create a backend API endpoint (e.g., `/api/gigs/amend/<gigId>/<amendId>`) to handle the POST request from the `handleSubmit` function.
3.  **Backend Logic:** Implement the backend logic to receive the proposed changes, validate them based on the user's role (which should also be verified on the backend for security), update the gig/amendment data in your database, and potentially trigger notifications or a review process.
4.  **Data Fetching:** Replace the mock `gigDetailsData` with actual data fetched from your backend when the page loads. This data should be specific to the `gigId` and `amendId` from the URL parameters.
5.  **Loading and Error States:** Add loading indicators and error handling for data fetching and the submission process.
6.  **Input Validation:** Implement client-side and server-side validation for the input fields in the edit form.

This document provides a guide for integrating the `CancelOrAmendGigDetailsPage` into the application flow. 