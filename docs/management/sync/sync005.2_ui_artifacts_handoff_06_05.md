# SYNC-005 — Add UI Design Artifacts + Archive Superseded (iteration 2)

**Date:** 06/05/2026
**Identifier:** SYNC-005
**Iteration:** 2 (revision of sync005.1)
**Type:** Documentation only.
**Risk:** Zero.

**For:** CEO GPT to dispatch to Codex.

---

## Changes From Iteration 1

| #   | Change                                                                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | sprint_ui001.1 → sprint_ui001.2 (sprint_ui001.1 had 3 blockers identified by CEO GPT: rejected status mismatch, audit_log.cost_usd column mismatch, auth.users FK risk). sprint_ui001.2 is the canonical UI implementation spec. |
| 2   | sprint_ui001.1 → archive (superseded).                                                                                                                                                                                           |

---

## Context

Design phase for SPRINT-UI-001 closed with triple sign-off on:

- design001.10 (state machine v1.9)
- design002.7 (synthesis decomposition v1.6)
- design003.4 (UI requirements iteration 4)

Implementation spec written: sprint_ui001.2 (revised after CEO GPT review of sprint_ui001.1).

Multiple intermediate iterations need archiving with SUPERSEDED headers.

---

## Input

Attached zip: `sync005_artifacts_06_05.zip`. Contains 4 markdown files:

- `docs/management/designs/design001.10_state_machine_06_05.md`
- `docs/management/designs/design002.7_synthesis_decomposition_06_05.md`
- `docs/management/designs/design003.4_ui_requirements_06_05.md`
- `docs/management/sprints/sprint_ui001.2_brief_view_implementation_06_05.md`

Plus this handoff doc: `docs/management/sync/sync005.2_ui_artifacts_handoff_06_05.md`.

---

## Pre-Implementation Checks (Codex)

Before opening branch:

