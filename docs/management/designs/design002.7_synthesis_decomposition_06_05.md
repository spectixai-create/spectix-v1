**SUPERSEDED by design002.8_synthesis_decomposition_06_05.md (06/05/2026).**

# SPRINT-DESIGN-002 — Synthesis Layer Decomposition (v1.6, iteration 7)

**Date:** 06/05/2026
**Identifier:** SPRINT-DESIGN-002
**Iteration:** 7 (v1.6)
**Predecessor:** v1.5 / iteration 6 (`design002.6`). Superseded after Architect joint review identified blockers on question_dispatches PK + UPSERT semantics.

**Status:** Architect blockers addressed. Joint final sign-off pending.

---

## Changes From v1.5

| #   | Change                                                                                              | Trigger                                                  |
| --- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | question_dispatches PK changed: composite `(claim_id, question_id)` instead of single `question_id` | Architect Blocker #1 (collision risk on 64-bit hash)     |
| 2   | `last_dispatched_by` column added; `dispatched_by` semantics = first dispatcher                     | Architect Blocker #2 (re-dispatch by different adjuster) |
| 3   | UPSERT `onConflict` target updated to composite key                                                 | Per Blocker #1                                           |
| 4   | UPSERT `set` clause includes `last_dispatched_by`                                                   | Per Blocker #2                                           |

(All v1.5 changes preserved.)

---

## Inputs Confirmed

(Same as v1.4)

- D-027 + D-028 canonical wording.
- AUDIT-001 confirms event-driven canonical and Form B in main.
- D-020 single-pass; synthesis is one-shot per pass_number=3 row.

---

## Resolved Decisions

### Decisions 1, 3, 4, 5, 6, 7 — UNCHANGED FROM v1.4

(Trigger event-driven, no rules engine in MVP, MVP scope minimal, ID generation, Question structure, Readiness score with placeholder weights + 11z TECH_DEBT.)

### Decision 2 — Synthesis Output + Dispatch State Separation (REVISED)

**Resolved: Form B (pass_number int) for synthesis_results. DELETE+INSERT pattern preserved. Dispatch state moves to separate table `question_dispatches`.**

**Schema part 1: synthesis_results (UNCHANGED from v1.4)**

```sql
CREATE TABLE synthesis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  pass_number int NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kind_valid CHECK (kind IN ('finding', 'question', 'readiness_score'))
);
CREATE INDEX idx_synthesis_results_claim ON synthesis_results(claim_id);
CREATE INDEX idx_synthesis_results_claim_pass ON synthesis_results(claim_id, pass_number);
```

**No `dispatched` column.** Pure synthesis output. DELETE+INSERT in transaction per cycle.

**Schema part 2: question_dispatches (REVISED — composite PK + last_dispatched_by)**

```sql
CREATE TABLE question_dispatches (
  question_id text NOT NULL,                   -- matches synthesis_results.payload->>'id' for kind='question'
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  first_dispatched_at timestamptz NOT NULL,
  last_dispatched_at timestamptz NOT NULL,
  dispatched_by uuid NOT NULL REFERENCES auth.users(id),         -- first dispatcher (immutable)
  last_dispatched_by uuid NOT NULL REFERENCES auth.users(id),    -- most recent dispatcher (mutable)
  edited_text text,                            -- nullable, set if adjuster edited before dispatch
  PRIMARY KEY (claim_id, question_id)
);
CREATE INDEX idx_question_dispatches_claim ON question_dispatches(claim_id);
```

**Key properties:**

- **Composite PK** `(claim_id, question_id)` — eliminates collision risk if two claims happen to produce identical 64-bit hashes for different questions.
- `question_id` matches `synthesis_results.payload->>'id'` (deterministic, per design002.5 Decision 5).
- Survives synthesis re-cycle (separate table, not wiped).
- Same content across cycles → same `question_id` → existing dispatch record visible in JOIN.
- New content → new hash → new question_id → new question, no dispatch yet.
- **`dispatched_by` = first dispatcher** (immutable record of who first sent).
- **`last_dispatched_by` = most recent dispatcher** (mutable; updated on re-dispatch).
- `edited_text` preserved if adjuster edited.

**Race condition resolved:**

Cycle 1: synthesis emits Q1 (id=q_abc). Adjuster Request Info → INSERT into question_dispatches (q_abc, T1, adjuster_id).

Cycle 2 (claimant uploads doc, re-cycle):

- synthesis_results: DELETE all rows for claim+pass_number=3, INSERT new findings/questions.
- If Q1 still applicable → re-emitted with same id=q_abc (deterministic hash from same evidence).
- If Q1 no longer applicable (gap resolved) → not emitted.
- question_dispatches: NOT touched. Q1 dispatch record persists.
- UI joining synthesis_results × question_dispatches: shows Q1 with dispatched=true if still in synthesis_results AND in dispatches; or absent from list if no longer in synthesis_results.

**UI query pattern:**

```sql
SELECT
  sr.payload->>'id' AS question_id,
  sr.payload->>'text' AS text,
  sr.payload->>'related_finding_id' AS related_finding_id,
  sr.payload->>'expected_answer_type' AS expected_answer_type,
  qd.last_dispatched_at IS NOT NULL AS is_dispatched,
  qd.last_dispatched_at,                       -- UI shows "נשלח: <date>" using last_dispatched_at
  qd.first_dispatched_at,                      -- available for audit/debug, not displayed in MVP
  qd.edited_text
FROM synthesis_results sr
LEFT JOIN question_dispatches qd
  ON qd.claim_id = sr.claim_id
  AND qd.question_id = sr.payload->>'id'
WHERE sr.claim_id = $1
  AND sr.pass_number = 3
  AND sr.kind = 'question';
```

