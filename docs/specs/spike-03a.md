# Spike #03a - File upload + Storage

Status: Approved by PM, ready for execution
Owner: Codex
Branch: backend-document-upload
Estimated effort: 1 day
Priority: P1 high
Reference decisions: D-007, D-013, D-014, D-015

## Context

After successful claim submission, users upload supporting documents. This
spike tightens the existing `claim-documents` bucket MIME allowlist, adds
`POST /api/claims/[id]/documents`, wires the success-panel uploader, and
introduces D-015 paired `down.sql` migration practice.

Not in scope: OCR, document classification beyond placeholder `other`,
`extracted_data`, `file_hash`, notes, processing transitions, or auth-gated
upload.

## Migration

Create:

- `supabase/migrations/0003_storage_mime_types.sql`
- `supabase/rollbacks/0003_storage_mime_types.down.sql`

The up migration updates existing bucket `claim-documents` only; it does not
recreate it. It sets `allowed_mime_types` to:

- `application/pdf`
- `image/jpeg`
- `image/png`
- `image/heic`

The down migration restores pre-#0003 state by setting
`allowed_mime_types = null`. D-015 requires manual rollback verification:
up -> down -> up. Implementation note: Supabase CLI executes `*.sql` files in
`supabase/migrations`, so rollback SQL is stored under `supabase/rollbacks`.

## API

Create `app/api/claims/[id]/documents/route.ts`.

Public route:

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
```

POST behavior:

1. Validate `params.id` as UUID; `400 invalid_id` if malformed.
2. Fetch claim by `id`; `404 claim_not_found` if missing.
3. Reject terminal statuses with `400 claim_not_acceptable`.
4. Count documents; reject `>= 50` with `400 document_limit_reached`.
5. Get optional session; authenticated uploads use `actor_type='user'`,
   anonymous uploads use `actor_type='system'`.
6. Parse multipart `file`.
7. Validate file exists, size `> 100`, size `<= 4194304`, and MIME type in
   the allowlist.
8. Generate document UUID and path `claims/{claimId}/{documentId}.{ext}`.
9. Upload to Supabase Storage with service role.
10. Insert document row with `document_type='other'` and
    `processing_status='pending'`.
11. If DB insert fails, remove the Storage object and return
    `500 upload_partial_failure`.
12. Insert audit log with `document_uploaded`; audit failure is logged but does
    not fail the request.
13. Log `[soft-limit-exceeded]` if concurrent uploads push count above 50.
14. Return `201 { document }`.

Sanitize display filenames by stripping traversal, backslash, NUL/control
chars, and bidi override/embedding characters, then truncating to 255 chars.

## Frontend

Modify `components/intake/states/success-panel.tsx` to render a
`DocumentUploader` section only when a real UUID `claim.id` exists. Demo mode
`/new?state=success` must not show the uploader.

Create `components/intake/document-uploader.tsx`:

- Drag-and-drop and file input fallback.
- Multiple files, up to 5 concurrent uploads.
- Client pre-validation for size and MIME type.
- Hebrew statuses and error mapping.
- No document type selector and no notes input.

## Tests

Create `tests/e2e/document-upload.spec.ts` with 12 tests:

1. Valid PDF returns `201`, `document_type='other'`,
   `processing_status='pending'`.
2. 5 MB file returns `400 file_too_large`.
3. `text/plain` returns `400 invalid_file_type`.
4. Valid UUID but missing claim returns `404 claim_not_found`.
5. Malformed UUID returns `400 invalid_id`.
6. Reviewed claim rejects upload with `400 claim_not_acceptable`.
7. Claim already at 50 documents returns `400 document_limit_reached` and no
   Storage file.
8. Public `/new` flow uploads PDF and DB has `uploaded_by=null`; audit has
   `actor_type='system'`.
9. Uploaded file exists in Storage.
10. Insert failure cleanup removes the Storage object.
11. 3.5 MB Buffer-based fake PDF returns `201`.
12. Demo mode success has no uploader.

Existing 41 Playwright tests must continue to pass; target is 53/53.

## Docs

- Bump `lib/version.ts` to Spike #15, date `2025-05-03`.
- Update `docs/CURRENT_STATE.md`.
- Update `docs/API_CONTRACTS.md` for `POST /api/claims/[id]/documents`.
- Update `docs/CONVENTIONS.md` with new API error codes.
- Append D-015 to `docs/DECISIONS.md`.
- Create `docs/MIGRATIONS.md` with D-015 and retroactive clarification that
  migrations #0001 and #0002 predate D-015 and have no down files.
- Append TECH_DEBT entries 10a-10l.

## Do Not Touch

- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0002_schema_audit_implementation.sql`
- `lib/types.ts`
- `lib/sample-data/*`
- `lib/auth/*`
- `middleware.ts`
- `inngest/*`

## Acceptance

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` pass.
- `pnpm test` passes.
- `pnpm test:e2e` passes, total 53.
- Migration 0003 applies to production.
- Down migration manually verified locally/dev.
- Bucket settings verified in production.
- Public upload flow verified.
- Demo mode still works without uploader.
- Lighthouse a11y on `/new` success state is >= 90.
- PR description includes rollback confirmation, placeholder choice,
  screenshots/evidence, and test output.
