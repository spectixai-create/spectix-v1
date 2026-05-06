# Pipeline State Machine + Sync Contracts v1.9 (iteration 10)

**Date:** 06/05/2026
**Identifier:** SPRINT-DESIGN-001
**Predecessor:** v1.8 / iteration 9 (`design001.9`). Superseded after Architect joint review identified blockers across the trio (001.9 + 002.6 + 003.3).

**Status:** All Architect blockers/polish addressed. Joint final sign-off pending.

---

## Changes From v1.8

| #   | Change                                                                        | Trigger              |
| --- | ----------------------------------------------------------------------------- | -------------------- |
| 1   | H.2 audit payload field unified: `question_ids` (was `selected_question_ids`) | Architect Blocker #3 |
| 2   | H.2: `adjuster_id` removed from details (duplicate of actor_id)               | Architect Polish #6  |
| 3   | H.2: `adjuster_unescalate` action added (escalation reversal)                 | Architect Polish #8  |
| 4   | B.6: `Unescalate` action added                                                | Architect Polish #8  |

(All v1.8 changes preserved.)

---

## Changes From v1.7 (cumulative, v1.8 → v1.9)

| #   | Change                                                                            | Trigger                |
| --- | --------------------------------------------------------------------------------- | ---------------------- |
| 1   | B.5 matrix: `ready → pending_info` added (adjuster Request Info)                  | design003.3 Decision 3 |
| 2   | B.5 matrix: `ready → reviewed` clarified — Approve action is the trigger          | design003.3 Decision 3 |
| 3   | Section A: `escalated_to_investigator` boolean flag added as orthogonal to status | design003.3 Decision 3 |
| 4   | Section H.2: 4 new audit actions documented (now 5 with unescalate)               | design003.3            |
| 5   | New transition table B.6 — adjuster-triggered actions                             | design003.3            |

---

## Section A — Claim State Vocabulary (REVISED)

### Coarse states (canonical, current main + SPRINT-002D + SPRINT-UI-001 additions)

| Value                  | Meaning                                                    | Source                         |
| ---------------------- | ---------------------------------------------------------- | ------------------------------ |
| `intake`               | Claim row exists. Form data only.                          | Existing                       |
| `processing`           | Pipeline working. UI determines stage from `passes` table. | Existing                       |
| `pending_info`         | Synthesis flagged missing data OR adjuster requested info. | Existing + UI sprint           |
| `ready`                | All passes completed cleanly. Adjuster can act.            | Existing                       |
| `reviewed`             | Adjuster approved (Approve action).                        | Existing — semantics clarified |
| `cost_capped`          | Total LLM cost ≥ $2/claim. Halted.                         | SPRINT-002D                    |
| `errored`              | System failure. Recoverable.                               | SPRINT-002D                    |
| `rejected`             | Business decision (admin/adjuster/system). Terminal.       | Existing                       |
| `rejected_no_coverage` | Specific rejection: claim not covered by policy. Terminal. | Existing                       |

**Important: `reviewed` semantics clarified.** Per design003.3 Decision 3, `reviewed` = adjuster Approved. Distinguishes from `rejected` (adjuster Rejected) and `pending_info` (adjuster Requested Info).

### Orthogonal flags (NEW per UI sprint)

| Column                             | Type    | Default | Set when                 |
| ---------------------------------- | ------- | ------- | ------------------------ |
| `claims.escalated_to_investigator` | boolean | false   | Adjuster Escalate action |

These flags are **orthogonal to status**. A claim can be `ready` AND `escalated=true` simultaneously. UI displays both. State machine transitions don't depend on flags.

### V2 appendix — fine-grained vocabulary (DEFERRED, unchanged)

`documents_open`, `extraction_complete`, `validating`, `validation_complete`, `synthesizing` — V2.

---

## Section B — Lifecycle (REVISED)

### B.1 — Forward Pipeline (event-driven, unchanged)

(Same as v1.7. Event chain: extraction → validation → synthesis. claim status `processing → ready` or `processing → pending_info` per synthesis output.)

