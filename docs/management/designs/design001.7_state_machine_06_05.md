# Pipeline State Machine + Sync Contracts v1.6 (iteration 7)

**Date:** 06/05/2026
**Identifier:** SPRINT-DESIGN-001
**Predecessor:** v1.5 / iteration 6 (`design001.6_state_machine_06_05.md`). Superseded after AUDIT-001 (PR #62) confirmed implementation reality differs from design v1.5 fundamentally — main is event/pass-driven with coarse claim.status, not the fine-grained 11-state vocabulary v1.5 specified.

**Status:** Major revision. Spec now reflects shipped reality (canonical) per D-027, with deferred fine-grained vocabulary moved to V2 appendix.

---

## Changes From v1.5

This is a fundamental revision, not a delta. The core approach changed:

| #   | Before (v1.5)                                                                                                                                                                                    | After (v1.6)                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | claim.status was fine-grained 11-state machine (intake, documents_open, extraction_complete, validating, validation_complete, synthesizing, ready, pending_info, cost_capped, errored, rejected) | claim.status is coarse UI-hint (intake, processing, pending_info, ready, reviewed, cost_capped, errored, rejected per current main + SPRINT-002D additions). Stage tracking is in `passes` table + Inngest events. |
| 2   | Section A specified vocabulary that didn't exist in main                                                                                                                                         | Section A reflects shipped vocabulary; fine-grained vocabulary moved to V2 appendix.                                                                                                                               |
| 3   | Section B transitions were claim-status-driven                                                                                                                                                   | Section B documents event-driven transitions; pass row state transitions are primary. claim.status transitions are derived/UI-facing.                                                                              |
| 4   | Section D race conditions assumed claim status as gate                                                                                                                                           | Section D updated: gates derived from passes + claim_validations + future synthesis_results state, not just claim.status.                                                                                          |
| 5   | K verifications assumed multiple things to verify                                                                                                                                                | K cleaned up: most resolved via AUDIT-001 (PR #62) findings.                                                                                                                                                       |

**Driver:** D-027 (Backend lifecycle canonical = event/pass-driven). Per CEO triage post-AUDIT-001.

---

## Section A — Claim State Vocabulary (REVISED)

### Coarse states (canonical, shipped + SPRINT-002D additions)

| Value                  | Meaning                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `intake`               | Claim row exists. Form data only. No documents uploaded.                                                      |
| `processing`           | Pipeline working: extraction OR validation OR synthesis in progress. UI determines which from `passes` table. |
| `pending_info`         | Synthesis flagged missing data or asks clarification. Claimant action required.                               |
| `ready`                | All passes completed cleanly. Adjuster can act.                                                               |
| `reviewed`             | Adjuster reviewed (per existing main vocabulary).                                                             |
| `cost_capped`          | Total LLM cost ≥ $2/claim. Processing halted. (SPRINT-002D adds enforcement.)                                 |
| `errored`              | System failure, recoverable via admin retry. (SPRINT-002D adds.)                                              |
| `rejected`             | Business decision (admin or system rule). Terminal.                                                           |
| `rejected_no_coverage` | Specific rejection: claim not covered. (Existing per main.)                                                   |

CHECK constraint enforced. Codex confirms exact values per AUDIT-001.

### V2 appendix — fine-grained vocabulary (DEFERRED)

If pilot/UI evidence shows that adjusters need finer-grained states than `processing` (e.g., distinguishing "extraction in progress" from "validation in progress"), V2 may add:

`documents_open`, `extraction_complete`, `validating`, `validation_complete`, `synthesizing`

This is V2 hardening, not MVP. Until then, UI derives stage from:

- `passes.pass_number=1, status='in_progress'` → "extraction in progress"
- `passes.pass_number=2, status='in_progress'` → "validation in progress"
- `passes.pass_number=3, status='in_progress'` → "synthesis in progress"
- `passes.pass_number=N, status='completed'` for N=1/2/3 → that pass done; check next pass row.

---

## Section B — Lifecycle (REVISED — event-driven canonical)

### B.1 — Forward Pipeline (event-driven)

| Stage                        | Event triggering                              | passes row updated                                          | claim.status                                                                            |
| ---------------------------- | --------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Document upload (first)      | API endpoint                                  | none                                                        | `intake → processing`                                                                   |
| Document upload (subsequent) | API endpoint                                  | none                                                        | stays `processing`                                                                      |
| Per-document extraction      | Inngest function (existing)                   | UPSERT pass_number=1 cumulative cost                        | stays `processing`                                                                      |
| Pass-1 finalizer             | Internal logic on submit/timeout/all-terminal | UPSERT pass_number=1 SET status='completed'                 | stays `processing`. Fires `claim/extraction.completed`.                                 |
| Validation handler           | `claim/extraction.completed` event            | UPSERT pass_number=2 SET status='in_progress' → 'completed' | stays `processing`. Fires `claim/validation.completed`.                                 |
| Synthesis handler            | `claim/validation.completed` event            | UPSERT pass_number=3 SET status='in_progress' → 'completed' | `processing → pending_info` (if findings/questions) OR `processing → ready` (if clean). |

### B.2 — Recovery (re-cycle)

| Stage                                          | Trigger                                  | Effect                                                                                                |
| ---------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Claimant uploads new doc to pending_info claim | Upload API                               | `pending_info → processing`. Existing pass rows preserved. New doc added.                             |
| Pass-1 re-finalizer                            | Re-fires after submit/timeout            | UPSERT pass_number=1 (re-extraction of new docs only per design000.6 B.2 row 9 logic carried forward) |
| Validation re-fires                            | `claim/extraction.completed` fires again | UPSERT pass_number=2 row (status flips through in_progress → completed)                               |
| Synthesis re-fires                             | `claim/validation.completed` fires again | UPSERT pass_number=3 row. New synthesis_results UPSERTed (deterministic IDs).                         |
| Final state                                    | Synthesis completes                      | `processing → ready` or `processing → pending_info`                                                   |

### B.3 — System failure (per D-026 + SPRINT-002D)

| Stage                             | Trigger                                                                                | Effect                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Inngest function exhausts retries | `.on('failure')` (or equivalent SDK pattern, verified per SPRINT-002D Precondition #4) | Transition claim → `errored`. Audit log with error class + last completed pass_number.     |
| Admin retry                       | `POST /api/admin/claims/:id/retry` (auth gate per SPRINT-002D Precondition #6)         | Derive last good state from passes table. Re-fire appropriate event. claim → `processing`. |
| Admin gives up                    | Admin action                                                                           | claim → `rejected`.                                                                        |

### B.4 — Cost cap (per D-026 + SPRINT-002D)

| Stage              | Trigger                                     | Effect                                                                                   |
| ------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Cost guard wrapper | Pre-LLM-call check, total_llm_cost_usd ≥ $2 | Throw CostCapHaltError (NonRetriableError). Transition claim → `cost_capped`. Audit log. |
| Admin override     | Admin action                                | claim → `processing` (resumes) or `rejected` (terminates).                               |

### B.5 — Forbidden transitions

App-level enforcement (per D-027, no fine-grained CHECK):

- No transition INTO `intake` from any other state (start state only).
- No transition INTO `errored` from `ready`, `rejected`, or other terminal states.
- No transition INTO `processing` from `rejected` (terminal).
- Other transitions allowed at app layer; SQL audit script (Section H.4) detects drift.

---

## Section C — Sync Contracts

### C.1 — Extraction → Validation (UNCHANGED — per PR #60)

**Read contract:**

- Validation reads `documents` filtering `extracted_data->>'kind' = 'normalized_extraction'`.
- Field paths: `extracted_data.normalized_data.fields.<field_name>`.
- broad_fallback documents (`kind = 'extraction'`) skipped per **D-022**.
- Validation reads passes by `claim_id` AND `pass_number=1` AND `status=completed`.

**Lock contract:** Per D-027, no claim.status gate. Validation runs when event fires; concurrent uploads to `processing` claim allowed (per existing main behavior).

**Idempotency:**

- All passes mutations UPSERT.
- claim_validations: ON CONFLICT (claim_id, pass_id_or_number, layer_id) DO UPDATE.
- Audit duplicates acceptable.

### C.2 — Validation → Synthesis (per design002.3)

**Read contract:**

- Synthesis reads claim_validations rows scoped to most recent pass_id (or pass_number per Form B):
  ```sql
  WHERE pass_id = (
    SELECT id FROM passes
    WHERE claim_id=$1 AND pass_number=2 AND status='completed'
    ORDER BY completed_at DESC LIMIT 1
  )
  ```
- broad_fallback documents already skipped at validation; synthesis inherits.

**Lock contract:** No claim.status gate. Synthesis runs when event fires.

**Idempotency:**

- passes UPSERT.
- synthesis_results: ON CONFLICT (claim_id, pass_id_or_number, kind, payload->>'id') DO UPDATE. Deterministic IDs ensure consistent re-cycle behavior.
- Audit duplicates acceptable.

---

## Section D — Race Conditions (REVISED)

Per D-027, races are not gated by claim.status alone.

| #   | Scenario                                                                             | Decision                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| D.1 | Document upload during `processing`                                                  | **ALLOWED** (per existing main). Triggers per-document extraction.                                                                           |
| D.2 | Document upload during `pending_info`                                                | **ALLOWED.** Triggers re-cycle.                                                                                                              |
| D.3 | Document upload during `ready` / `reviewed` / `cost_capped` / `errored` / `rejected` | **REJECT** with 409. (Upload conflict 409 policy = TECH_DEBT 11w, UX sprint.)                                                                |
| D.4 | Concurrent Inngest retries                                                           | **Per-action idempotency** via UPSERT/guarded UPDATE/idempotency keys.                                                                       |
| D.5 | Adjuster opens claim while pipeline runs                                             | **Snapshot from latest persisted state.** UI reads passes + claim_validations + synthesis_results separately. Banner per current pass state. |
| D.6 | Claim form mutation                                                                  | **ALLOWED only in `intake` and `pending_info`** (per existing main).                                                                         |
| D.7 | Cost cap race                                                                        | **Soft cap with documented tolerance** ($1.50-$2.50 effective range per H.1).                                                                |

---

## Section E — Compensation Policy (UNCHANGED)

No auto-recompute on manual override. Manual flag only. Audit on every override. Previous output retained (canonical = most recent).

---

## Section F — Read Consistency (REVISED — UI derives from multiple sources)

### F.1 — Adjuster snapshot composition

UI composes the adjuster view from THREE sources, not just claim.status:

1. `claims.status` (coarse) — top-level banner: "processing" / "ready" / "pending_info" / etc.
2. `passes` table — stage details:
   - pass_number=1 in_progress → "extraction in progress"
   - pass_number=2 in_progress → "validation in progress"
   - pass_number=3 in_progress → "synthesis in progress"
   - completed rows → done
3. `claim_validations` + `synthesis_results` — substantive content (findings, questions, score).

### F.2 — Refresh policy

MVP: manual refresh. Demo: optional refresh button. Pilot: real-time (per D-023, deferred until LOI).

### F.3 — Synthesis disclaimer

When synthesis is in progress (pass_number=3 in_progress), UI shows: **"סינתזה בעיבוד. אל תקבל החלטה על בסיס validation בלבד."**

---

## Section G — Open Questions

**Resolved:**

- G.1 timeout (combined rule per existing main).
- G.2 submit gate (per existing API).
- G.3 cost cap timing (SPRINT-002D wrapper, end-of-step semantics).
- G.7 re-extraction scope (per pass-1 finalizer).

**Still open / deferred:**

- G.4 pending_info UX details — UX sprint.
- G.5 fine-grained state vocabulary (per V2 appendix).
- G.6 transition validation enforcement — app-level for MVP, SQL audit script for drift.

---

## Section H — Implementation Specifications

### H.1 — Cost cap (per SPRINT-002D)

Soft cap with tolerance ($1.50-$2.50). NonRetriableError pattern. See `sprint002d.2_errored_costcap_06_05.md` for full implementation.

Hard cap = TECH_DEBT 11v.

### H.2 — Audit log convention

Every system transition writes:

```typescript
{
  action: '<transition_or_event_name>',
  actor_type: 'system',
  actor_id: '<function_or_handler_id>',
  details: { claim_id, pass_id?, pass_number?, from_status?, to_status?, trigger? },
  cost_usd: 0,
  created_at: timestamptz,
}
```

Admin actions: `actor_type='human'`, `actor_id=<user_id>`.

Per SPRINT-002D additions: `claim_errored`, `claim_error_recovered`, `claim_cost_capped`.
Per SPRINT-003A additions: `claim_synthesis_started`, `claim_synthesis_completed`.

### H.3 — Watchdog HR-002

```sql
SELECT id FROM claims
WHERE status = 'processing'
  AND updated_at < now() - interval '30 minutes';
```

For each: check passes rows for stale in_progress. Transition to `errored` per SPRINT-002D pattern.

30m placeholder; revisit per smoke p95.

### H.4 — SQL state audit script

```sql
SELECT id, status, updated_at FROM claims
WHERE status NOT IN (
  'intake', 'processing', 'pending_info', 'ready', 'reviewed',
  'cost_capped', 'errored', 'rejected', 'rejected_no_coverage'
);
-- Should return 0 rows. Drift detected = bug.
```

Plus drift detection per audit log (transitions to invalid states).

### H.5 — Concurrency limits

Inngest concurrency cap = 5 per claim_id (verified per AUDIT-001 K.4). H.1 worst-case cost calculation assumes 5.

If cap differs in future: H.1 recompute.

### H.6 — `cost_capped` recovery

Per SPRINT-002D: admin override raises cap, claim returns to `processing`.

### H.7 — `archived` state (FUTURE)

Not in MVP. Post-pilot, terminal claims older than N months migrate to cold storage. TECH_DEBT entry.

---

## Section I — What This Document Does NOT Specify

- Implementation of state transitions (covered by SPRINT-002D for errored + cost cap; SPRINT-003A for synthesis).
- pending_info notification flow (UX sprint).
- Manual override implementation (UX sprint).
- Admin UI for cap override (UX sprint).
- Real-time UI refresh (deferred per D-023).
- DB CHECK enforcement of fine-grained transitions (per D-027, app-level for MVP).
- Migration backfilling existing claims (handled per SPRINT-002D K.6 and per existing main).
- V2 fine-grained state vocabulary (deferred).

---

## Section J — Cross-Sprint References

- **SPRINT-002C v2.2** (PR #60 shipped) — defines `claim_validations` table + sync contract C.1.
- **SPRINT-002D v1.1** (pending dispatch) — adds `errored` state + cost cap enforcement.
- **SPRINT-003A** (`sprint003a.1` ready post-002D) — synthesis MVP, defines `synthesis_results` per Decision 2.
- **SPRINT-003B/C/D** (conditional, per design002.3) — rules engine, LLM rules, score refinement.
- **SPRINT-UI-001** (separate, parallel to 003A) — adjuster brief view consuming all 3 sources (claim, passes, claim_validations, synthesis_results).

---

## Section K — Pre-Implementation Verifications (Cleaned Up)

K.1, K.4, K.5 RESOLVED via AUDIT-001 (PR #62). K.2 RESOLVED via CEO verification (D-019 sprint methodology).

**Still open / forward-looking:**

### K.3 — `documents.processing_status` vocabulary (informational)

For future implementations referencing per-document state. Spec assumes `pending`, `processing`, `processed`, `failed_blocking`, `failed_non_blocking`. AUDIT-001 confirms or notes drift.

### K.6 — `claims.status` backfill (handled per SPRINT-002D)

CEO maps legacy values to vocabulary. Codex applies CHECK migration.

---

## Done Criteria

- [x] All v1.5 corrections incorporated.
- [x] D-027 + D-028 reflected in Section A, B, D, F, K.
- [x] V2 appendix preserves the fine-grained vocabulary work for future reference.
- [ ] Architect review on v1.6.
- [ ] CEO approves final iteration.

---

## Version

pipeline_state_machine — iteration 7 (v1.6) — 06/05/2026
**Filename:** `design001.7_state_machine_06_05.md`
**Status:** Major revision per D-027 acknowledging event/pass-driven canonical.
**Predecessor:** v1.5 / iteration 6 — superseded fundamentally; original moved to archive.
**Next step:** Architect review → sign-off → design001.6 moved to archive folder.
