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

Planned:

- `POST /api/claims`: create claim from intake form.
- `GET /api/claims/:id`: return claim detail payload.
- `POST /api/documents/process`: trigger document processing.

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
