# AUDIT-001 Findings — PR #60 vs design001.6

Audit date: 2026-05-06
main HEAD: 683c8b8e2d58bb422560fe5df75ac0add61d74f3
Auditor: Codex
Mode: read-only audit

## Summary

Counts are per top-level audited subsection, not per explanatory table row.

| Status  | Count |
| ------- | ----: |
| MATCH   |     5 |
| GAP     |     4 |
| DRIFT   |     3 |
| PARTIAL |     7 |
| N/A     |     0 |
| BLOCKED |     0 |

## Findings by Section

### A.1 Claim States

- Status: DRIFT
- Repo evidence: `docs/management/designs/design001.6_state_machine_06_05.md:35-49` defines the design vocabulary; `docs/DB_SCHEMA.md:20-50`, `lib/types.ts:22-29`, and `supabase/migrations/0002_schema_audit_implementation.sql:74-78` define the current repo vocabulary.
- DB evidence if available: read-only non-production query on `aozbgunwhafabfmuwjol` returned `intake = 5`. The live `claims_status_valid` constraint permits `intake`, `processing`, `pending_info`, `ready`, `reviewed`, `rejected_no_coverage`, and `cost_capped`.
- Details: design001.6 expects `intake`, `documents_open`, `extraction_complete`, `validating`, `validation_complete`, `synthesizing`, `ready`, `pending_info`, `cost_capped`, `errored`, and `rejected`. Current main still uses the legacy vocabulary `intake`, `processing`, `pending_info`, `ready`, `reviewed`, `rejected_no_coverage`, and `cost_capped`.
- Recommendation: handle as SPRINT-002D before synthesis implementation. Proposed mapping needs CEO approval: `processing` likely splits across `documents_open` or active processing states and cannot be safely migrated by value alone; `reviewed` needs business mapping; `rejected_no_coverage` maps to `rejected`; `intake`, `pending_info`, `ready`, and `cost_capped` can map directly or near-directly.

### B.1 passes.status

- Status: MATCH
- Evidence: `docs/DB_SCHEMA.md:61-80` and `supabase/migrations/0002_schema_audit_implementation.sql:89-105` define `passes.status text not null default 'pending'` with `pending`, `in_progress`, `completed`, `skipped`, and `failed`. Read-only non-production query confirmed the same column default and check constraint.
- Details: the column exists and supports the statuses used by PR #60 validation pass logic.
- Recommendation: no implementation change required for PR #60. Future state-machine work should decide whether `pending` and `skipped` remain pass-level states in design001.6.

### B.2 UPSERT on claim_id + pass_number

- Status: MATCH
- Evidence: `supabase/migrations/20260504111946_pass_lifecycle_completion.sql:48-66` reopens pass 1 with `ON CONFLICT (claim_id, pass_number)`; `supabase/migrations/20260504111946_pass_lifecycle_completion.sql:300-314` finalizes pass 1 with the same conflict key; `inngest/functions/run-validation-pass.ts:103-120` creates pass 2 with `onConflict: 'claim_id,pass_number'`.
- Details: pass rows are keyed by `(claim_id, pass_number)`, matching D-024 pass-number semantics.
- Recommendation: keep this as the implementation baseline. Update design001.6 language that still references `pass_id` as the `claim_validations` conflict key.

### B.3 Forward transitions

