# Pass Lifecycle Notes

Date: 2026-05-06

Source reviewed:

- `supabase/migrations/20260504111946_pass_lifecycle_completion.sql`
- `supabase/migrations/20260504111946_pass_lifecycle_completion.down.sql`
- `app/api/claims/[id]/documents/route.ts`

Mode: read-only local code inspection

## `reopen_pass_for_document_processing`

Function signature:

```sql
public.reopen_pass_for_document_processing(
  p_claim_id uuid,
  p_pass_number int default 1,
  p_reason text default 'document_uploaded',
  p_document_id uuid default null
)
```

## Purpose

The function reopens a claim pass when a document is uploaded or retried, so downstream document processing can continue under an in-progress pass lifecycle.

## Columns Modified on `passes`

On insert or conflict update for `(claim_id, pass_number)`, the function writes:

- `claim_id`
- `pass_number`
- `status = 'in_progress'`
- `started_at = COALESCE(existing started_at, now())`
- `completed_at = null`

It does not reset or increment:

- `cost_usd`
- `llm_calls_made`
- `findings_count`
- `gaps_count`
- `risk_band`
- `created_at`

## Skipped Pass Behavior

If the existing pass status is `skipped`, the function does not reopen it. It returns the existing skipped status with `reopened = false`.

## Reopen Audit Behavior

If the previous pass status was `completed` or `failed`, the function inserts an audit row:

- `action = 'claim/pass.reopened'`
- `actor_type = 'system'`
- `actor_id = 'db:reopen_pass_for_document_processing'`

The audit details include claim ID, pass number, prior status, reason, and document ID when supplied.

## State Transitions

Observed pass transitions:

| Previous status  | Result                                                              |
| ---------------- | ------------------------------------------------------------------- |
| missing pass row | Insert `in_progress` pass.                                          |
| `in_progress`    | Remains `in_progress`; `completed_at` remains null.                 |
| `completed`      | Reopened to `in_progress`; `completed_at` set null; audit inserted. |
| `failed`         | Reopened to `in_progress`; `completed_at` set null; audit inserted. |
| `skipped`        | Remains `skipped`; no reopen.                                       |

## Call Sites

### Document Upload API

File:

- `app/api/claims/[id]/documents/route.ts`

Behavior:

- After a document row is created during upload, the API calls `reopen_pass_for_document_processing`.
- It passes the claim ID, pass number, reason, and document ID.

### Document Retry RPC

File:

- `supabase/migrations/20260504111946_pass_lifecycle_completion.sql`

Behavior:

- `retry_document_processing` calls `reopen_pass_for_document_processing` before retrying document processing.

## Idempotency

The function is idempotent for repeated calls while a pass is already `in_progress`:

- The pass remains `in_progress`.
- `started_at` is preserved when already present.
- `completed_at` remains null.
- Reopen audit is not repeatedly inserted unless the previous status was terminal (`completed` or `failed`) at the time of the call.

The function also uses a transaction-level advisory lock scoped to claim/pass to reduce concurrent reopen races.

## UI-002B Relevance

If claimant responses upload replacement documents, the UI-002B re-cycle path should reuse this function before re-emitting document processing events. It should not create an alternate pass lifecycle mechanism.
