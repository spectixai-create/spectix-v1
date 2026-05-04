# Sprint #001 - Pass Lifecycle Completion

Status: LOCALLY VALIDATED - pending QA review

## Investigation Summary

Pass rows are created and updated through `public.upsert_pass_increment`, which is called by `inngest/functions/process-document.ts` for broad classification, subtype classification, and successful extraction costs. Migration `0002_schema_audit_implementation.sql` defines `passes.status`, `passes.completed_at`, and the trigger that keeps `claims.current_pass` and `claims.total_llm_cost_usd` synchronized from `passes`.

Before this sprint, no code moved pass 1 from `in_progress` to a terminal status after document processing finished. TASK-SPECTIX-001 exposed that gap: all 8 smoke documents reached `processed`, but pass 1 remained `in_progress`.

There is no separate claim-level pass-completion pipeline in the current implementation. `PassCompletedEvent` exists in the TypeScript event union, but no Inngest function consumed or emitted it for document processing completion.

## Decision

Chosen option: **Option A**.

Pass 1 should complete automatically when all uploaded documents for a claim finish document-level processing.

Reason:

- Existing code uses pass 1 for claim-level document-processing LLM accounting.
- `passes.status` already has terminal values: `completed` and `failed`.
- Leaving pass 1 permanently `in_progress` makes operations ambiguous after every document is terminal.
- Completing pass 1 does not require inventing a separate claim-analysis pipeline.

Consequences:

- When every document for a claim is terminal and none has a blocking failure, pass 1 becomes `completed` and `completed_at` is set.
- When every document for a claim is terminal and at least one has a blocking failure, pass 1 becomes `failed` and `completed_at` is set.
- While any document is `pending`, `processing`, extracting, deferred-finalizing, retrying, null/unknown, or otherwise non-terminal, pass 1 remains `in_progress`.
- Documents from other claims do not affect the lifecycle decision.
- Late uploads reopen pass 1 to `in_progress`.
- Retry resets the same document row to `pending` and preserves the previous failure state in `audit_log`.
- Retried documents can move a previously failed pass to `completed` if the approved retry leaves all claim documents processed.

Out of scope:

- Claim-level investigation brief generation.
- Risk-band calculation.
- Idempotent cost accounting for duplicate Inngest checkpoint replay.
- Dedicated subtype-specific extraction prompts.

## Implementation

Migration `20260504111946_pass_lifecycle_completion.sql` adds:

- `public.reopen_pass_for_document_processing(p_claim_id, p_pass_number, p_reason, p_document_id)`
- `public.retry_document_processing(p_document_id, p_reason, p_actor_type, p_actor_id)`
- `public.finalize_pass_after_document_processing(p_claim_id, p_pass_number)`

The finalizer:

- Counts only documents for the target claim.
- Returns `in_progress` while any document is non-terminal.
- Treats `extraction_error` as blocking unless `blocking` is explicitly `false`.
- Upserts pass 1 to `completed` when all claim documents are terminal and none has a blocking failure.
- Upserts pass 1 to `failed` when all claim documents are terminal and at least one has a blocking failure.
- Emits `claim/pass.completed` only through `emit_completed_event = true` on a true transition to `completed`.
- Uses a transaction-level advisory lock to prevent duplicate completed events under repeated or concurrent finalizers.
- Preserves `skipped` pass rows.

`runProcessDocument` now keeps `documents.processing_status = processing` through classification, extraction/defer handling, audit writes, and extraction cost persistence. It writes `processed` only at the real successful end of document processing, or `failed` for blocking processing/extraction failures.

## Rollback

Rollback drops only:

```sql
drop function if exists public.finalize_pass_after_document_processing(uuid, int);
drop function if exists public.retry_document_processing(uuid, text, text, text);
drop function if exists public.reopen_pass_for_document_processing(uuid, int, text, uuid);
```

No table or column rollback is required.