### B.2 — Recovery (re-cycle, unchanged)

(Claimant uploads → re-cycle.)

### B.3 — System failure path (per D-026 + SPRINT-002D, unchanged)

(`errored` state, admin retry.)

### B.4 — Cost cap + system rejection paths (unchanged)

(`cost_capped`, system rejections.)

### B.5 — Allowed Transitions Matrix (UPDATED — adjuster transitions added)

| From                   | Allowed to                                                                                                      | Trigger                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `intake`               | `processing`, `rejected`                                                                                        | Document upload OR system reject         |
| `processing`           | `processing` (substages), `pending_info`, `ready`, `cost_capped`, `errored`, `rejected`, `rejected_no_coverage` | Pipeline events                          |
| `pending_info`         | `processing`, `ready`, `rejected`                                                                               | Claimant upload OR adjuster intervention |
| `ready`                | `reviewed` (adjuster Approve), `pending_info` (adjuster Request Info), `rejected` (adjuster Reject)             | **NEW** Adjuster actions                 |
| `reviewed`             | `rejected` (admin override only)                                                                                | Admin                                    |
| `cost_capped`          | `processing` (admin raises cap), `rejected` (admin gives up)                                                    | Admin                                    |
| `errored`              | `processing` (admin retry), `rejected` (admin gives up)                                                         | Admin                                    |
| `rejected`             | `(none)` — terminal                                                                                             | —                                        |
| `rejected_no_coverage` | `(none)` — terminal                                                                                             | —                                        |

**Three new transitions out of `ready`:**

1. **`ready → reviewed`** — adjuster Approve action. Audit `adjuster_decision_approve`, actor_type='human'.
2. **`ready → pending_info`** — adjuster Request Info action. Adjuster has selected questions to send. Audit `adjuster_request_info` with `question_ids` in details.
3. **`ready → rejected`** — adjuster Reject action. Audit `adjuster_decision_reject` with reason in details.

App-level enforces. SQL audit script (Section H.4) detects drift.

### B.6 — Adjuster Action Effects (NEW)

| Action       | Trigger                                                | State change           | Flag change                         | Audit action                |
| ------------ | ------------------------------------------------------ | ---------------------- | ----------------------------------- | --------------------------- |
| Approve      | UI button on claim in `ready`                          | `ready → reviewed`     | none                                | `adjuster_decision_approve` |
| Request Info | UI button on claim in `ready` after question selection | `ready → pending_info` | none                                | `adjuster_request_info`     |
| Reject       | UI button on claim in `ready` with reason              | `ready → rejected`     | none                                | `adjuster_decision_reject`  |
| Escalate     | UI button (any state except terminal)                  | none (state stays)     | `escalated_to_investigator = true`  | `adjuster_escalate`         |
| Unescalate   | UI button on claim where `escalated=true`              | none (state stays)     | `escalated_to_investigator = false` | `adjuster_unescalate`       |

**Escalate is orthogonal:** does not change state. Adjuster can escalate AND act (e.g., Approve + Escalate to flag for post-review investigator audit).

**Unescalate enables reversal:** prevents flag-set-then-stuck-forever on accidental click. Audit log captures both directions.

---

## Section C — Sync Contracts (UNCHANGED)

C.1 (Extraction → Validation), C.2 (Validation → Synthesis) unchanged.

**New cross-table read contract for UI:** UI reads from 4 sources per design001.8 F.1 (claims, passes, claim_validations, synthesis_results) AND from 1 new source: `question_dispatches` table per design002.7.

---

## Section D — Race Conditions (UNCHANGED, with note)

D.3 (`Document upload during ready`) → reject 409.

**New race scenario:** adjuster Request Info action while claim is in `pending_info` (not `ready`). Per B.5: not allowed. UI must check status before exposing button. API rejects with 409.

---

## Section E — Compensation Policy (UNCHANGED)

---

## Section F — Read Consistency (UNCHANGED with note)

