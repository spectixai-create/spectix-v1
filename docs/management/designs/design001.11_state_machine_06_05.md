# Pipeline State Machine + Sync Contracts v1.10 (iteration 11)

**Date:** 06/05/2026
**Identifier:** SPRINT-DESIGN-001
**Predecessor:** v1.9 / iteration 10 (`design001.10`). Concurrent revision with design002.8 + design004.2 to support SPRINT-UI-002 claimant flow.

**Status:** Joint sign-off pending with design002.8 + design004.2.

---

## Changes From v1.9

| #   | Change                                                                                                                           | Trigger                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | H.2 audit `actor_type` enum extended: `'system' \| 'human' \| 'claimant'`                                                        | design004.2 introduces claimant as audit actor (not authenticated user) |
| 2   | H.2: 3 new audit actions for claimant flow (`claimant_link_opened`, `claimant_response_submitted`, `claimant_token_invalid`)     | design004.2                                                             |
| 3   | B.5: trigger for `pending_info → processing` clarified — now includes "claimant submit responses" event explicitly               | design004.2 fires `claim/responses.submitted`                           |
| 4   | B.5 clarification note: `pending_info → reviewed` is **forbidden** (absent from matrix); explicit prose added                    | Architect note — prevent silent assumption                              |
| 5   | F.1 read sources: claimant flow adds `question_responses` + `question_response_drafts` + `claimant_magic_links` to UI read scope | design004.2                                                             |

(All v1.9 changes preserved.)

---

## Section A — Claim State Vocabulary (UNCHANGED from v1.9)

(Same coarse states + orthogonal flag `escalated_to_investigator`. No new states for SPRINT-UI-002 — claimant flow operates within existing `pending_info → processing → ...` lifecycle.)

---

## Section B — Lifecycle (REVISED)

### B.1, B.3, B.4 — UNCHANGED

### B.2 — Recovery / Re-cycle (CLARIFIED)

(Same as v1.9, with explicit triggers documented.)

`pending_info → processing` re-cycle is fired by **either**:

- (a) Claimant document upload (existing path).
- (b) **NEW:** Claimant submit responses via SPRINT-UI-002 portal — fires `claim/responses.submitted` event. Per design004.2 §3.3.

Pipeline behavior identical regardless of trigger: extraction → validation → synthesis (DELETE+INSERT semantics per design002.8).

### B.5 — Allowed Transitions Matrix (REVISED — trigger column expanded)

| From                   | Allowed to                                                                                                      | Trigger                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `intake`               | `processing`, `rejected`                                                                                        | Document upload OR system reject                                                                         |
| `processing`           | `processing` (substages), `pending_info`, `ready`, `cost_capped`, `errored`, `rejected`, `rejected_no_coverage` | Pipeline events                                                                                          |
| `pending_info`         | `processing`, `ready`, `rejected`                                                                               | Claimant document upload OR **claimant submit responses (NEW per design004.2)** OR adjuster intervention |
| `ready`                | `reviewed` (adjuster Approve), `pending_info` (adjuster Request Info), `rejected` (adjuster Reject)             | Adjuster actions                                                                                         |
| `reviewed`             | `rejected` (admin override only)                                                                                | Admin                                                                                                    |
| `cost_capped`          | `processing` (admin raises cap), `rejected` (admin gives up)                                                    | Admin                                                                                                    |
| `errored`              | `processing` (admin retry), `rejected` (admin gives up)                                                         | Admin                                                                                                    |
| `rejected`             | `(none)` — terminal                                                                                             | —                                                                                                        |
| `rejected_no_coverage` | `(none)` — terminal                                                                                             | —                                                                                                        |

**Forbidden transitions (explicit clarification, NEW prose):**

- `pending_info → reviewed` is **forbidden**. Adjuster Approve action is gated on `status='ready'` only. While a claim is `pending_info`, adjuster must wait for claimant to respond OR reject the claim. This prevents race condition where adjuster approves while claimant is mid-flow on the SPRINT-UI-002 portal.
  - **API enforcement:** `/api/claims/[id]/approve` route handler (UI-001) selects `status` first; if not `ready` → 409 `{error:'invalid_state', currentStatus}`.
  - **UI enforcement:** brief view hides Approve button when `claim.status !== 'ready'`.

- `pending_info → cost_capped` is **forbidden** (absent from matrix). cost cap is computed during pipeline execution. While in `pending_info` no LLM cost accrues.

### B.6 — Adjuster Action Effects (UNCHANGED from v1.9)

(5 actions: Approve, Request Info, Reject, Escalate, Unescalate. Same effects.)

---

## Section C — Sync Contracts (UPDATED)

C.1 (Extraction → Validation): UNCHANGED.

C.2 (Validation → Synthesis): UNCHANGED at contract level. Synthesis prompt input expanded per design002.8 to include `question_responses` (claimant data fed into next cycle).

**Cross-table read contract for UI-002 (NEW):**

UI-002 (`/c/[claim_id]`) reads from:

- `claimant_magic_links` — token validation (token_hash lookup, broad query — NOT filtered by `used_at IS NULL` to differentiate state).
- `synthesis_results` filtered to `kind='question'` joined with `question_dispatches` — questions to display.
- `question_response_drafts` — autosave state.
- `question_responses` — finalized prior responses (rare; only relevant if claimant returns after submit).

UI-002 writes (via RPCs only, not raw INSERT — per design004.2 §4.4):

