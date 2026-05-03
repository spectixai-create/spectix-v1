# Spike #03ב — Inngest pipeline + processing_status state machine

Status: PM Chat 2-B reviewed (v3 -> v4 -> v5 -> v6, final).
Owner: Codex
Branch: backend-document-pipeline
Estimated effort: 0.5-1 day
Priority: P1 high
Reference decisions: D-007, D-013, D-014, D-015

## Context

After #03a, document uploads land with `processing_status='pending'`. This
spike adds the Inngest pipeline that claims pending docs and transitions
through `processing` to `processed` or `failed`. Work is a stub; #03g replaces
the stub with Claude API processing.

Not in scope: Claude API, OCR, real classification, UI feedback, migrations,
document type changes, and intake form cleanup.

## Canonical Types

Use the event and status types from `/lib/types.ts`; do not redefine them:

- `DocumentProcessingStatus = 'pending' | 'processing' | 'processed' | 'failed'`
- `DocumentUploadedEvent` with name `claim/document.uploaded`
- `DocumentProcessedEvent` with name `claim/document.processed`
- `DocumentProcessFailedEvent` with name `claim/document.process_failed`
- `SpectixInngestEvent`

## Schema Verification

No migrations in this spike. `documents.processing_status` and its CHECK
constraint exist from migration #0002. `audit_log.actor_id`, `target_id`,
`target_table`, `details`, and `claim_id` are nullable per migration #0001.
`actor_type` is text without a DB CHECK constraint.

## Files

- `inngest/events.ts`: create `eventSchemas` via
  `new EventSchemas().fromUnion<SpectixInngestEvent>()`.
- `inngest/client.ts`: attach schemas and add module-level production guard for
  `SPECTIX_FORCE_DOCUMENT_FAILURE=true`.
- `inngest/functions/process-document.ts`: Inngest function for
  `claim/document.uploaded`.
- `inngest/functions/index.ts`: export `[processDocument] as const`.
- `app/api/claims/[id]/documents/route.ts`: after successful insert and audit,
  call `inngest.send({ name: 'claim/document.uploaded', data: { claimId,
documentId } })`; log and do not fail upload if send fails.
- `tests/unit/process-document.test.ts`: 8 unit tests covering state machine and
  event ordering.
- `tests/e2e/document-processing.spec.ts`: 3 e2e tests with Inngest dev server.

## Function Behavior

1. Atomic claim: `pending -> processing` with
   `UPDATE ... WHERE id=documentId AND processing_status='pending'`.
2. `maybeSingle()` is used because no row is a no-op skip, not an error.
3. Audit `document_processing_started`.
4. Sleep 1 second to simulate work.
5. Failure branch when `SPECTIX_FORCE_DOCUMENT_FAILURE=true` or filename
   contains `[FAIL]`: finalize to `failed`, write stub error extracted data,
   audit `document_processing_failed`, then emit `claim/document.process_failed`.
6. Happy branch: finalize to `processed`, write stub extracted data, audit
   `document_processing_completed`, then emit `claim/document.processed`.
7. Finalize uses `WHERE processing_status='processing'` and handles no-row
   gracefully with a warning.
8. Event emission happens after final state is committed; U7/U8 assert order.

## Registration

`/app/api/inngest/route.ts` must remain the #00 array-based pattern:

```ts
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
```

Adding `processDocument` to `functions` auto-registers it. Do not modify the
route file.

## Audit Vocabulary

Actor types are the five values from `/lib/types.ts`: `system`, `user`,
`rule_engine`, `llm`, `gap_analyzer`. #03b uses only `system`.

Action triplet for this spike:

- `document_processing_started`
- `document_processing_completed`
- `document_processing_failed`

## Tests

Vitest unit target: 37 total tests, including:

- pending claims successfully
- processing and processed states skip
- env var failure branch
- `[FAIL]` filename failure branch
- finalize state-changed no-op
- processed event after finalize
- failed event after finalize

Playwright target: 56 total tests, including:

- upload -> processed and audit started/completed
- `[FAIL]` filename -> failed and failure audit
- duplicate event sends produce a single completed audit

## Docs and Version

- `lib/version.ts`: Spike #16, date `2025-05-03`.
- `docs/CURRENT_STATE.md`: mark #03b complete and next #03g.
- `docs/API_CONTRACTS.md`: document the three document events.
- `docs/CONVENTIONS.md`: event naming, state transitions, action triplets,
  actor vocabulary, failure triggers.
- `docs/PM_REVIEW_CHECKLIST.md`: update event naming, actor types, add 3.13.
- `docs/HARD_REQUIREMENTS.md`: create HR-001 for stuck-document watchdog.
- `docs/DEVELOPMENT.md`: Inngest dev server setup.
- `docs/TECH_DEBT.md`: add 10m and 11a-11f.

## Acceptance

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` pass.
- `pnpm test` passes 37/37.
- `pnpm test:e2e` passes 56/56 with Inngest dev server.
- Production guard throws if `NODE_ENV=production` and
  `SPECTIX_FORCE_DOCUMENT_FAILURE=true`.
- `app/api/inngest/route.ts` verified unchanged from the array-based pattern.

## Must Not Touch

- `/supabase/*`
- `/lib/types.ts`
- `/lib/sample-data/*`
- `/components/*`
- `/lib/auth/*`, `/middleware.ts`
- `/app/api/claims/route.ts`
- `/app/api/inngest/route.ts`