| Spec transition                         | Actual implementation                                                                                                                                                                  | Status  | Evidence                                                                                                                       | Recommendation                                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `intake -> documents_open`              | Upload inserts a document and reopens pass 1, but does not update `claims.status` to `documents_open` or write `claim_documents_open`.                                                 | GAP     | `app/api/claims/[id]/documents/route.ts:160-215`; `docs/management/designs/design001.6_state_machine_06_05.md:61`              | Add guarded claim transition and state audit in SPRINT-002D.                                                    |
| `documents_open -> extraction_complete` | Pass-1 finalizer completes pass 1 and emits `claim/pass.completed` plus `claim/extraction.completed`, but does not set `claims.status = extraction_complete`.                          | PARTIAL | `inngest/functions/process-document.ts:1157-1198`; `docs/management/designs/design001.6_state_machine_06_05.md:62`             | Add claim status transition and `claim_extraction_completed` audit or update spec to pass/event-only semantics. |
| `extraction_complete -> validating`     | `run-validation-pass` starts from `claim/extraction.completed` and upserts pass 2 as `in_progress`, but does not set `claims.status = validating` or write `claim_validation_started`. | PARTIAL | `inngest/functions/run-validation-pass.ts:103-120`, `334-338`; `docs/management/designs/design001.6_state_machine_06_05.md:63` | Add guarded state transition or explicitly remove claim-level validating state from spec.                       |
| `validating -> validation_complete`     | Validation finalizer sets pass 2 to `completed` and emits `claim/validation.completed`, but does not set `claims.status = validation_complete` or write `claim_validation_completed`.  | PARTIAL | `inngest/functions/run-validation-pass.ts:176-196`; `docs/management/designs/design001.6_state_machine_06_05.md:64`            | Add claim status transition or update downstream synthesis trigger contract.                                    |
| `validation_complete -> synthesizing`   | Synthesis is not implemented.                                                                                                                                                          | N/A     | `docs/management/designs/design001.6_state_machine_06_05.md:65`                                                                | Defer to SPRINT-003A after state-machine decision.                                                              |
| `synthesizing -> ready`                 | Synthesis is not implemented.                                                                                                                                                          | N/A     | `docs/management/designs/design001.6_state_machine_06_05.md:66`                                                                | Defer to SPRINT-003A after state-machine decision.                                                              |
| `synthesizing -> pending_info`          | Synthesis is not implemented.                                                                                                                                                          | N/A     | `docs/management/designs/design001.6_state_machine_06_05.md:67`                                                                | Defer to SPRINT-003A after state-machine decision.                                                              |

Overall status: PARTIAL

### B.4 Recovery path

- Status: PARTIAL
- Evidence: `docs/management/designs/design001.6_state_machine_06_05.md:71-77` defines recovery; upload accepts `pending_info` via `ACCEPTING_STATUSES` in `app/api/claims/[id]/documents/route.ts:12`; the endpoint reopens pass 1 in `app/api/claims/[id]/documents/route.ts:207-215`; retry support exists in `supabase/migrations/20260504111946_pass_lifecycle_completion.sql:110-170`.
- Details: the repo supports upload while `pending_info` and reopens pass 1. It does not implement explicit `pending_info -> documents_open` status transition, `claim_recycle_to_documents_open` audit, or the exact `created_at > previous_pass_completed_at` re-extraction query from the design. Current event-driven upload sends only the new document to `process-document`, so prior extracted data is preserved by behavior rather than by the specified query.
- Recommendation: either codify the event-driven new-document-only recovery model in design001.6 or implement the explicit state transition and audit contract.

### B.5 System failure path

- Status: GAP
- Evidence: `docs/management/designs/design001.6_state_machine_06_05.md:79-100` specifies `errored` and admin recovery. Current `ClaimStatus` omits `errored` in `lib/types.ts:22-29`; `claims_status_valid` omits `errored` in `docs/DB_SCHEMA.md:48-50` and `supabase/migrations/0002_schema_audit_implementation.sql:74-78`. Search found only design/audit references to `claim_errored`.
- Details: Inngest function failures currently fail/retry at function level. There is no repo-level transition to a claim `errored` state and no admin recovery path.
- Recommendation: implement `errored` state, guarded transition, audit action, and recovery path before production synthesis.

### B.6 Terminal failure paths

- Status: PARTIAL
- Evidence: design terminal paths are in `docs/management/designs/design001.6_state_machine_06_05.md:102-110`; current `cost_capped` status exists in `lib/types.ts:22-29` and `docs/DB_SCHEMA.md:48-50`; pass-1 blocking failures produce pass `failed` via `docs/DB_SCHEMA.md:167-172` and `inngest/functions/process-document.ts:1199-1204`.
- Details: the schema contains `cost_capped`, and pass lifecycle can mark pass 1 `failed`. There is no `CostCapHaltError`, `callClaudeWithCostGuard`, `claim_cost_capped`, `claim_rejected_all_blocked`, or admin rejection implementation in tracked runtime code.
- Recommendation: treat cost-cap and terminal business rejection handling as SPRINT-002D critical gaps. Keep TECH_DEBT 11q for the later atomic hard-cap improvement.

