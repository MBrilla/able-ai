# Worker Public Profile Data Integration

This document explains how to replace the mock data used in the `PublicWorkerProfilePage` component (`app/worker/[workerId]/profile/page.tsx`) with actual data fetched from your backend API.

## 1. Identify the Mock Data Function

The mock data is currently being fetched by the `fetchPublicWorkerProfile` async function within the `app/worker/[workerId]/profile/page.tsx` file. This function currently simulates an API call and returns hardcoded data based on a mock `workerId`.

```typescript
async function fetchPublicWorkerProfile(workerIdToView: string): Promise<PublicWorkerProfile | null> {
  console.log("Fetching public profile for worker:", workerIdToView);
  await new Promise(resolve => setTimeout(resolve, 700)); // Simulate network delay
  if (workerIdToView === "benji-asamoah-id") { // Example workerId
    // Return mock data here
    return { /* ... mock data structure ... */ };
  }
  return null; // Return null for other IDs
}
```

## 2. Implement Backend API Endpoint

You will need a backend API endpoint that, given a `workerId`, fetches the public profile data for that worker from your database (e.g., PostgreSQL, Firestore, etc.).

This endpoint should return data structured similarly to the `PublicWorkerProfile` interface defined in `page.tsx`. Ensure it includes all the fields needed for display, such as:

-   `id`
-   `displayName`
-   `userHandle`
-   `profileHeadline`
-   `bio`
-   `avatarUrl`
-   `profileImageUrl`
-   `qrCodeUrl`
-   `location`
-   `primaryRole`
-   `statistics` (array of objects matching `Statistic` interface)
-   `skills` (array of objects matching `Skill` interface)
-   `awards` (array of objects matching `Award` interface)
-   `feedbackSummary`
-   `qualifications` (array of strings)
-   `equipment` (array of strings)
-   `isVerified`
-   `viewCalendarLink`

Example endpoint structure (using Next.js API routes): `/api/workers/{workerId}/public-profile`.

## 3. Replace Mock Function with API Call

Modify the `fetchPublicWorkerProfile` function to make a real `fetch` or use a data fetching library (like Axios) call to your new backend endpoint.

```typescript
async function fetchPublicWorkerProfile(workerIdToView: string): Promise<PublicWorkerProfile | null> {
  try {
    // Replace with your actual API endpoint path
    const response = await fetch(`/api/workers/${workerIdToView}/public-profile`);

    if (!response.ok) {
      // Handle API errors (e.g., worker not found, server error)
      console.error(`API Error fetching worker profile for ${workerIdToView}: ${response.status}`);
      // Depending on the error, you might throw an error or return null
      if (response.status === 404) return null; // Worker not found
      throw new Error(`Failed to fetch worker profile: ${response.statusText}`);
    }

    const workerProfileData: PublicWorkerProfile = await response.json();
    return workerProfileData;

  } catch (error) {
    console.error("Error fetching worker profile:", error);
    // Handle network errors or errors thrown from response handling
    throw error; // Re-throw to be caught by the component's useEffect
  }
}
```

## 4. Update Component State Handling

The component's `useEffect` hook already handles the loading and error states based on the promise returned by `fetchPublicWorkerProfile`. You should ensure that the component correctly renders the loading indicator, error message, or the fetched data based on the state (`isLoadingProfile`, `error`, `workerProfile`).

No significant changes should be needed in the `useEffect` or the component's rendering logic if the API returns data conforming to the `PublicWorkerProfile` interface.

## 5. Consider Authentication/Authorization

Depending on your application's requirements, you might need to add authentication (e.g., including an auth token in headers) to your API call if the public profile data is not entirely public or requires user context.

Also, implement proper authorization on the backend to ensure only allowed data is returned.

This completes the process of integrating real backend data into the worker public profile page. 