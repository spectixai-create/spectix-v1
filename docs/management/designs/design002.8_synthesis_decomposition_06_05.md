# SPRINT-DESIGN-002 — Synthesis Layer Decomposition (v1.7, iteration 8)

**Date:** 06/05/2026
**Identifier:** SPRINT-DESIGN-002
**Iteration:** 8 (v1.7)
**Predecessor:** v1.6 / iteration 7 (`design002.7`). Concurrent revision with design001.11 + design004.2 to support SPRINT-UI-002 claimant flow.

**Status:** Joint sign-off pending with design001.11 + design004.2.

---

## Changes From v1.6

| #   | Change                                                                                                                                    | Trigger                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | `question_dispatches`: 3 notification metadata columns added (`notification_sent_at`, `notification_attempts`, `notification_last_error`) | design004.2 introduces email/SMS dispatch infrastructure          |
| 2   | `question_dispatches`: `notification_channel` column added (`'email' \| 'sms' \| 'both'`)                                                 | design004.2 D1 — email primary + SMS fallback                     |
| 3   | Decision 6 (synthesis prompt input): expanded — synthesis on cycle 2+ receives `question_responses` as additional context                 | design004.2 §3.3 re-cycle                                         |
| 4   | Re-cycle Behavior section: `question_responses` UPSERT semantics across cycles                                                            | design004.2                                                       |
| 5   | Re-cycle Behavior: explicit note that synthesis pass_number stays at 3 across all cycles (DELETE+INSERT pattern unchanged)                | Architect clarification — prevents pass_number coupling confusion |

(All v1.5 / v1.6 changes preserved.)

---

## Inputs Confirmed (UNCHANGED from v1.6)

- D-027 + D-028 canonical wording.
- AUDIT-001 confirms event-driven canonical and Form B in main.
- D-020 single-pass; synthesis is one-shot per `pass_number=3` row.

---

## Resolved Decisions

### Decisions 1, 3, 4, 5, 7 — UNCHANGED FROM v1.4/v1.6

### Decision 2 — UNCHANGED FROM v1.6 (REVISED schema below)

(Synthesis Output + Dispatch State Separation: Form B for synthesis_results, DELETE+INSERT, separate `question_dispatches` table.)

**Schema part 2: question_dispatches (REVISED — notification metadata added)**

```sql
CREATE TABLE question_dispatches (
  question_id text NOT NULL,
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  first_dispatched_at timestamptz NOT NULL,
  last_dispatched_at timestamptz NOT NULL,
  dispatched_by uuid NOT NULL REFERENCES auth.users(id),
  last_dispatched_by uuid NOT NULL REFERENCES auth.users(id),
  edited_text text,
  -- NEW per design004.2 (Migration 0009):
  notification_sent_at timestamptz NULL,
  notification_attempts int NOT NULL DEFAULT 0,
  notification_last_error text NULL,
  notification_channel text NULL CHECK (notification_channel IN ('email','sms','both')),
  PRIMARY KEY (claim_id, question_id)
);
CREATE INDEX idx_question_dispatches_claim ON question_dispatches(claim_id);
```

**Notification field semantics (NEW):**

- `notification_sent_at`: timestamp of first successful provider send. Immutable on retry. NULL until first success.
- `notification_attempts`: increments by 1 on every Resend OR Twilio API call (success or failure).
- `notification_last_error`: NULL when last attempt succeeded. Provider error message string when last attempt failed.
- `notification_channel`: NULL until first send. `'email'` after Resend send. Promoted to `'both'` if SMS fallback fires. `'sms'` if email path skipped (no email in claim_form).

**Owner of these columns:** logically owned by design002 (table is `question_dispatches`). Physically added in Migration 0009 (per design004.2). design002.8 documents semantics; design004.2 owns the `ALTER TABLE` statement.

---

### Decision 6 — Synthesis Prompt Input (REVISED — claimant responses on cycle 2+)

**v1.6 behavior:** synthesis prompt receives extracted claim data + validation findings as input.

**v1.7 addition (this revision):**

On cycle 2+ (claim has prior `question_responses`), synthesis prompt receives an additional input section:

```
## Previous claimant responses
The claimant was asked questions in a prior cycle and responded as follows:

Q: <question_text>
A: <response_value formatted by expected_answer_type>
---
Q: <question_text>
A: <response_value>
---
(...)
```

**Query for synthesis to fetch this section:**

```sql
SELECT
  qd.question_id,
  sr.payload->>'text' AS question_text,
  sr.payload->>'expected_answer_type' AS expected_answer_type,
  qr.response_value
FROM question_responses qr
JOIN question_dispatches qd
  ON qd.claim_id = qr.claim_id AND qd.question_id = qr.question_id
JOIN synthesis_results sr
  ON sr.claim_id = qr.claim_id
  AND sr.pass_number = 3
  AND sr.kind = 'question'
  AND sr.payload->>'id' = qr.question_id
WHERE qr.claim_id = $1
ORDER BY qr.responded_at;
```

**Notes:**