### C.1 Extraction to validation read contract

- Status: MATCH
- Evidence: `lib/validation/normalized-fields.ts:60-80` includes only `extracted_data.kind = normalized_extraction` and records broad fallback `kind = extraction` as `skipped_broad_fallback`; `lib/validation/normalized-fields.ts:84-85` reads `extracted_data.normalized_data.fields`; `lib/validation/normalized-fields.ts:141-154` emits field paths under `extracted_data.normalized_data.fields.<field>.value`.
- Details: PR #60 matches the extraction-to-validation read contract for normalized routes and skips broad fallback outputs. The implementation intentionally uses `pass_number` instead of `pass_id`, matching PR #59 and the actual schema.
- Recommendation: no implementation change required. Update design001.6 `claim_validations` conflict-key language from `(claim_id, pass_id, layer_id)` to `(claim_id, pass_number, layer_id)`.

### D.1-D.8 Race condition policies

| Claim status or scenario                             | Spec behavior                                                              | Actual behavior                                                                                                                                                     | Status  | Recommendation                                                                                        |
| ---------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `documents_open` upload                              | Allowed.                                                                   | No `documents_open` state exists. Closest current accepted active status is `processing`; upload accepts `intake`, `processing`, and `pending_info`.                | PARTIAL | Add state vocabulary or update spec to use `processing`.                                              |
| `validating` upload                                  | Reject with 409 and `estimated_completion_seconds: 60`.                    | No `validating` state exists. If it existed, upload route would reject because it is not in `ACCEPTING_STATUSES`, but response is 400 without estimated completion. | GAP     | Add state and 409 response contract.                                                                  |
| `synthesizing` upload                                | Reject with 409 and `estimated_completion_seconds: 90`.                    | No `synthesizing` state exists. Same generic 400 rejection behavior would apply if present.                                                                         | GAP     | Add state and 409 response contract before synthesis.                                                 |
| `pending_info` upload                                | Allowed and triggers recovery.                                             | Upload is accepted for `pending_info`; pass 1 is reopened. Claim status/audit transition is absent.                                                                 | PARTIAL | Add recovery state audit or document pass-only behavior.                                              |
| `extraction_complete` / `validation_complete` upload | Reject with 409.                                                           | Neither state exists. Current route rejects non-accepted statuses with 400.                                                                                         | GAP     | Add states and 409 conflict responses.                                                                |
| Claim form mutation                                  | Allowed only in `intake`, `documents_open`, `pending_info`.                | No claim update endpoint was found under `app/api/claims`; only claim creation and document APIs exist.                                                             | GAP     | Implement mutation route with status gate only when claim editing becomes product scope.              |
| Concurrent Inngest retries                           | Per-action idempotency by UPSERT, guarded update, audit-tolerant behavior. | Pass rows and validation rows use UPSERT; audit duplicates are tolerated. Cost accounting idempotency remains TECH_DEBT 11j/11o.                                    | PARTIAL | Keep current pass/validation idempotency, but close cost accounting idempotency before higher volume. |
| Adjuster opens claim during processing               | Snapshot last terminal state with explicit banner.                         | Adjuster UI/snapshot behavior is not implemented in current main.                                                                                                   | GAP     | Defer to adjuster UI sprint or explicitly remove from MVP.                                            |

Overall status: PARTIAL

### H.1 Cost cap enforcement

- Status: GAP
- Evidence: design001.6 requires `CostCapHaltError`, `NonRetriableError`, and cost-check plus LLM call in one `step.run` in `docs/management/designs/design001.6_state_machine_06_05.md:209-245`. Tracked runtime search found no `CostCapHalt`, no `callClaudeWithCostGuard`, no `total_llm_cost_usd >= 2`, and no `claim_cost_capped` runtime action. Cost tracking exists through `claims.total_llm_cost_usd` in `docs/DB_SCHEMA.md:37-38` and `docs/DB_SCHEMA.md:308-311`.
- Details: the app measures cumulative cost but does not enforce the $2 soft cap in the LLM call path.
- Recommendation: implement soft cap enforcement before production use of synthesis or any additional LLM-heavy workflow. Keep hard atomic cap as TECH_DEBT 11q.