- `question_response_drafts` (autosave).
- `question_responses` (final submit, atomic with state transition).
- `documents` with `response_to_question_id` set.
- `claimant_magic_links.used_at` (mark used on finalize).

---

## Section D — Race Conditions (UPDATED)

D.3 (Document upload during ready): UNCHANGED (reject 409).

**D.4 (NEW): Adjuster Approve race with claimant flow.**

- Scenario: claim in `pending_info`, adjuster sees stale `ready` cached UI, clicks Approve.
- Resolution: API guard on `status='ready'` returns 409. UI re-fetches and hides button.
- Audit log: NO entry on rejected attempt (avoid audit pollution from UI staleness).

**D.5 (NEW): Claimant autosave race with adjuster regenerate-link.**

- Scenario: claimant typing → autosave RPC starts. Adjuster regenerates link → old token marked `revoked_at = now()`.
- Resolution: `save_draft` RPC takes `FOR UPDATE` lock on `claimant_magic_links` row. Sequenced linearly — either save completes before revoke, or save sees revoked state and returns `token_revoked`.
- UI handling: claimant gets toast "Your session was updated. Please refresh." on next autosave attempt.

---

## Section E, F, G — UNCHANGED from v1.9

F.1 read source list extended per Section C above.

---

## Section H — Implementation Specifications

### H.1 — Cost cap (UNCHANGED)

### H.2 — Audit log convention (REVISED)

```typescript
{
  action: '<event_or_action_name>',
  actor_type: 'system' | 'human' | 'claimant',  // 'claimant' NEW per design004.2
  actor_id: '<function_id_or_user_id_or_claim_id>',
  details: { claim_id, ... },
  cost_usd: 0,
  created_at: timestamptz,
}
```

**`actor_type='claimant'` semantics (NEW):**

- claimant has no record in `auth.users`. Authentication is bearer (magic link).
- `actor_id = claim_id` (UUID of the claim being acted on). Provides traceability without inventing a synthetic claimant ID.
- Claimant audit entries NEVER include response content in `details` (PII protection per design004.2 §8.5). `details` shape: `{ claim_id, question_count?, question_id?, error_code? }`.

**3 new audit actions for claimant flow (per design004.2):**

- `claimant_link_opened` — actor_type='claimant', actor_id=claim_id, details `{ claim_id, valid: boolean, state?: 'expired'|'used'|'revoked'|'invalid' }`. No state change. Logged on every GET to `/c/[claim_id]`.
- `claimant_response_submitted` — actor_type='claimant', actor_id=claim_id, details `{ claim_id, question_count }`. State: `pending_info → processing` via re-cycle event. **No response content** in details.
- `claimant_token_invalid` — actor_type='claimant', actor_id=claim_id, details `{ claim_id, attempted_endpoint, state }`. No state change. Logged on rejected RPC calls.

**5 SPRINT-UI-001 actions (UNCHANGED from v1.9):**

(`adjuster_decision_approve`, `adjuster_decision_reject`, `adjuster_request_info`, `adjuster_escalate`, `adjuster_unescalate`. Same semantics.)

### H.3, H.4, H.5, H.6, H.7 — UNCHANGED

---

## Section I — What This Document Does NOT Specify

(Same as v1.9, with one item moved from "not specified" to "deferred to design004.2":)

- ~~Email/SMS notification on Request Info dispatch (pilot prerequisite, not MVP).~~ → **Now specified in design004.2.**

---

## Section J — Cross-Sprint References (UPDATED)

- **SPRINT-002C** (PR #60) — claim_validations.
- **SPRINT-002D** (PR #65 merged) — errored + cost cap.
- **SPRINT-003A** (PR #66 merged) — synthesis MVP.
- **SPRINT-UI-001** (PR #68 merged) — adjuster brief view + actions.
- **SPRINT-UI-002** (in design — design004.2) — claimant question response.
- **design002.8** — synthesis decomposition revision (concurrent sign-off).
- **design004.2** — claimant flow iteration 2 (concurrent sign-off).

**Joint sign-off:** design001.11 + design002.8 + design004.2 — single Architect review across the trio.

---

## Section K — Pre-Implementation Verifications (UPDATED)

K.1, K.2, K.3, K.4, K.5, K.6 — UNCHANGED from v1.9.

**K.7 (NEW) — `audit_log.actor_type` CHECK constraint update.**

Before SPRINT-UI-002 implementation:

```sql
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_actor_type_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_actor_type_check
  CHECK (actor_type IN ('system', 'human', 'claimant'));
```

Owned by Migration 0009 (per design004.2). Required before any claimant audit entries are written.

---

## Done Criteria

- [x] H.2 actor_type enum extended with `'claimant'` semantics.
- [x] H.2 3 new claimant audit actions documented.
- [x] B.5 trigger column expanded for `pending_info → processing` (claimant submit).
- [x] B.5 forbidden transitions prose added (`pending_info → reviewed` explicit).
- [x] D.4 + D.5 new race scenarios documented.
- [x] C cross-table read contract for UI-002 added.
- [x] K.7 actor_type CHECK migration documented.
- [ ] **Joint Architect sign-off with design002.8 + design004.2.**

---

## Version

pipeline_state_machine — iteration 11 (v1.10) — 06/05/2026
**Filename:** `design001.11_state_machine_06_05.md`
**Status:** Concurrent revision with design002.8 + design004.2. Joint sign-off pending.
**Predecessor:** v1.9 / iteration 10.
**Next step:** Architect joint review across the trio.