- `synthesis_results` `pass_number=3` is stable across cycles — DELETE+INSERT preserves the integer. Query uses literal `pass_number=3` consistent with v1.6 pattern.
- JOIN on `synthesis_results` is needed to pull the question text (which lives in synthesis output, not in `question_responses`). On cycle 2 synthesis, the JOIN sees the FRESH question text from cycle 2's INSERT — if claimant answered Q1 in cycle 1 with text X, and Q1 is re-emitted in cycle 2 with same hash, the prompt sees the same text + the same answer. If Q1 not re-emitted in cycle 2, the JOIN drops it (response orphaned but preserved in `question_responses` for audit).
- If synthesis prompt would exceed token budget on claims with many cycles → TECH_DEBT 11K (multi-cycle summarization). Not in MVP.

**Empty cycle 1 case:** on first synthesis pass, `question_responses` is empty → query returns 0 rows → "Previous claimant responses" section omitted from prompt.

---

## Re-cycle Behavior (REVISED)

(Same as v1.6 with explicit `question_responses` semantics added.)

**Cycle 2 flow:**

1. Claim in `pending_info` (post adjuster Request Info OR synthesis-triggered).
2. Claimant either uploads document OR submits question responses via SPRINT-UI-002 portal:
   - Upload path (existing): claim → processing.
   - Response submit path (NEW per design004.2): RPC `finalize_question_responses` UPSERTS rows into `question_responses` AND fires `claim/responses.submitted` event AND transitions claim → processing (atomic).
3. Re-extraction (new docs only, if any).
4. `claim/extraction.completed` → re-validation (UPSERT `pass_number=2`).
5. `claim/validation.completed` → re-synthesis.
6. **synthesis_results: DELETE WHERE claim_id=$1 AND pass_number=3, then INSERT new.** (UNCHANGED — `pass_number=3` literal stable across cycles.)
7. **question_dispatches: NOT touched.** Records of cycle 1 dispatches preserved (notification metadata too).
8. **question_responses: NOT touched.** Records of cycle 1 responses preserved (same claim_id+question_id PK; if Q1 re-emitted in cycle 2 and claimant re-responds, UPSERT updates response_value with latest. Old value lost from row but logged in audit_log via `claimant_response_submitted` action history.)
9. Final claim.status per design001.11 B.1 (synthesis-triggered transitions).

**Question identity preservation across cycles:** if cycle 2 emits same question hash (`payload->>'id'`) as cycle 1 → JOIN with `question_responses` shows existing answer → synthesis prompt sees `Q: ... A: ...` → can decide if answer resolves the gap or generates new question. Deterministic hashing (per design002.5 Decision 5) ensures stable IDs across cycles for same evidence.

---

## Sprint Sequence (UPDATED)

```
SPRINT-002D ✅ (PR #65 merged)
   ↓
SPRINT-003A ✅ (PR #66 merged)
   ↓
SPRINT-UI-001 ✅ (PR #68 merged)
   ↓
DESIGN sign-off (joint: design001.11 + design002.8 + design004.2)
   ↓
SPRINT-UI-002 implementation spec (sprint_ui002.1)
   ↓
SPRINT-UI-002 dispatch → Codex (~3 weeks)
   ↓
PILOT READY
   ↓
[Customer Discovery → first LOI]
   ↓
SPRINT-PROD-BLOCK
```

---

## Done Criteria

- [x] All v1.1-v1.6 decisions resolved.
- [x] Decision 2 separated (synthesis_results + question_dispatches).
- [x] question_dispatches PK composite, last_dispatched_by added.
- [x] **question_dispatches notification metadata columns added (4 new cols).**
- [x] **Decision 6 expanded: synthesis prompt receives question_responses on cycle 2+.**
- [x] **Re-cycle behavior preserves both question_dispatches and question_responses.**
- [x] **pass_number=3 literal preserved across cycles (DELETE+INSERT pattern explicit).**
- [ ] **Joint Architect sign-off with design001.11 + design004.2.**
- [ ] sprint_ui002.1 implementation spec drafted.

---

## Cross-References

- `design001.11_state_machine_06_05.md` — claimant audit actions + state transitions (concurrent revision, joint sign-off).
- `design002.7_synthesis_decomposition_06_05.md` — predecessor (→ archive on sign-off).
- `design003.4_ui_requirements_06_05.md` — UI-001 (no changes triggered by claimant flow).
- `design004.2_claimant_responses_06_05.md` — claimant flow iteration 2 (concurrent revision, joint sign-off).
- `s11.1-11.3.4_validation_spec_06_05.md` — claim_validations pattern reference.
- `sprint003a.3_synthesis_implementation_06_05.md` — synthesis MVP (PR #66 merged).
- `sprint_ui001.2_brief_view_implementation_06_05.md` — adjuster UI (PR #68 merged).
- `sprint_ui002.1` (TBD) — claimant UI implementation spec.

---

## Version

design002 — iteration 8 (v1.7) — 06/05/2026
**Filename:** `design002.8_synthesis_decomposition_06_05.md`
**Status:** Concurrent revision with design001.11 + design004.2. Joint sign-off pending.
**Predecessor:** v1.6 / iteration 7.
**Next step:** Architect joint review across the trio.