1. Confirm main HEAD = `d830e6e0ef56cce7be38d0d65c2aa3b4d1e02fbe` (post PR #66 merge) or current.
2. Confirm `docs/management/` exists with subfolders.
3. Confirm none of the new files already exist:
   ```bash
   ls docs/management/designs/design001.10_state_machine_06_05.md 2>/dev/null && echo "EXISTS-STOP"
   ls docs/management/designs/design002.7_synthesis_decomposition_06_05.md 2>/dev/null && echo "EXISTS-STOP"
   ls docs/management/designs/design003.4_ui_requirements_06_05.md 2>/dev/null && echo "EXISTS-STOP"
   ls docs/management/sprints/sprint_ui001.2_brief_view_implementation_06_05.md 2>/dev/null && echo "EXISTS-STOP"
   ```
4. Identify which superseded files exist for archiving.

---

## Implementation Steps

1. **Branch:** `sync/sync005-ui-design-artifacts`

2. **Extract zip:**

   ```bash
   unzip /path/to/sync005_artifacts_06_05.zip
   ```

   Adds 4 new files in correct subfolders (designs + sprints) + sync005.2 in sync/.

3. **Move superseded designs to archive (with SUPERSEDED headers):**

   ```bash
   # design001.9 → archive (superseded by 001.10)
   ls docs/management/designs/design001.9_state_machine_06_05.md 2>/dev/null && \
     git mv docs/management/designs/design001.9_state_machine_06_05.md docs/management/archive/design001.9_state_machine_06_05.md

   # design002.6 → archive (superseded by 002.7)
   ls docs/management/designs/design002.6_synthesis_decomposition_06_05.md 2>/dev/null && \
     git mv docs/management/designs/design002.6_synthesis_decomposition_06_05.md docs/management/archive/design002.6_synthesis_decomposition_06_05.md

   # design002.5 may be in designs/ or already archived
   ls docs/management/designs/design002.5_synthesis_decomposition_06_05.md 2>/dev/null && \
     git mv docs/management/designs/design002.5_synthesis_decomposition_06_05.md docs/management/archive/design002.5_synthesis_decomposition_06_05.md

   # design002.4 may exist
   ls docs/management/designs/design002.4_synthesis_decomposition_06_05.md 2>/dev/null && \
     git mv docs/management/designs/design002.4_synthesis_decomposition_06_05.md docs/management/archive/design002.4_synthesis_decomposition_06_05.md
   ```

4. **Add SUPERSEDED headers** (prepend each archived file):

   For `design001.9`:

   ```
   # SUPERSEDED — see ../designs/design001.10_state_machine_06_05.md

   Superseded after Architect joint review on 06/05/2026 identified blockers requiring iteration 10. design001.10 is the canonical state machine specification.

   Kept for planning history reference.

   ---

   <existing content>
   ```

   For `design002.6`:

   ```
   # SUPERSEDED — see ../designs/design002.7_synthesis_decomposition_06_05.md

   Superseded after Architect joint review on 06/05/2026 identified question_dispatches PK + UPSERT semantics blockers. design002.7 is the canonical synthesis decomposition specification.

   Kept for planning history reference.

   ---

   <existing content>
   ```

   For `design002.5` (if moved):

   ```
   # SUPERSEDED — see ../designs/design002.7_synthesis_decomposition_06_05.md

   First iteration committing to Form B canonical. Superseded by 002.6 (question_dispatches separation) which was itself superseded by 002.7 (composite PK + last_dispatched_by).

   Kept for planning history reference.

   ---

   <existing content>
   ```

   For `design002.4` (if moved):

   ```
   # SUPERSEDED — see ../designs/design002.7_synthesis_decomposition_06_05.md

   Iteration 4 committed to Form A which turned out to be wrong (main uses Form B). Superseded by 002.5 → 002.6 → 002.7.

   Kept for planning history reference.

   ---

   <existing content>
   ```

5. **Move superseded sprint specs to archive:**

   ```bash
   # sprint003a.1 → archive (superseded by 003a.3)
   ls docs/management/sprints/sprint003a.1_synthesis_mvp_06_05.md 2>/dev/null && \
     git mv docs/management/sprints/sprint003a.1_synthesis_mvp_06_05.md docs/management/archive/sprint003a.1_synthesis_mvp_06_05.md

   # sprint003a.2 → archive (superseded by 003a.3)
   ls docs/management/sprints/sprint003a.2_synthesis_implementation_06_05.md 2>/dev/null && \
     git mv docs/management/sprints/sprint003a.2_synthesis_implementation_06_05.md docs/management/archive/sprint003a.2_synthesis_implementation_06_05.md

   # sprint_ui001.1 → archive (NEW: superseded by sprint_ui001.2 per CEO GPT review)
   ls docs/management/sprints/sprint_ui001.1_brief_view_implementation_06_05.md 2>/dev/null && \
     git mv docs/management/sprints/sprint_ui001.1_brief_view_implementation_06_05.md docs/management/archive/sprint_ui001.1_brief_view_implementation_06_05.md
   ```

   Note: sprint_ui001.1 is unlikely to be in `docs/management/sprints/` since it was not yet uploaded (this is the first SYNC PR for UI artifacts). The `ls && git mv` pattern handles both cases gracefully.

6. **Add SUPERSEDED headers to archived sprint specs.**

   For `sprint003a.1`:

   ```
   # SUPERSEDED — see ../sprints/sprint003a.3_synthesis_implementation_06_05.md

   First iteration of synthesis MVP spec. Superseded by 003a.2 (Form A commitment) which was superseded by 003a.3 (Form B alignment per main schema).

   Kept for planning history reference.

   ---

   <existing content>
   ```

   For `sprint003a.2`:

   ```
   # SUPERSEDED — see ../sprints/sprint003a.3_synthesis_implementation_06_05.md

   Iteration 2 committed to Form A schema which turned out to conflict with main (Form B). Superseded by 003a.3 with Form B alignment + DELETE+INSERT pattern.

   Kept for planning history reference.

   ---

   <existing content>
   ```

   For `sprint_ui001.1` (if exists):

   ```
   # SUPERSEDED — see ../sprints/sprint_ui001.2_brief_view_implementation_06_05.md

   Iteration 1 of UI implementation spec. Superseded after CEO GPT review identified 3 blockers: claims.status='rejected' was incorrect (main uses rejected_no_coverage), audit_log lacks cost_usd column, and FK to auth.users conflicts with project's permission model.

   Kept for planning history reference.

   ---

   <existing content>
   ```

7. **Update `docs/management/README.md` Current Index section.**

   Replace with:

   ```markdown
   ## Current Index (06/05/2026)

   ### plans/

   - `plan.3_overview_06_05.md` — current roadmap (post PR #66 + UI design phase complete).

   ### designs/

   - `design001.10_state_machine_06_05.md` — Pipeline state machine v1.9 with adjuster transitions + escalation flag + 5 audit actions.
   - `design002.7_synthesis_decomposition_06_05.md` — Synthesis decomposition v1.6, Form B canonical, DELETE+INSERT, question_dispatches separate table with composite PK.
   - `design003.4_ui_requirements_06_05.md` — UI requirements iteration 4 with demo acceptance criteria + SPRINT-UI-002 timeline gate.

   ### sprints/

   - `s11.1-11.3.4_validation_spec_06_05.md` — SPRINT-002C spec (PR #60).
   - `sprint002d.2_errored_costcap_06_05.md` — SPRINT-002D spec (PR #65 merged).
   - `sprint003a.3_synthesis_implementation_06_05.md` — SPRINT-003A spec (PR #66 merged).
   - `sprint_ui001.2_brief_view_implementation_06_05.md` — SPRINT-UI-001 implementation spec (ready for dispatch).

   ### audits/

   - `audit001.1_pr60_vs_design001_06_05.md` — audit spec.
   - `audit001.2_pr60_findings_06_05.md` — audit findings (PR #62).

   ### sync/

   - `sync001.1_post_pr60_06_05.md` — content sync (PR #63).
   - `sync002.1_management_folder_handoff_06_05.md` — folder structure (PR #61).
   - `sync003.1_artifacts_handoff_06_05.md` — first batch (PR #64).
   - `sync005.2_ui_artifacts_handoff_06_05.md` — this batch (this PR).

   ### archive/ (superseded, kept for history)

   - design001 iterations 1.6-1.9 (superseded by 1.10).
   - design002 iterations 2.1-2.6 (superseded by 2.7).
   - design003 iterations 3.1-3.3 (superseded by 3.4).
   - sprint003a.1, sprint003a.2 (superseded by 003a.3).
   - sprint_ui001.1 (superseded by sprint_ui001.2, if originally uploaded).
   - plan.1, plan.2 (superseded by plan.3 — to be added in future SYNC).
   - decisions.1, diag001.1, merge001.1, smoke005.1 (closed/historical).
   ```

8. **Verify no other repo files modified.**

   ```bash
   git status
   ```

   Expected: only changes in `docs/management/` directory.

9. **Commit and push:**

   ```bash
   git add docs/management/
   git commit -m "[SYNC-005] Add UI design artifacts (sprint_ui001.2) + archive superseded specs"
   git push origin sync/sync005-ui-design-artifacts
   ```

10. **Open PR with title:** `[SYNC-005] Add UI design artifacts + archive superseded specs`

---

## PR Details

**Description:**

```markdown
## Purpose

Adds 4 new design/sprint artifacts produced during UI design phase:

- design001.10_state_machine_06_05.md — state machine v1.9 with adjuster transitions
- design002.7_synthesis_decomposition_06_05.md — synthesis with question_dispatches separation (composite PK)
- design003.4_ui_requirements_06_05.md — UI requirements final iteration
- sprint_ui001.2_brief_view_implementation_06_05.md — SPRINT-UI-001 implementation spec (revision of .1 after CEO GPT identified 3 blockers: reject status, audit_log.cost_usd, auth.users FK)

Archives superseded designs and sprints with SUPERSEDED headers:

- design001.9 → archive
- design002.4, 002.5, 002.6 → archive (if any in designs/)
- sprint003a.1, sprint003a.2 → archive
- sprint_ui001.1 → archive (if in sprints/)

Updates `docs/management/README.md` Current Index.

## Scope

Documentation only. No runtime code. No migrations.

## Verification

- 4 new files at correct paths.
- Superseded files moved with proper headers.
- README index updated.
- All under `docs/management/` only.
```

---

## Done Criteria

- [ ] All 4 new files at correct paths.
- [ ] Superseded designs (001.9, 002.4-002.6 if present) moved to archive with SUPERSEDED headers.
- [ ] Superseded sprints (003a.1, 003a.2, sprint_ui001.1 if present) moved to archive with SUPERSEDED headers.
- [ ] README.md "Current Index" updated.
- [ ] No other repo files modified.
- [ ] PR opened.
- [ ] CI checks pass.
- [ ] CEO approves merge.

---

## Order Relative to Other Sprints

- **Independent of SPRINT-UI-001 dispatch.** SYNC-005 can merge anytime.
- **Recommended:** merge SYNC-005 BEFORE SPRINT-UI-001 dispatch. Codex sees current canonical specs in repo.
- **Not blocking SPRINT-UI-001 dispatch.** Codex receives sprint_ui001.2 spec in handoff prompt regardless.

---

## Version

sync005 — iteration 2 — 06/05/2026
**Filename:** `sync005.2_ui_artifacts_handoff_06_05.md`
**Predecessor:** sync005.1 — superseded by reference update (sprint_ui001.1 → sprint_ui001.2).
**Next step:** CEO GPT formats Codex prompt + dispatches.
