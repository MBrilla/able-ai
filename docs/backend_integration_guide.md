# Backend Integration Guide for Skill Profile and Portfolio

This document outlines how to integrate the frontend components for the public and editable skill profiles, and the portfolio item editor with actual backend API endpoints.

## 1. Current Frontend Structure

Currently, the following pages use mock data fetching functions:

- **Public Worker Skill Profile Page:** `/app/worker/[workerId]/profile/skills/[skillId]/page.tsx`
  - Uses the interface `PublicSkillProfile`.
  - Fetches data using the mock function `fetchPublicSkillProfile`.

- **Editable Worker Skill Profile Page:** `/app/user/[userId]/worker/profile/skills/[skillId]/page.tsx`
  - Uses the interface `EditableSkillProfile`.
  - Fetches data using the mock function `fetchEditableSkillProfile`.
  - Includes placeholder handlers (`handleRemove...`, `handleAdd...`, `handleSave`) that currently only update local state or show alerts.

- **Editable Portfolio Item Page:** `/app/user/[userId]/worker/profile/skills/[skillId]/portfolio/[portfolioItemId]/page.tsx`
  - Uses the interface `PortfolioMediaForm`.
  - Fetches data (for existing items) using the mock function `fetchPortfolioItem`.
  - Includes a placeholder `handleSave` function that simulates saving.

## 2. Required Backend API Endpoints (Conceptual)

Based on the frontend needs, the following REST API endpoints are conceptually required:

- **Fetch Public Skill Profile:**
  - `GET /api/workers/:workerId/skills/:skillId/public`
  - **Description:** Retrieves the public data for a specific skill of a worker.
  - **Response:** `PublicSkillProfile` object.
  - **Authentication:** Not required (public data).

- **Fetch Editable Skill Profile:**
  - `GET /api/users/:userId/worker/skills/:skillId/editable`
  - **Description:** Retrieves the editable data for a specific skill of the authenticated worker.
  - **Response:** `EditableSkillProfile` object.
  - **Authentication:** Required (authenticated user), Must verify `userId` matches the authenticated user's ID.

- **Update Editable Skill Profile:**
  - `PUT /api/users/:userId/worker/skills/:skillId`
  - **Description:** Updates the main editable fields of a worker's skill profile (e.g., `skillDescription`, `skillExperience`, `skillEph`).
  - **Request Body:** Partial `EditableSkillProfile` containing the fields to update.
  - **Response:** Success status or updated `EditableSkillProfile`.
  - **Authentication:** Required (authenticated user), Must verify `userId` matches the authenticated user's ID.

- **Fetch Portfolio Item:**
  - `GET /api/users/:userId/worker/skills/:skillId/portfolio/:itemId`
  - **Description:** Retrieves data for a specific portfolio item of the authenticated worker.
  - **Response:** `PortfolioMediaForm` object.
  - **Authentication:** Required (authenticated user), Must verify `userId` matches the authenticated user's ID.

- **Create Portfolio Item:**
  - `POST /api/users/:userId/worker/skills/:skillId/portfolio`
  - **Description:** Creates a new portfolio item for the authenticated worker's skill.
  - **Request Body:** `PortfolioMediaForm` object (without `id`). May also need to handle file uploads.
  - **Response:** The created `PortfolioMedia` object (including the new `id`) or success status.
  - **Authentication:** Required (authenticated user), Must verify `userId` matches the authenticated user's ID.

- **Update Portfolio Item:**
  - `PUT /api/users/:userId/worker/skills/:skillId/portfolio/:itemId`
  - **Description:** Updates an existing portfolio item.
  - **Request Body:** Partial `PortfolioMediaForm`.
  - **Response:** Success status or updated `PortfolioMedia`.
  - **Authentication:** Required (authenticated user), Must verify `userId` matches the authenticated user's ID and that the item belongs to the skill and worker.

- **Delete Portfolio Item:**
  - `DELETE /api/users/:userId/worker/skills/:skillId/portfolio/:itemId`
  - **Description:** Deletes a specific portfolio item.
  - **Response:** Success status.
  - **Authentication:** Required (authenticated user), Must verify `userId` matches the authenticated user's ID and that the item belongs to the skill and worker.

- **Endpoints for Badges and Qualifications:** Similar `GET`, `POST`/`PUT`, `DELETE` or `LINK`/`UNLINK` endpoints will be needed for managing the association of badges and qualifications with a skill.

## 3. Frontend Integration Steps

To integrate the frontend with the actual backend:

1.  **Replace Mock Fetching Functions:**
    - In each page component (`app/worker/[workerId]/profile/skills/[skillId]/page.tsx`, `app/user/[userId]/worker/profile/skills/[skillId]/page.tsx`, `app/user/[userId]/worker/profile/skills/[skillId]/portfolio/[portfolioItemId]/page.tsx`), replace the mock `fetch...` functions with asynchronous functions that make actual HTTP requests to your backend API endpoints.
    - Use `fetch` or a library like `axios` to make the API calls.
    - Ensure you handle loading states, errors, and successful responses.

2.  **Implement Save Handlers:**
    - In `app/user/[userId]/worker/profile/skills/[skillId]/page.tsx`, update the `handleSave` function to send a `PUT` request to the `PUT /api/users/:userId/worker/skills/:skillId` endpoint with the relevant `formData`.
    - In `app/user/[userId]/worker/profile/skills/[skillId]/portfolio/[portfolioItemId]/page.tsx`, update the `handleSave` function to send either a `POST` request (for new items) or a `PUT` request (for existing items) to the respective portfolio endpoints.
    - After a successful save, consider refetching the data or updating the local state to reflect the changes.

3.  **Implement Add/Remove/Edit Handlers for Lists:**
    - In `app/user/[userId]/worker/profile/skills/[skillId]/page.tsx`:
        - Update `handleAddPortfolioItem`, `handleAddBadge`, `handleAddQualification` to trigger modals/forms or navigate to dedicated creation pages (as implemented for portfolio).
        - Update `handleRemovePortfolioItem`, `handleRemoveBadge`, `handleRemoveQualification` to send `DELETE` or `UNLINK` requests to the backend API for the specific item.

4.  **Handle Authentication and Authorization:**
    - For authenticated endpoints, ensure your frontend sends the necessary authentication token (e.g., in the `Authorization` header).
    - The backend must verify the token and check if the authenticated user (`authUser.uid`) matches the `userId` in the route parameters to prevent unauthorized access or modification of other users' data.

5.  **Integrate File Uploads:**
    - For portfolio images/videos, you'll need to implement file upload logic on the frontend (e.g., using `<input type="file">`).
    - The selected file(s) will need to be sent to a backend endpoint that handles file storage (e.g., uploading to Firebase Storage, S3, etc.) and returns the public URL(s) for the stored files.
    - Update the `formData` with the returned URLs before saving the portfolio item details to the database.

## 4. Backend Implementation Considerations

When implementing the backend API:

- Use a robust framework or serverless functions (like Firebase Functions, based on your project structure) to handle API requests.
- Implement proper routing for the defined endpoints.
- Connect to your database (e.g., Drizzle with your schema) to fetch, create, update, and delete data.
- Implement authentication middleware to protect sensitive endpoints.
- Implement authorization checks within your route handlers to ensure users can only access and modify their own data.
- Handle file uploads securely and efficiently.
- Implement comprehensive error handling and return meaningful error responses to the frontend.
- Consider data validation on the backend to ensure data integrity.

By following these steps, you can transition from the mock data implementation to a fully functional application integrated with your backend. 