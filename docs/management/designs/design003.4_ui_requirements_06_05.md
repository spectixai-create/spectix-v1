# SPRINT-DESIGN-003 — UI Requirements + Adjuster Brief View (iteration 4)

**Date:** 06/05/2026
**Identifier:** SPRINT-DESIGN-003
**Iteration:** 4
**Type:** Design only.
**Predecessor:** iteration 3 (`design003.3`). Superseded after Architect joint review identified blockers across the trio.

**Status:** All Architect blockers + polish addressed. Joint final sign-off pending.

---

## Changes From Iteration 3

| #   | Change                                                                                                          | Trigger                   |
| --- | --------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 1   | Migration 0008: question_dispatches PK = composite `(claim_id, question_id)`; `last_dispatched_by` column added | Architect Blocker #1 + #2 |
| 2   | API request-info body field unified: `question_ids` (no `selected_` prefix)                                     | Architect Blocker #3      |
| 3   | API request-info guard: `WHERE status IN ('ready', 'pending_info')` (idempotent)                                | Architect Blocker #4      |
| 4   | Demo acceptance criteria #10: end-to-end happy path narrative                                                   | Architect Blocker #5 (a)  |
| 5   | Cycle proof: pre-built example claim, no live SQL during demo                                                   | Architect Blocker #5 (b)  |
| 6   | API route count corrected: "6 routes" (was incorrectly 7)                                                       | Architect Polish #7       |
| 7   | Unescalate route added: `/api/claims/[id]/unescalate`                                                           | Architect Polish #8       |
| 8   | TECH_DEBT 11x reference removed (collision with SPRINT-002D); admin retry UI = TECH_DEBT 11A                    | Architect Polish #9       |

---

## Resolved Decisions (final)

### Decision 1 — Routing: Hybrid (Next.js routes + tab params) — UNCHANGED

`/claims`, `/claims/[id]?tab=findings|docs|validation|audit`, `/login`.

### Decision 2 — Read-Time: Snapshot + refresh button + partial state banner — UNCHANGED

### Decision 3 — Action Buttons: Hybrid mode — UNCHANGED from iteration 2 (with integration)

| Action           | Type             | DB Effect                                                                              |
| ---------------- | ---------------- | -------------------------------------------------------------------------------------- |
| **Approve**      | External logging | Audit `adjuster_decision_approve`. State `ready → reviewed` (per design001.10 B.5).    |
| **Request Info** | Internal         | Writes to `question_dispatches`. State `ready → pending_info` (per design001.10 B.5).  |
| **Escalate**     | Internal flag    | `claims.escalated_to_investigator = true`. NO state change. Audit `adjuster_escalate`. |
| **Reject**       | External logging | Audit `adjuster_decision_reject` with reason. State `ready → rejected`.                |

### Decision 4 — Findings Presentation: Hybrid table → expand to card — UNCHANGED

### Decision 5 — Question Workflow (REVISED — question_dispatches integration)

**Workflow:**

1. Synthesis emits questions into `synthesis_results` (kind='question') per cycle (per SPRINT-003A).
2. UI fetches questions via LEFT JOIN with `question_dispatches`:
   ```sql
   SELECT
     sr.payload->>'id' AS id,
     sr.payload->>'text' AS text,
     sr.payload->>'related_finding_id' AS related_finding_id,
     sr.payload->>'expected_answer_type' AS expected_answer_type,
     qd.last_dispatched_at IS NOT NULL AS is_dispatched,
     qd.last_dispatched_at,
     qd.edited_text
   FROM synthesis_results sr
   LEFT JOIN question_dispatches qd
     ON qd.claim_id = sr.claim_id
     AND qd.question_id = sr.payload->>'id'
   WHERE sr.claim_id = $1
     AND sr.pass_number = 3
     AND sr.kind = 'question';
   ```
3. UI displays each question with checkbox:
   - Default checked: NOT dispatched yet.
   - Default unchecked: already dispatched (greyed out, with "נשלח: <last_dispatched_at>" indicator).
   - Adjuster can re-check a dispatched question to re-dispatch (last_dispatched_at + last_dispatched_by updated).
4. Inline edit per question (optional, MVP-acceptable to defer).
5. "Send Selected" button at bottom.

**On Send Selected:**

- API receives `{ question_ids: string[], edited_texts?: Record<string, string> }`.
- For each question_id: UPSERT into `question_dispatches` (per design002.7 logic with composite PK).
- State transition: `ready → pending_info` (idempotent guard, accepts already-pending_info).
- Audit log entry with action=`adjuster_request_info`.
- Email/SMS to claimant: **NO-OP for MVP demo** (logs intent only).

**Re-dispatch case:** if adjuster re-sends already-dispatched questions:

- `last_dispatched_at` + `last_dispatched_by` updated.
- `first_dispatched_at` + `dispatched_by` preserved.
- New audit log entry.
- State stays `pending_info` (idempotent — guard accepts).

### Decision 6 — Document Viewer: New tab via signed Supabase URL — UNCHANGED