F.1: 4 source composition + new `question_dispatches` table per design002.7. UI displays which questions have been dispatched (per join with `question_dispatches`).

---

## Section G — Open Questions (UNCHANGED)

---

## Section H — Implementation Specifications

### H.1 — Cost cap (per SPRINT-002D, unchanged)

### H.2 — Audit log convention (UPDATED with new actions)

```typescript
{
  action: '<event_or_action_name>',
  actor_type: 'system' | 'human',
  actor_id: '<function_id_or_user_id>',
  details: { claim_id, ... },
  cost_usd: 0,
  created_at: timestamptz,
}
```

**Per SPRINT-UI-001 additions (5 new actions):**

- `adjuster_decision_approve` — actor_type='human', actor_id=adjuster_id, details `{ claim_id }`. State: ready → reviewed.
- `adjuster_decision_reject` — actor_type='human', actor_id=adjuster_id, details `{ claim_id, reason }`. State: ready → rejected.
- `adjuster_request_info` — actor_type='human', actor_id=adjuster_id, details `{ claim_id, question_ids: string[], edited_texts?: Record<string,string> }`. State: ready → pending_info (or pending_info → pending_info, idempotent).
- `adjuster_escalate` — actor_type='human', actor_id=adjuster_id, details `{ claim_id }`. No state change. Flag set to true.
- `adjuster_unescalate` — actor_type='human', actor_id=adjuster_id, details `{ claim_id }`. No state change. Flag set to false.

**Note: `adjuster_id` is NOT duplicated in `details`.** `actor_id` column already captures it.

Per SPRINT-002D additions: `claim_errored`, `claim_error_recovered`, `claim_cost_capped` (unchanged).
Per SPRINT-003A additions: `claim_synthesis_started`, `claim_synthesis_completed` (unchanged).

### H.3, H.4, H.5, H.6, H.7 — UNCHANGED

---

## Section I — What This Document Does NOT Specify

(Same as v1.7 + clarifications:)

- Adjuster UI components (SPRINT-UI-001 spec).
- Claimant question response collection (SPRINT-UI-002).
- Investigator queue UI for escalated claims (V2). The flag is set; UI to consume the flag = V2.
- Email/SMS notification on Request Info dispatch (pilot prerequisite, not MVP).

---

## Section J — Cross-Sprint References (UPDATED)

- **SPRINT-002C** (PR #60) — claim_validations.
- **SPRINT-002D** (PR #65 merged) — errored + cost cap.
- **SPRINT-003A** (PR #66 ready) — synthesis MVP.
- **SPRINT-UI-001** (sprint_ui001.1, in design phase) — adjuster brief view + actions.
- **design002.7** — synthesis decomposition with question_dispatches table separation.
- **design003.4** — UI requirements with adjuster actions resolved.

Joint sign-off: design001.10 + design002.7 + design003.4 — concurrent updates, single Architect review.

---

## Section K — Pre-Implementation Verifications (UNCHANGED)

K.1, K.2, K.4, K.5 RESOLVED. K.3 informational. K.6 handled per SPRINT-002D.

---

## Done Criteria

- [x] B.5 matrix updated with 3 adjuster-triggered transitions.
- [x] B.6 new section: adjuster action effects (5 actions including unescalate).
- [x] Section A: `escalated_to_investigator` flag documented.
- [x] H.2: 5 new audit actions, field names unified (`question_ids`), `adjuster_id` not duplicated in details.
- [x] `reviewed` semantics clarified.
- [x] **Architect blockers/polish addressed (Blocker #3, Polish #6, Polish #8).**
- [ ] **Joint Architect final sign-off with design002.7 + design003.4.**

---

## Version

pipeline_state_machine — iteration 10 (v1.9) — 06/05/2026
**Filename:** `design001.10_state_machine_06_05.md`
**Status:** Architect blockers/polish addressed. Joint final sign-off pending.
**Predecessor:** v1.8 / iteration 9.
**Next step:** Architect joint final review with design002.7 + design003.4.
