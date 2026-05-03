# Spike #03ג — Claude API + Document Classifier (Prompt 01)

Status: CEO draft v3 (post PM v2 review — 4 blocking, 5 important, 3 cosmetic incorporated; 1 anti-pattern self-flagged; 1 retroactive bug fix in #03ב code).
Owner: Codex
Branch: backend-document-classifier
Estimated effort: 1-1.5 days
Priority: P1 high
Reference decisions: D-007, D-013, D-014, D-015, D-016, D-017

## 1. Context

After #03ב, documents transition pending → processing → processed/failed via stub Inngest function. WORK is `step.sleep('1s')`. This spike replaces stub with real Claude API call (Prompt 01 — Document Classification).

Also fixes a pre-existing bug in #03ב's process-document.ts where `step.sendEvent` is called unconditionally after finalize `step.run`, even when finalize returned early due to mid-processing state change. With Claude API's longer latency window (5-30s vs stub's 1s), this bug becomes production-relevant.

## 2. New Decisions

### D-016: passes is CLAIM-LEVEL with cumulative aggregation

`passes` rows are keyed by `(claim_id, pass_number)` and aggregate LLM calls and cost at the claim/pass level. The classifier increments pass 1 through `public.upsert_pass_increment`.

### D-017: HEIC removed from upload mime allowlist

No pre-flight check on existing `storage.objects`. Existing HEIC objects remain accessible; only new uploads are blocked by the bucket allowlist and API validation.

## 3. Canonical Types

Use canonical types from `/lib/types.ts`; do not redefine them. Relevant types: `DocumentType`, `DocumentProcessingStatus`, `DocumentUploadedEvent`, `DocumentProcessedEvent`, `DocumentProcessFailedEvent`, `SpectixInngestEvent`.

## 4. Schema Verification

`documents.file_path` is canonical. `documents.document_type` is text and becomes CHECK-constrained in migration #0004. `passes` has `UNIQUE (claim_id, pass_number)`. `audit_log.actor_type` has no DB CHECK.

Trigger verification from migration #0002:

```sql
CREATE TRIGGER passes_update_claim_state
  AFTER INSERT OR UPDATE OF status, risk_band, cost_usd
  ON public.passes
  FOR EACH ROW EXECUTE FUNCTION public.update_claim_pipeline_state();
```

The trigger fires on `UPDATE OF cost_usd`, so the UPSERT helper updates `claims.total_llm_cost_usd`.

## 5. Migration

Create `/supabase/migrations/0004_classifier_prep.sql` and `/supabase/rollbacks/0004_classifier_prep.down.sql`.

Migration responsibilities:

- Add `documents_document_type_check`.
- Remove HEIC from `claim-documents` bucket allowlist.
- Create `public.upsert_pass_increment(p_claim_id uuid, p_pass_number int, p_calls_increment int, p_cost_increment numeric)`.

Rollback responsibilities:

- Drop `upsert_pass_increment`.
- Restore HEIC in bucket allowlist.
- Drop `documents_document_type_check`.

## 6. Claude API Client

Create `/lib/llm/client.ts` with Anthropic SDK initialization, `DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'`, static pricing, and `callClaudeJSON`.

## 7. Classifier

Create `/lib/llm/classify-document.ts` with:

- `ClassifierPreCallError`
- `ClassifierLLMError`
- `classifyDocumentFromStorage`

Pre-call failures include DB row fetch, Storage download, and unsupported mime. LLM failures include SDK errors and invalid JSON.

## 8. Inngest Function

Modify `/inngest/functions/process-document.ts`:

- Replace stub sleep with classifier call.
- Add concurrency `{ limit: 5, key: 'event.data.claimId' }`.
- Add D-016 pass increment via `upsert_pass_increment`.
- Throw if RPC fails.
- Fix sendEvent conditional bug: finalize steps return `{ transitioned: boolean }`, and events are emitted only when `transitioned`.

## 9. Watchdog

Add stuck-document watchdog for HR-001. Dynamic `step.run` ids inside loops are valid Inngest pattern.

## 10. UI Polling + Status Endpoint

Create public `GET /api/claims/[id]/documents/[docId]/status` with double-key check on both `claim_id` and `id`.

Canonical response:

```ts
{
  documentId: string;
  processing_status: 'pending' | 'processing' | 'processed' | 'failed';
  document_type: DocumentType;
  error_message?: string;
}
```

Update `DocumentUploader` to poll status after upload.

## 11. Skeleton Uploader Removal

Remove or replace any remaining skeleton-only uploader behavior that hides real processing status.

## 12. Audit Actor Rules

| Scenario              | actor_type | actor_id                    |
| --------------------- | ---------- | --------------------------- |
| Orchestration         | system     | inngest:process-document    |
| Forced failure        | system     | inngest:process-document    |
| Pre-LLM failure       | system     | classifier:pre-call-failure |
| LLM wrapper threw     | llm        | classifier:wrapper-error    |
| LLM wrapper succeeded | llm        | model id                    |
| Watchdog              | system     | watchdog-stuck-documents    |

## 13. Tests

Add/update:

- `tests/unit/classify-document.test.ts` — 7 tests.
- `tests/unit/process-document-claude.test.ts` — 9 tests.
- `tests/unit/process-document.test.ts` — update U7/U8 for conditional event behavior.
- `tests/unit/watchdog-stuck-documents.test.ts` — 4 tests.
- `tests/unit/upsert-pass-increment.test.ts` — 3 tests.
- `tests/e2e/document-classification.spec.ts` — 4 tests.
- `tests/e2e/watchdog.spec.ts` — 1 test.

Existing 56 Playwright + 37 Vitest must continue passing. Target: 60 e2e + 60 unit.

## 14. Acceptance Criteria

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build` pass.
- `pnpm test` passes.
- `pnpm test:e2e` passes.
- Migration applies via Supabase CLI.
- Rollback verified in dev/local per D-015.
- Claude classifier works with `ANTHROPIC_API_KEY`.
- Status endpoint double-key check returns 404 for mismatched claim/document.
- `claims.total_llm_cost_usd` matches pass cost sum after classifier runs.

## 15. Files Must Not Touch

- `/lib/types.ts`
- `/lib/sample-data/*`
- `/lib/auth/*`, `/middleware.ts`
- `/app/api/claims/route.ts`
- `/app/api/inngest/route.ts`
- Earlier migrations `0001`-`0003`

## 16. Edge Cases

- No `ANTHROPIC_API_KEY`: local real-Claude e2e skip gracefully; production deploy must have env configured.
- Storage download failure: system actor failure.
- Unsupported HEIC: system actor pre-call failure.
- LLM malformed JSON: llm actor wrapper failure.
- 5 docs in parallel with retries: 5 concurrency × 3 retries may produce up to 15 concurrent LLM calls per claim; acceptable for #03ג.
- Mid-processing state mutation: finalize returns `transitioned:false` and no event is emitted.

## 17. Documentation

Update `DECISIONS.md`, `MIGRATIONS.md`, `DB_SCHEMA.md`, `API_CONTRACTS.md`, `CONVENTIONS.md`, `ROUTING.md`, `TECH_DEBT.md`, `HARD_REQUIREMENTS.md`, `CURRENT_STATE.md`, and `lib/version.ts`.

## 18. Revision History

### v3

1. RPC integrated into migration #0004.
2. Trigger `AFTER UPDATE OF cost_usd` verified.
3. HEIC pre-flight removed.
4. `sendEvent` conditional fix.
5. TECH_DEBT 11j idempotency-key trigger.
6. RPC error throws.
7. `actor_type='llm'` restricted to actual Claude API attempts.
8. Sentinel actor ids for pre-call/wrapper errors.
9. Status endpoint double-key check.
10. Concurrency × retries note.
11. Watchdog dynamic step ids note.
12. Status endpoint shape unified.