### Decision 7 — Pass Timeline: Text breakdown — UNCHANGED

---

## MVP UI Scope (Final, Updated)

### Pages (UNCHANGED)

| Path                          | Purpose                     |
| ----------------------------- | --------------------------- |
| `/claims`                     | List                        |
| `/claims/[id]`                | Brief, default tab=findings |
| `/claims/[id]?tab=docs`       | Documents                   |
| `/claims/[id]?tab=validation` | Validation layers           |
| `/claims/[id]?tab=audit`      | Audit log                   |

### API Routes (7 routes)

| Route                           | Method | Purpose                                                                                                                                                                                                                                                                                            |
| ------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/claims`                   | GET    | List with filters/sort/pagination.                                                                                                                                                                                                                                                                 |
| `/api/claims/[id]`              | GET    | Full claim detail. Single round-trip: claims + passes + claim_validations + synthesis_results + question_dispatches + audit_log.                                                                                                                                                                   |
| `/api/claims/[id]/approve`      | POST   | `ready → reviewed`. Audit.                                                                                                                                                                                                                                                                         |
| `/api/claims/[id]/reject`       | POST   | `ready → rejected`. Body: `{ reason: string }`. Audit.                                                                                                                                                                                                                                             |
| `/api/claims/[id]/escalate`     | POST   | Set `escalated_to_investigator=true`. NO state change. Audit.                                                                                                                                                                                                                                      |
| `/api/claims/[id]/unescalate`   | POST   | Set `escalated_to_investigator=false`. NO state change. Audit.                                                                                                                                                                                                                                     |
| `/api/claims/[id]/request-info` | POST   | UPSERT into question*dispatches. State guard: `WHERE status IN ('ready', 'pending_info')` (idempotent — already pending_info → no-op UPDATE on claim, but UPSERT on dispatches still updates last_dispatched*\*). Audit. Body: `{ question_ids: string[], edited_texts?: Record<string,string> }`. |

**Auth:** existing pattern from main. All routes require authenticated user.

**Out-of-scope routes (not in MVP):**

- Admin retry endpoint for `errored` claims (per SPRINT-002D, not yet UI-accessible) — TECH_DEBT 11A.
- Cost cap raise endpoint — V2.
- Manual override (compensation policy E.1-E.4) — UX sprint.

### Migration `0008_ui_support.sql` (REVISED)

```sql
BEGIN;

-- Adjuster escalation flag
ALTER TABLE claims ADD COLUMN escalated_to_investigator boolean NOT NULL DEFAULT false;

-- Question dispatches table (separate from synthesis_results per design002.7)
CREATE TABLE question_dispatches (
  question_id text NOT NULL,
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  first_dispatched_at timestamptz NOT NULL,
  last_dispatched_at timestamptz NOT NULL,
  dispatched_by uuid NOT NULL REFERENCES auth.users(id),
  last_dispatched_by uuid NOT NULL REFERENCES auth.users(id),
  edited_text text,
  PRIMARY KEY (claim_id, question_id)
);
CREATE INDEX idx_question_dispatches_claim ON question_dispatches(claim_id);

-- Add audit_log actions if constrained (Codex inspects first):
-- adjuster_decision_approve, adjuster_decision_reject, adjuster_request_info,
-- adjuster_escalate, adjuster_unescalate (5 new actions)

COMMIT;