LEFT JOIN ensures questions appear regardless of dispatch state. UI displays dispatch indicator using `last_dispatched_at`.

**Persistence pattern (Request Info action) — REVISED:**

```typescript
await db.transaction(async (tx) => {
  const dispatchedAt = new Date();
  for (const question_id of question_ids) {
    await tx
      .insert(question_dispatches)
      .values({
        question_id,
        claim_id,
        first_dispatched_at: dispatchedAt,
        last_dispatched_at: dispatchedAt,
        dispatched_by: adjuster_id, // first dispatcher (immutable on conflict)
        last_dispatched_by: adjuster_id, // most recent dispatcher
        edited_text: edited_texts?.[question_id] ?? null,
      })
      .onConflictDoUpdate({
        target: [question_dispatches.claim_id, question_dispatches.question_id],
        set: {
          last_dispatched_at: dispatchedAt,
          last_dispatched_by: adjuster_id,
          edited_text:
            edited_texts?.[question_id] ?? sql`question_dispatches.edited_text`,
        },
      });
  }

  // State transition: ready → pending_info OR pending_info → pending_info (idempotent)
  await tx
    .update(claims)
    .set({ status: 'pending_info', updated_at: dispatchedAt })
    .where(
      and(
        eq(claims.id, claim_id),
        inArray(claims.status, ['ready', 'pending_info']), // idempotent guard
      ),
    );

  // Audit log
  await tx.insert(audit_log).values({
    action: 'adjuster_request_info',
    actor_type: 'human',
    actor_id: adjuster_id,
    details: { claim_id, question_ids, edited_texts }, // unified naming: question_ids (no adjuster_id duplicate)
    cost_usd: 0,
  });
});
```

**Re-dispatch:** if adjuster sends questions again, `last_dispatched_at` + `last_dispatched_by` updated. `first_dispatched_at` + `dispatched_by` preserved. State guard idempotent (already pending_info → no-op UPDATE).

---

## Re-cycle Behavior (UPDATED)

(Same as v1.4 except: question_dispatches NOT touched on cycle.)

**Cycle 2 flow:**

1. Claim in `pending_info` (post adjuster Request Info OR synthesis-triggered).
2. Claimant uploads doc → claim → processing.
3. Re-extraction (new docs only).
4. `claim/extraction.completed` → re-validation (UPSERT pass_number=2).
5. `claim/validation.completed` → re-synthesis.
6. **synthesis_results: DELETE WHERE claim_id=$1 AND pass_number=3, then INSERT new.**
7. **question_dispatches: NOT touched.** Records of cycle 1 dispatches preserved.
8. Final claim.status per design001.10 B.1 (synthesis-triggered transitions).

If cycle 2 emits same question hash as cycle 1: question appears in synthesis_results AND in question_dispatches → UI marks as already dispatched.

---

## Sprint Sequence

```
SPRINT-002D ✅ (PR #65 merged)
   ↓
SPRINT-003A ✅ (PR #66, smoke passed, awaiting merge)
   ↓
DESIGN sign-off (joint: design001.10 + design002.7 + design003.4)
   ↓
SPRINT-UI-001 implementation spec (sprint_ui001.1)
   ↓
SPRINT-UI-001 dispatch → Codex
   ↓ (~1 week)
DEMO READY
   ↓
SPRINT-UI-002 (claimant question response — gated by SPRINT-UI-001 + before pilot)
   ↓
[Customer Discovery → first LOI]
   ↓
SPRINT-PROD-BLOCK
```

---

## Done Criteria

- [x] All v1.1-v1.4 decisions resolved.
- [x] Decision 2 separated: synthesis_results pure output (DELETE+INSERT), question_dispatches separate table.
- [x] **question_dispatches PK changed to composite `(claim_id, question_id)`.**
- [x] **`last_dispatched_by` column added; `dispatched_by` immutable.**
- [x] UPSERT semantics revised: composite target + last_dispatched_by + idempotent state guard.
- [x] UI query pattern uses `last_dispatched_at`.
- [x] API field naming: `question_ids` (no `selected_` prefix).
- [x] Re-cycle behavior preserves dispatch state.
- [ ] **Joint Architect final sign-off with design001.10 + design003.4.**
- [ ] sprint_ui001.1 implementation spec drafted.

---

## Cross-References

- `design001.10_state_machine_06_05.md` — adjuster transitions (concurrent revision, joint sign-off).
- `design003.4_ui_requirements_06_05.md` — UI consumes question_dispatches (concurrent revision, joint sign-off).
- `s11.1-11.3.4_validation_spec_06_05.md` — claim_validations pattern reference.
- `sprint003a.3_synthesis_implementation_06_05.md` — synthesis output (PR #66 ready).
- `sprint_ui001.1` (TBD) — UI implementation spec.

---

## Version

design002 — iteration 7 (v1.6) — 06/05/2026
**Filename:** `design002.7_synthesis_decomposition_06_05.md`
**Status:** Architect blockers addressed. Joint final sign-off pending.
**Predecessor:** v1.5 / iteration 6.
**Next step:** Architect joint final review with design001.10 + design003.4.
