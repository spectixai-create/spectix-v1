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

- `claim/document.uploaded`
- `claim/document.processed`
- `claim/document.process_failed`
- `claim/pass.start`
- `claim/pass.completed`
