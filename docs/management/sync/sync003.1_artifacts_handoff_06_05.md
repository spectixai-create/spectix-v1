# SYNC-003 — Add Latest Planning Artifacts to docs/management/

**Date:** 06/05/2026
**Identifier:** SYNC-003
**Iteration:** 1
**Type:** Documentation only.
**Risk:** Zero.

**For:** CEO GPT to dispatch to Codex.

---

## Context

CEO Claude produced 5 new planning artifacts during autonomous work session (while User offline). They need to be committed to `docs/management/` per the structure established by SYNC-002 (PR #61).

Additionally, `design001.6` is superseded by `design001.7` per D-027; original moves to archive.

---

## Input

Attached zip: `sync003_artifacts_06_05.zip`. Contains 5 markdown files in correct subfolders.

---

## Pre-Implementation Checks (Codex)

Before opening branch:

1. Confirm main HEAD = `9bae49f79d02140513ccd537fdcbba35f2a360bf` (or current after dependent PRs).
2. Confirm `docs/management/` exists (added by PR #61).
3. Confirm none of the new files already exist (would indicate out-of-band addition):
   ```bash
   ls docs/management/plans/plan.2_overview_06_05.md 2>/dev/null && echo "EXISTS - STOP"
   ls docs/management/designs/design001.7_state_machine_06_05.md 2>/dev/null && echo "EXISTS - STOP"
   ls docs/management/designs/design002.3_synthesis_decomposition_06_05.md 2>/dev/null && echo "EXISTS - STOP"
   ls docs/management/sprints/sprint002d.2_errored_costcap_06_05.md 2>/dev/null && echo "EXISTS - STOP"
   ls docs/management/sprints/sprint003a.1_synthesis_mvp_06_05.md 2>/dev/null && echo "EXISTS - STOP"
   ```
   If any exist: STOP and escalate.
4. Confirm `docs/management/designs/design001.6_state_machine_06_05.md` exists (will be moved to archive).

If all pass: proceed. Otherwise: report and wait.

---

## Implementation Steps

1. **Branch:** `sync/management-artifacts-batch-2`

2. **Extract zip:**

   ```bash
   unzip /path/to/sync003_artifacts_06_05.zip
   # Creates 5 new files under docs/management/
   ```

3. **Move design001.6 to archive:**

   ```bash
   git mv docs/management/designs/design001.6_state_machine_06_05.md docs/management/archive/design001.6_state_machine_06_05.md
   ```

4. **Add SUPERSEDED header to archived design001.6:**

   ```bash
   # Prepend to file:
   {
     echo "# SUPERSEDED — see ../designs/design001.7_state_machine_06_05.md"
     echo ""
     echo "Per D-027 (Backend lifecycle canonical = event/pass-driven), the fine-grained 11-state vocabulary specified in this file does not match shipped main. design001.7 reflects shipped reality and moves the fine-grained vocabulary to V2 appendix."
     echo ""
     echo "Kept for planning history reference."
     echo ""
     echo "---"
     echo ""
     cat docs/management/archive/design001.6_state_machine_06_05.md
   } > /tmp/temp_design001.6.md
   mv /tmp/temp_design001.6.md docs/management/archive/design001.6_state_machine_06_05.md
   ```

5. **Update README.md (in `docs/management/`):**

   Edit the "Current Index (06/05/2026)" section:
   - **plans/**: change to "plan.1 (archive), plan.2 (current)". Or update to current = plan.2 only.
   - **designs/**: list design001.7 (current state machine) and design002.3 (current synthesis decomposition). Note design001.6 → archive, design002.1+002.2 → archive.
   - **sprints/**: add sprint002d.2 + sprint003a.1.
   - **archive/**: add design001.6, plan.1 (if moving), design002.1, design002.2.

   Or simpler: update with just current state, see below.

6. **Verify file count and integrity:**

   ```bash
   git status
   # Expected: 5 new files added, 1 file moved (renamed).
   ```

7. **Commit and push:**

   ```bash
   git add docs/management/
   git commit -m "[SYNC-003] Add latest planning artifacts; archive design001.6"
   git push origin sync/management-artifacts-batch-2
   ```

8. **Open PR.**

---

## README.md Update — Suggested Replacement Index

Replace the "Current Index" section with:

```markdown
## Current Index (06/05/2026)

### plans/

- `plan.2_overview_06_05.md` — current roadmap (post-PR #60).

### designs/

- `design001.7_state_machine_06_05.md` — Pipeline state machine + sync contracts (revised per D-027). Acknowledges event/pass-driven canonical.
- `design002.3_synthesis_decomposition_06_05.md` — Synthesis decomposition with 7 decisions resolved + self-audit fixes.

### sprints/

- `s11.1-11.3.4_validation_spec_06_05.md` — SPRINT-002C spec (PR #60 reference).
- `sprint002d.2_errored_costcap_06_05.md` — SPRINT-002D spec v1.1 (errored + cost cap).
- `sprint003a.1_synthesis_mvp_06_05.md` — SPRINT-003A implementation spec (synthesis MVP).

### audits/

- `audit001.1_pr60_vs_design001_06_05.md` — audit spec.
- `audit001.2_pr60_findings_06_05.md` — audit findings (PR #62).

### sync/

- `sync001.1_post_pr60_06_05.md` — content sync (PR #63).
- `sync002.1_management_folder_handoff_06_05.md` — folder structure (PR #61).
- `sync003.1_artifacts_handoff_06_05.md` — this batch (this PR).

### archive/

- `decisions.1_post_arch_review_06_05.md` — SUPERSEDED, used wrong D-019 numbering.
- `design001.6_state_machine_06_05.md` — SUPERSEDED by design001.7 per D-027.
- `design002.1_synthesis_decomposition_06_05.md` — superseded by 002.3.
- `design002.2_synthesis_decomposition_06_05.md` — superseded by 002.3.
- `plan.1_overview_06_05.md` — superseded by plan.2.
- `diag001.1_inngest_package_05_05.md` — DIAG-INNGEST-001 closed.
- `merge001.1_pr52_05_05.md` — PR #52 merge package.
- `smoke005.1_002c_retry_05_05.md` — SMOKE-002B-RETRY-005 passed.
```

Note: design002.1, design002.2, plan.1 are NOT in this PR's archive moves (those files weren't in this batch). If they should be moved to archive, separate task. For SYNC-003 this PR: only design001.6 is moved.

If desired, separate clean-up PR can move design002.1, design002.2, plan.1 to archive once their successors (002.3, plan.2) are in place. Or do it in this PR for cleanliness.

**Recommended:** in this PR, also move:

- `git mv docs/management/designs/design002.1_synthesis_decomposition_06_05.md docs/management/archive/`
- `git mv docs/management/designs/design002.2_synthesis_decomposition_06_05.md docs/management/archive/` (if 002.2 was uploaded somewhere - it wasn't in any prior SYNC, so likely doesn't exist)
- `git mv docs/management/plans/plan.1_overview_06_05.md docs/management/archive/`

Codex confirms which files exist before issuing git mv.

---

## PR Details

**Title:** `[SYNC-003] Add latest planning artifacts; archive superseded designs`

**Description:**

```markdown
## Purpose

Adds 5 new planning artifacts produced offline by CEO Claude:

- `plan.2_overview_06_05.md` — updated roadmap
- `design001.7_state_machine_06_05.md` — revised state machine (per D-027)
- `design002.3_synthesis_decomposition_06_05.md` — synthesis decomposition self-audited
- `sprint002d.2_errored_costcap_06_05.md` — SPRINT-002D spec v1.1
- `sprint003a.1_synthesis_mvp_06_05.md` — SPRINT-003A implementation spec

Archives:

- `design001.6_state_machine_06_05.md` (superseded by 001.7 per D-027)
- (optionally) `design002.1`, `design002.2`, `plan.1` (superseded by current iterations)

Updates `docs/management/README.md` index.

## Scope

Documentation only. No runtime code. No migrations.

## Verification

- File count: 5 added, 1+ moved to archive.
- README index updated.
- All under `docs/management/` only.
```

---

## Done Criteria

- [ ] All 5 new files at correct paths.
- [ ] design001.6 moved to archive with SUPERSEDED header.
- [ ] (optional) design002.1, design002.2, plan.1 moved to archive.
- [ ] README.md "Current Index" updated.
- [ ] No other repo files modified.
- [ ] PR opened with correct title.
- [ ] CI checks pass.
- [ ] CEO approves merge.

---

## Order Relative to Other Sprints

- **Independent of SPRINT-002D implementation.** SYNC-003 can merge anytime after PR #61/62/63 are in main.
- **Recommended:** merge SYNC-003 before SPRINT-002D dispatch. This way Codex sees latest specs in repo.
- **Not blocking SPRINT-002D dispatch.** Codex can be given sprint002d.2 spec directly via prompt even if not in repo yet.

---

## Version

sync003 — iteration 1 — 06/05/2026
**Filename:** `sync003.1_artifacts_handoff_06_05.md`
**Next step:** CEO GPT formats Codex prompt + dispatches.
