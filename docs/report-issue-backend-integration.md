# Report Issue Page: Backend Integration Guide

This document explains how to connect the `/gigs/[gigId]/report-issue` page to your backend for issue reporting and file uploads.

---

## 1. API Endpoint Design

- **Endpoint:** `/api/report-issue`
- **Method:** `POST`
- **Content-Type:** `multipart/form-data` (for file uploads)
- **Authentication:** Required (e.g., JWT, session, etc.)

### Example Request

```
POST /api/report-issue
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
  gigId: string
  issueType: string
  description: string
  files: File[] (optional, multiple)
```

### Example Response

```
{
  "success": true,
  "message": "Issue reported successfully."
}
```

---

## 2. Frontend Integration

- The form uses a `FormData` object to send data and files.
- On submit, send the form data to `/api/report-issue` using `fetch`:

```ts
const response = await fetch('/api/report-issue', {
  method: 'POST',
  body: formData,
  headers: {
    // 'Authorization': 'Bearer ...' (if needed)
  },
});
```

- Handle success and error responses to update the UI.

---

## 3. Backend Handling

- **Parse multipart form data** (e.g., with `multer` in Node.js/Express, or `busboy` in Next.js API routes).
- **Validate** all fields (`gigId`, `issueType`, `description`).
- **Save files** to cloud storage (e.g., Firebase Storage, AWS S3, or local disk for dev).
- **Store issue record** in your database, including file URLs if applicable.
- **Return a JSON response** indicating success or error.

---

## 4. Security & Authentication

- Require authentication (e.g., check JWT or session).
- Validate that the user is allowed to report an issue for the given `gigId`.
- Sanitize all inputs to prevent injection attacks.
- Limit file types and sizes for uploads.

---

## 5. Example Tech Stack

- **API Route:** Next.js API route (`/pages/api/report-issue.ts` or `/app/api/report-issue/route.ts`)
- **File Upload:** Use `formidable`, `busboy`, or `multer` for parsing
- **Storage:** Firebase Storage, AWS S3, or similar
- **Database:** PostgreSQL, MongoDB, etc.

---

## 6. Future Enhancements

- Email notifications to support/admin
- Issue status tracking and updates
- User can view their submitted issues
- Admin dashboard for managing issues

---

## 7. References
- [Next.js API Routes](https://nextjs.org/docs/pages/api-reference/api-routes/introduction)
- [Handling File Uploads in Next.js](https://nextjs.org/docs/pages/building-your-application/routing/api-routes#request-helpers)
- [Multer (Express)](https://github.com/expressjs/multer)
- [Firebase Storage](https://firebase.google.com/docs/storage)
- [AWS S3](https://docs.aws.amazon.com/s3/index.html) 