# Confirm Amended Gig Details Page - Integration Guide

This document outlines the steps required to integrate the `ConfirmAmendedGigDetailsPage` component located at `app/gigs/[gigId]/amends/[amendId]/review/page.tsx` with the backend API and replace the mock data with real data.

## 1. Fetching Gig Amendment Data

- The component currently uses mock data (`buyerGigDetailsData`, `workerGigDetailsData`, `buyerNotificationMessage`, `workerNotificationMessage`).
- You will need to fetch the actual gig amendment details from your backend API.
- The API endpoint should likely take `gigId` and `amendId` as parameters, which are available from the URL path. In Next.js App Router, these can be accessed via `params` in the page component props.
- You should implement data fetching, preferably using a library like `react-query` or Next.js's built-in data fetching mechanisms (e.g., `fetch` in a Server Component if possible, or a Client Component with `useEffect` and state).
- The fetched data structure should match or be mapped to the structure currently used by the mock data for both buyer and worker views.

```typescript
// Example (Conceptual, adjust based on your data fetching strategy and API response)
import { useParams } from 'next/navigation'; // If fetching in Client Component
// ... other imports ...

export default function ConfirmAmendedGigDetailsPage() {
  const { gigId, amendId } = useParams(); // Access path parameters
  const { isBuyerMode, isWorkerMode } = useAppContext();

  // State to hold fetched data
  // const [gigAmendmentData, setGigAmendmentData] = useState(null);
  // const [isLoading, setIsLoading] = useState(true);

  // Fetch data effect (example for Client Component)
  // useEffect(() => {
  //   const fetchData = async () => {
  //     try {
  //       // Replace with your actual API call
  //       const response = await fetch(`/api/gigs/${gigId}/amends/${amendId}`);
  //       if (!response.ok) throw new Error('Failed to fetch amendment details');
  //       const data = await response.json();
  //       setGigAmendmentData(data);
  //     } catch (error) {
  //       console.error('Error fetching gig amendment data:', error);
  //       // Handle error (e.g., show error message)
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };

  //   if (gigId && amendId) {
  //     fetchData();
  //   }
  // }, [gigId, amendId]); // Rerun effect if IDs change

  // Conditional data based on role and fetched data
  // const currentGigDetails = isBuyerMode ? (gigAmendmentData?.buyerDetails || buyerGigDetailsData) : (gigAmendmentData?.workerDetails || workerGigDetailsData);
  // const currentNotification = isBuyerMode ? (gigAmendmentData?.buyerNotification || buyerNotificationMessage) : (gigAmendmentData?.workerNotification || workerNotificationMessage);

  // ... rest of component using currentGigDetails and currentNotification
}
```

## 2. Implementing Action Button Logic

The component has placeholder functions (`handleConfirm`, `handleSuggestNew`, `handleDecline`). These need to be connected to backend API calls or navigation.

-   **`handleConfirm`:**
    -   This function should trigger an API call to confirm the amended gig details.
    -   The API likely needs the `gigId`, `amendId`, and potentially the user's confirmation.
    -   After a successful API call, handle the response (e.g., show a success message, navigate the user to another page, like the gig details page).
    -   Handle potential errors from the API call (e.g., show an error message to the user).

    ```typescript
    const handleConfirm = async () => {
      console.log("Confirm changes clicked");
      // try {
      //   // Replace with your actual API call
      //   const response = await fetch(`/api/gigs/${gigId}/amends/${amendId}/confirm`, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ userId: user.uid, role: isBuyerMode ? 'buyer' : 'worker' }), // Example payload
      //   });
      //   if (!response.ok) throw new Error('Failed to confirm changes');
      //   // Handle success (e.g., show success toast, navigate)
      //   console.log('Changes confirmed!');
      //   // router.push(`/gigs/${gigId}`); // Example navigation
      // } catch (error) {
      //   console.error("Error confirming changes:", error);
      //   // Handle error (e.g., show error toast)
      // }
    };
    ```

-   **`handleSuggestNew` (Buyer View Only):**
    -   This function should likely navigate the buyer to a different view or open a modal where they can propose alternative amendments.
    -   This might involve passing the current gig and amendment details to the next view/modal.

    ```typescript
    const handleSuggestNew = () => {
      console.log("Suggest new changes clicked");
      // Implement navigation or modal logic
      // router.push(`/gigs/${gigId}/amend/${amendId}/suggest`); // Example navigation to a suggestion page
    };
    ```

-   **`handleDecline` (Buyer View Only):**
    -   This function should trigger an API call to decline the proposed amendment.
    -   Similar to `handleConfirm`, handle the API response and potential errors.
    -   After declining, the user should likely be directed elsewhere (e.g., back to the original gig details page, or a page explaining the decline).

    ```typescript
    const handleDecline = async () => {
      console.log("Decline changes clicked");
      // try {
      //   // Replace with your actual API call
      //   const response = await fetch(`/api/gigs/${gigId}/amends/${amendId}/decline`, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ userId: user.uid }), // Example payload
      //   });
      //   if (!response.ok) throw new Error('Failed to decline changes');
      //   // Handle success (e.g., show success toast, navigate)
      //   console.log('Changes declined.');
      //   // router.push(`/gigs/${gigId}`); // Example navigation
      // } catch (error) {
      //   console.error("Error declining changes:", error);
      //   // Handle error (e.g., show error toast)
      // }
    };
    ```

-   **Chat Icon Click (Buyer View Only):**
    -   The `onClick` handler for the `MessageSquare` icon should navigate the user to the chat or messaging view associated with this gig/amendment.
    -   This might involve passing the relevant gig or conversation ID to the chat route.

    ```typescript
    onClick={() => {
      console.log("Chat icon clicked");
      // Implement navigation to chat view
      // router.push(`/chat/${conversationId}`); // Example navigation
    }}
    ```

## 3. Handling Loading and Error States

- When fetching data, the component should handle loading states (e.g., show a spinner) and error states (e.g., display an error message).
- The action buttons should likely be disabled while API calls are in progress.

## 4. Refactoring and Prop Usage

- As the component grows and data fetching is added, consider passing the fetched data and handler functions as props if this component becomes part of a larger page structure or is reused.
- For now, fetching data and defining handlers directly within `page.tsx` is acceptable for a page-level component.

By following these steps, you can transition the `ConfirmAmendedGigDetailsPage` from using mock data to displaying and interacting with real gig amendment information. 