### H.2 Audit log convention

- Status: PARTIAL
- Evidence: design001.6 expects state-transition audit details with `actor_id = state-machine`, `from_status`, `to_status`, `trigger`, and optional pass identifiers in `docs/management/designs/design001.6_state_machine_06_05.md:260-279`. PR #60 writes layer-level audit actions inside `step.run` in `inngest/functions/run-validation-pass.ts:224-231` and `265-274`; details include `layer_id`, `pass_number`, and `cost_usd` in `inngest/functions/run-validation-pass.ts:294-309`. `docs/DB_SCHEMA.md:281-302` documents validation layer audit actions as safe metadata.
- Details: validation layer audit is replay-safe and safe-metadata-only, but it is not the state-transition audit convention design001.6 describes. It records layer execution, not `claim.status` transitions.
- Recommendation: keep layer audit as-is. Add separate state-machine transition audit actions when SPRINT-002D implements claim status transitions.

### H.3 Claim-level watchdog HR-002

- Status: GAP
- Evidence: design001.6 specifies stuck-claim detection for `validating` and `synthesizing` in `docs/management/designs/design001.6_state_machine_06_05.md:284-294`. Current watchdog code is document-level HR-001 only: `inngest/functions/watchdog-stuck-documents.ts:23-100` scans `documents.processing_status = processing`; it is registered in `inngest/functions/index.ts:10-18`.
- Details: no claim-level watchdog for stale validation or synthesis states exists.
- Recommendation: implement HR-002 after claim state vocabulary is aligned. Without `validating` and `synthesizing`, the watchdog query cannot be implemented as designed.

### H.4 SQL state audit script

- Status: GAP
- Evidence: design001.6 specifies a daily SQL state audit in `docs/management/designs/design001.6_state_machine_06_05.md:296-309`. Tracked scripts are only `scripts/check-env.ts`, `scripts/openclaw-local-dispatcher.mjs`, and `scripts/seed/create-adjuster.ts`; no tracked script or SQL file implements the state audit.
- Details: no automated drift audit exists for the design001.6 claim-state vocabulary.
- Recommendation: acceptable as TECH_DEBT if SPRINT-002D adds the state machine first. Add the audit script in the same sprint as the new claim status migration or immediately after.

### H.5 Inngest concurrency limits

- Status: PARTIAL
- Evidence: design001.6 K.4 assumes concurrency 5 in `docs/management/designs/design001.6_state_machine_06_05.md:391-397`. `process-document` uses per-claim concurrency 5 in `inngest/functions/process-document.ts:69-72`. `run-validation-pass` uses per-claim concurrency 1 in `inngest/functions/run-validation-pass.ts:23-27`.
- Details: extraction concurrency matches the design assumption for cost-cap calculations. Validation is stricter than the assumption and should reduce replay/race risk. The cost-cap calculation still matters for LLM-using extraction and future synthesis.
- Recommendation: update design001.6 to state that `process-document` is 5 per claim and `run-validation-pass` is 1 per claim.

### K.1 passes.status

- Status: MATCH
- Evidence: same as B.1. `passes.status` exists, is non-null, defaults to `pending`, and is constrained to `pending`, `in_progress`, `completed`, `skipped`, and `failed`.
- Details: this pre-implementation verification is satisfied.
- Recommendation: no action.

### K.3 documents.processing_status vocabulary

- Status: DRIFT
- Evidence: design001.6 says the spec assumed `pending`, `processing`, `processed`, `failed_blocking`, and `failed_non_blocking` in `docs/management/designs/design001.6_state_machine_06_05.md:383-389`. Current schema uses `pending`, `processing`, `processed`, and `failed` in `docs/DB_SCHEMA.md:131-139` and `supabase/migrations/0002_schema_audit_implementation.sql:120-122`. `lib/types.ts:38-42` matches the schema. Read-only non-production query returned `processed = 34`, `pending = 9`, and `failed = 1`.
- Details: blocking vs non-blocking failure is not encoded in `documents.processing_status`; it lives in `extracted_data.extraction_error.blocking` and `extracted_data.document_processing` metadata, documented in `docs/DB_SCHEMA.md:159-165` and typed in `lib/types.ts:458-468`.
- Recommendation: update design001.6 to use the current vocabulary and metadata-based blocking semantics.