-- down: reverse all + audit_log if changed.
```

**3 schema changes:** 1 new column on claims + 1 new table (with composite PK) + 1 audit_log.action CHECK update (5 new actions).

### State Machine Integration (concurrent with design001.10)

design001.10 incorporates concurrently with this design:

- B.5 matrix: 3 new ready transitions (Approve/Request Info/Reject).
- B.6 new section: adjuster action effects table (5 actions including unescalate).
- Section A: `escalated_to_investigator` flag documented as orthogonal to status.
- H.2: 5 new audit actions documented.

**Both documents sign off jointly.** No post-merge update needed.

---

## Hebrew + RTL (UNCHANGED)

(UI string table from iteration 2.)

---

## Tech Stack (UNCHANGED)

Next.js + Supabase + Tailwind + shadcn/ui (existing).

Forbidden: new rendering library, state management, i18n library, PDF library.

---

## Out of Scope (SPRINT-UI-001) — UPDATED

(All items from iteration 2 plus:)

- **Admin retry endpoint UI** for `errored` claims (TECH_DEBT 11A). Endpoint exists per SPRINT-002D but no UI access.
- **Cost cap raise endpoint UI**. V2.
- **Manual override** compensation policy. UX sprint.

---

## SPRINT-UI-002 Timeline Gate (NEW per Architect feedback)

**Per Architect:** "SPRINT-UI-002 starts within X weeks of SPRINT-UI-001 merge, before pilot LOI."

**Gate:** SPRINT-UI-002 (claimant-facing question response flow) must be designed and dispatched within **2 weeks of SPRINT-UI-001 merge**, BEFORE customer pilot LOI is signed.

Rationale: without SPRINT-UI-002, the re-cycle path (`pending_info → processing → ready` again) cannot be demoed end-to-end. Demo will show:

- Forward path: claim → ready (pristine).
- Forward path: claim → pending_info (synthesis-triggered).
- Adjuster Request Info: claim → pending_info (adjuster-triggered).
- Re-cycle: visible in DB state but NOT demoed via UI.

This is acceptable for **demo to insurer prospect**, NOT acceptable for **pilot operation**. SPRINT-UI-002 closes the gap.

---

## Demo Acceptance Criteria (UPDATED per Architect feedback)

For SPRINT-UI-001 to qualify as "DEMO READY" per D-023:

1. **Adjuster opens `/claims` list:** sees claims sorted by readiness score, filter by status works.
2. **Opens claim in `ready`:** sees findings (table → expand), questions, score, pass timeline. Approve/Reject/Request Info/Escalate buttons visible and active.
3. **Clicks Approve:** claim transitions to `reviewed`. Audit visible in audit tab.
4. **Opens claim in `pending_info`:** sees questions section with dispatch indicators. Can review and Send Selected questions to claimant (no-op email but audit + state recorded).
5. **Clicks Escalate:** flag set, audit visible. Claim still actionable. Click Unescalate to clear.
6. **Opens claim in `errored`:** sees "System error" banner. NO retry button (admin-only path, V2).
7. **Documents tab:** click document → opens PDF in new tab.
8. **Validation tab:** sees 3 layer cards with status badges.
9. **Audit tab:** sees full chronological action history.
10. **End-to-end happy path narrative:** from `/claims` list, adjuster opens one claim, reviews findings, clicks Approve, sees transition to `reviewed`. Total time < 60 seconds, no backend errors. Proves demo flow runs live, not on paper.

**Cycle proof (NOT in live demo — pre-built example):**

Before the insurer prospect demo, prepare an example claim that has already gone through cycle 2:

- Cycle 1 emitted Q1, Q2 (both dispatched by adjuster).
- Claimant uploaded a new document.
- Re-synthesis ran: Q1 still relevant (same hash), Q2 no longer needed (dropped from synthesis_results).
- New finding F3 introduced.

In the demo, walk the prospect through:

- Audit tab showing the chronology: synthesis_started (cycle 1), adjuster_request_info, claimant upload, validation_completed (cycle 2), synthesis_started (cycle 2), synthesis_completed.
- Questions section showing Q1 with `dispatched=true, last_dispatched_at=T1` (preserved), Q2 absent (no longer in synthesis_results), F3 visible as new finding.
- Narrative: "claimant UI in SPRINT-UI-002 makes this claimant-driven; today the system already supports the cycle correctly."

No live SQL, no manual triggering during the demo. The example claim is the artifact.

---

## Sprint Sequence (UPDATED with gate)

```
[NOW] PR #66 awaits CEO GPT merge.
   ↓
DESIGN sign-off (joint: design001.10 + design002.7 + design003.4)
   ↓
sprint_ui001.1 implementation spec
   ↓
SPRINT-UI-001 dispatch → Codex
   ↓ (~1 week)
DEMO READY (per acceptance criteria above)
   ↓
[GATE: within 2 weeks]
SPRINT-UI-002 design + implementation (claimant question response)
   ↓
PILOT READY (per D-023)
   ↓
[Customer Discovery → first LOI]
   ↓
SPRINT-PROD-BLOCK + SPRINT-PILOT
```

---

## Done Criteria for DESIGN-003

- [x] Iteration 1: skeleton.
- [x] Iteration 2: 7 decisions resolved.
- [x] Iteration 3: question_dispatches integration. Joint with 001.9 + 002.6.
- [x] **Iteration 4 (this): Architect blockers + polish addressed. Joint with 001.10 + 002.7.**
- [x] SPRINT-UI-002 timeline gate.
- [x] Demo acceptance criteria #10 added.
- [x] Cycle proof: pre-built example claim, no live SQL.
- [x] API field naming unified (`question_ids`).
- [x] Idempotent guard on request-info.
- [x] Unescalate route added.
- [x] TECH_DEBT 11A reference (admin retry UI).
- [ ] **Joint Architect final sign-off with design001.10 + design002.7.**
- [ ] sprint_ui001.1 implementation spec.

---

## Cross-References

- `design001.10_state_machine_06_05.md` — adjuster transitions (concurrent, joint sign-off).
- `design002.7_synthesis_decomposition_06_05.md` — question_dispatches with composite PK (concurrent, joint sign-off).
- `sprint003a.3_synthesis_implementation_06_05.md` — synthesis output (PR #66).
- `sprint_ui001.1` (TBD) — UI implementation spec.

---

## Version

design003 — iteration 4 — 06/05/2026
**Filename:** `design003.4_ui_requirements_06_05.md`
**Status:** Architect blockers + polish addressed. Joint final sign-off pending.
**Predecessor:** iteration 3 — superseded.
**Next step:** Architect joint final review with design001.10 + design002.7.
