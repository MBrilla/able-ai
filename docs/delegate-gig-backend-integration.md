# Delegate Gig Page Backend Integration

This document outlines the steps required to integrate the frontend "Delegate Gig" page (`app/gigs/[gigId]/delegate/page.tsx`) with the backend services.

## Current State

The frontend component currently uses mock asynchronous functions (`fetchPotentialDelegates` and `delegateGigToWorkerAPI`) to simulate fetching potential workers and performing the delegation. These functions introduce artificial delays and return static or simulated data.

## Integration Steps

To fully integrate the page, the following mock functions need to be replaced with actual API calls to your backend endpoints:

### 1. Replace `fetchPotentialDelegates`

This function is responsible for fetching the list of workers that a gig can be delegated to, potentially filtered by a search term.

-   **Mock Function Signature:**
    ```typescript
    async function fetchPotentialDelegates(searchTerm: string): Promise<Worker[]>
    ```

-   **Action Required:**
    Replace the implementation of `fetchPotentialDelegates` with a call to your backend API.

    -   Identify or define the backend endpoint for fetching potential delegates (e.g., `/api/gigs/{gigId}/potential-delegates?search={searchTerm}`).
    -   Implement the `fetch` or use a data fetching library (like `axios`, `react-query`, etc.) to call this endpoint.
    -   Pass the `searchTerm` from the input field as a query parameter to the backend.
    -   Ensure the backend filters workers based on the `searchTerm` (e.g., by name or username).
    -   Handle potential network errors or backend errors.
    -   Process the response from the backend to match the expected `Worker[]` interface structure (`id`, `name`, `username`, `avatarUrl`). You may need to transform data if the backend returns it in a different format.

### 2. Replace `delegateGigToWorkerAPI`

This function is responsible for sending the request to delegate the specific gig to the selected worker.

-   **Mock Function Signature:**
    ```typescript
    async function delegateGigToWorkerAPI(gigId: string, workerId: string): Promise<{success: boolean}>
    ```

-   **Action Required:**
    Replace the implementation of `delegateGigToWorkerAPI` with a call to your backend API.

    -   Identify or define the backend endpoint for delegating a gig (e.g., `POST /api/gigs/{gigId}/delegate`).
    -   Use `fetch` or a data fetching library to send a `POST` request to this endpoint.
    -   Include the `workerId` in the request body.
    -   Ensure the backend logic handles the delegation process (updating the gig assignment, potentially notifying workers, etc.).
    -   Handle potential network errors or backend errors.
    -   Process the response from the backend. The current frontend expects a `{ success: boolean }` structure, but you can adjust the frontend logic based on your actual backend response (e.g., checking for a specific status code like 200 or 201).

## Considerations

-   **Authentication:** Ensure API calls are authenticated, likely using the user's session or a token.
-   **Error Handling:** Implement robust error handling for API calls, providing user feedback on failure.
-   **Loading States:** The current frontend uses `isLoading` and `delegatingWorkerId` states; ensure your API calls correctly manage these states.
-   **Data Mapping:** Pay attention to mapping data structures between your frontend expectations (`Worker` interface) and backend response formats.
-   **Backend Logic:** This document focuses on the frontend integration. You will need corresponding backend API endpoints and logic to handle these requests.

## Next Steps

1.  Define the specific backend API endpoints for fetching potential delegates and performing the delegation.
2.  Implement the backend logic for these endpoints.
3.  Update `app/gigs/[gigId]/delegate/page.tsx` to replace the mock functions with actual API calls.
4.  Test the integrated page thoroughly. 