### K.4 Inngest concurrency

- Status: PARTIAL
- Evidence: same as H.5. `process-document` is `limit: 5` per claim; `run-validation-pass` is `limit: 1` per claim.
- Details: the implementation is compatible with validation safety, but design001.6 should avoid implying one global concurrency cap for all functions.
- Recommendation: spec update only unless cost-cap work changes `process-document` concurrency.

### K.5 NonRetriableError import path

- Status: MATCH
- Evidence: `package.json:44` declares `inngest` `^3.54.2`; the required verification command returned `NonRetriableError typeof: function`.
- Details: the import path `import { NonRetriableError } from 'inngest'` is valid for the installed SDK.
- Recommendation: use the documented import path when implementing cost-cap halt behavior.

### K.6 claims.status backfill

- Status: DRIFT
- Evidence: design001.6 states legacy mapping is required in `docs/management/designs/design001.6_state_machine_06_05.md:51`. Current schema and types still use legacy statuses in `docs/DB_SCHEMA.md:48-50` and `lib/types.ts:22-29`. Read-only non-production query showed only `intake` rows today, but the active check constraint still permits legacy values.
- Details: no migration/backfill to the design001.6 vocabulary exists in current main.
- Recommendation: include explicit migration and backfill plan in SPRINT-002D. Do not start SPRINT-003A synthesis against the unresolved claim-state vocabulary.

## Recommended Actions

### Critical Gaps — suggest SPRINT-002D

- Align `claims.status` vocabulary with design001.6 or formally revise design001.6 to the current vocabulary before SPRINT-003A.
- Implement guarded claim-state transitions for document upload, extraction completion, validation start, and validation completion.
- Implement upload/mutation race policy responses, especially 409 responses with safe estimated completion metadata during active processing states.
- Implement `errored` state, retry recovery, and terminal rejection handling.
- Implement soft cost-cap guard around LLM calls before any additional LLM-heavy production workflow.

### Acceptable Deferrals — suggest TECH_DEBT

- SQL state audit script can wait until the claim-state migration exists, then should be added immediately.
- HR-002 claim-level watchdog can wait until `validating` and `synthesizing` states exist.
- Cost accounting idempotency hardening remains covered by TECH_DEBT 11j/11o, and hard atomic cost cap remains TECH_DEBT 11q.
- Adjuster snapshot/banner behavior can defer to the adjuster UI sprint if SPRINT-003A stays backend-only.

### Spec Updates Needed — drift back to spec

- Replace `claim_validations` conflict key references from `(claim_id, pass_id, layer_id)` to `(claim_id, pass_number, layer_id)`.
- Update document processing status assumptions to `pending`, `processing`, `processed`, and `failed`, with blocking semantics read from `extracted_data`.
- Document function-specific concurrency: extraction uses 5 per claim; validation uses 1 per claim.
- Decide whether validation is truly claim-status-driven (`validating`) or event/pass-driven (`claim/extraction.completed` plus pass 2).

### CEO Decisions Required

- Decide whether SPRINT-002D is mandatory before SPRINT-003A. Recommendation: yes, because synthesis needs stable state gates and recovery semantics.
- Decide legacy status mappings, especially `processing`, `reviewed`, and `rejected_no_coverage`.
- Decide whether the current pass/event-only lifecycle is acceptable for MVP, or whether design001.6 claim-level states are canonical.
- Decide whether upload conflict responses must be implemented before pilot/demo use or can be deferred behind UI constraints.

## Safety Confirmation

- Product code changed: no
- Runtime code changed: no
- Supabase mutation: no
- Smoke run: no
- Deploy: no
- Secrets printed: no
- SPRINT-003A started: no
