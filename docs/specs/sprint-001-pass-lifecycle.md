# Sprint #001 - Pass Lifecycle Completion

Status: IMPLEMENTED

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

- When every document for a claim is terminal and none failed, pass 1 becomes `completed` and `completed_at` is set.
- When every document for a claim is terminal and at least one failed, pass 1 becomes `failed` and `completed_at` is set.
- While any document is `pending` or `processing`, pass 1 remains `in_progress`.
- Documents from other claims do not affect the lifecycle decision.
- Retried documents can move a previously failed pass to `completed` if the approved retry leaves all claim documents processed.

Out of scope:

- Claim-level investigation brief generation.
- Risk-band calculation.
- Idempotent cost accounting for duplicate Inngest checkpoint replay.
- Dedicated subtype-specific extraction prompts.

## Implementation

Migration `20260504111946_pass_lifecycle_completion.sql` adds `public.finalize_pass_after_document_processing(p_claim_id, p_pass_number)`.

The helper:

- Counts only documents for the target claim.
- Returns `in_progress` while any document is `pending` or `processing`.
- Upserts pass 1 to `completed` when all claim documents are terminal and none failed.
- Upserts pass 1 to `failed` when all claim documents are terminal and at least one failed.
- Preserves `completed_at` on repeated same-status finalization.
- Preserves `skipped` pass rows.

`runProcessDocument` calls the helper only after the current document reaches a terminal state and any route-specific extraction/deferred audit work has been recorded.

## Rollback

Rollback drops only:

```sql
drop function if exists public.finalize_pass_after_document_processing(uuid, int);
```

No table or column rollback is required.
