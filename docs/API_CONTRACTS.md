# API Contracts

Source of truth: [lib/types.ts](../lib/types.ts), especially Section D for API result shapes and Section F for Inngest events.

## Server Actions

Current:

- `signIn(email, password)` in [lib/auth/actions.ts](../lib/auth/actions.ts): returns `ApiResult<{ userId: string }>` and revalidates the root layout.
- `signOut()` in [lib/auth/actions.ts](../lib/auth/actions.ts): signs out, revalidates the root layout, and redirects to `/login`.

Server Actions must handle auth through Supabase helpers and must not use plain client-side fetch for credentials.

## REST API Endpoints

Current:

- `GET /api/health`: temporary diagnostic endpoint. Remove or gate before public launch.
- `/api/inngest`: webhook endpoint for Inngest. This route is intentionally excluded from cookie auth middleware because Inngest uses signing keys.
- `POST /api/claims`: public intake endpoint that creates a claim row from the claimant form.
- `POST /api/claims/[id]/documents`: public multipart upload endpoint for supporting documents.

Planned:

- `GET /api/claims/:id`: return claim detail payload.
- `POST /api/documents/process`: trigger document processing.

### POST /api/claims

- Method: `POST`
- Path: `/api/claims`
- Headers: `Content-Type: application/json`
- Auth: public. Intake is claimant-facing and is not protected by adjuster middleware.
- Request body: intake claim creation payload validated by [lib/schemas/claim.ts](../lib/schemas/claim.ts). It mirrors `CreateClaimRequest` plus migration #0002 intake columns.
- Response `201`: `ApiResult<{ claim: Claim; warnings?: string[] }>`
- Response `400`: `invalid_json` or `validation_failed`; validation failures include `details.issues` for developer debugging.
- Response `409`: `claim_number_collision`
- Response `500`: `claim_number_generation_failed` or `db_error`

Example request:

```json
{
  "claimantName": "Test User",
  "insuredName": "Test User",
  "claimantEmail": "test@example.com",
  "claimantPhone": "0501234567",
  "policyNumber": "POL-001",
  "claimType": "theft",
  "incidentDate": "2025-04-15",
  "incidentLocation": "Tel Aviv, Israel",
  "amountClaimed": 5000,
  "currency": "ILS",
  "summary": "Test claim summary, sufficient length to pass validation.",
  "metadata": {
    "tripPurpose": "tourism"
  }
}
```

### POST /api/claims/[id]/documents

- Method: `POST`
- Path: `/api/claims/[id]/documents`
- Headers: `Content-Type: multipart/form-data`
- Auth: public. The claimant intake flow remains public; authenticated sessions are optional and only affect audit attribution.
- Request body: multipart form data with a required `file` field.
- Accepted MIME types: `application/pdf`, `image/jpeg`, `image/png`.
- Size limit: 4 MB per file at the API layer.
- Response `201`: `ApiResult<{ document: Document }>`
- Response `400`: `invalid_id`, `empty_file`, `file_too_large`, `invalid_file_type`, `claim_not_acceptable`, or `document_limit_reached`.
- Response `404`: `claim_not_found`
- Response `500`: `storage_error`, `upload_partial_failure`, or `db_error`

### GET /api/claims/[id]/documents/[docId]/status

- Method: `GET`
- Path: `/api/claims/[id]/documents/[docId]/status`
- Auth: public. Uses a double-key check: both `claim_id` and `id` must match.
- Response `200`: `ApiResult<{ documentId: string; processing_status: DocumentProcessingStatus; document_type: DocumentType; error_message?: string }>`
- Response `400`: `invalid_id`
- Response `404`: `document_not_found`
- Response `500`: `db_error`

Example response:

```json
{
  "ok": true,
  "data": {
    "document": {
      "id": "document-uuid",
      "claimId": "claim-uuid",
      "documentType": "other",
      "filePath": "claims/claim-uuid/document-uuid.pdf",
      "fileName": "receipt.pdf",
      "fileSize": 51200,
      "mimeType": "application/pdf",
      "ocrText": null,
      "extractedData": null,
      "processingStatus": "pending",
      "uploadedBy": null,
      "createdAt": "2025-05-03T00:00:00Z"
    }
  }
}
```

Example validation error:

```json
{
  "ok": false,
  "error": {
    "code": "validation_failed",
    "message": "Validation failed",
    "details": {
      "issues": []
    }
  }
}
```

## Request and Response Types

Use `ApiResult<T>`, `CreateClaimRequest`, `CreateClaimResponse`, `GetClaimResponse`, `ProcessDocumentRequest`, `ProcessDocumentResponse`, and `UpdateClaimStatusRequest` from [lib/types.ts](../lib/types.ts).

## Auth Contract

Post Spike #01:

- Public routes are listed in [ROUTING.md](ROUTING.md).
- Adjuster routes are protected by root [middleware.ts](../middleware.ts).
- Protected Server Components validate identity with `getUser()` / `requireUser()`.
- `next` redirect targets are validated with [lib/auth/safe-redirect.ts](../lib/auth/safe-redirect.ts).

## Inngest Events

Defined in `SpectixInngestEvent`:

- `claim/document.uploaded`: `{ claimId: string; documentId: string }`.
  Fired by `POST /api/claims/[id]/documents` after the document row and upload
  audit record are persisted.
- `claim/document.processed`:
  `{ claimId: string; documentId: string; documentType: DocumentType }`. Fired
  after the processing function commits `processing_status='processed'`.
- `claim/document.process_failed`:
  `{ claimId: string; documentId: string; error: string }`. Fired after the
  processing function commits `processing_status='failed'`.
- `claim/pass.start`
- `claim/pass.completed`
- `claim/extraction.completed`: `{ claimId: string; passNumber: number }`.
  Fired after pass 1 transitions to completed. SPRINT-002C uses it to start the
  validation pass.
- `claim/validation.completed`: `{ claimId: string; passNumber: number }`.
  Fired after validation layers 11.1-11.3 persist terminal rows and validation
  pass 2 completes.
