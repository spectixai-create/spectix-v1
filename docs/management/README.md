# Management Folder

**Purpose:** Cross-cutting planning, design, audit, and sync artifacts produced during project planning. Distinct from `docs/specs/` (per-sprint implementation specs) and `docs/project/` (anti-patterns, conventions).

**Source of authority:** The planning chats (CEO Claude + Systems Architect + CEO GPT). Files here are reference for current state of planning, not runtime contracts.

---

## Naming Convention

```
<scope>.<iteration>_<descriptive>_<dd_mm>.md
```

- **scope:** `sNN.M` (plan-overview sections), `designNNN`, `auditNNN`, `syncNNN`, `diagNNN`, `smokeNNN`, `mergeNNN`, or `plan` / `decisions` / `review` for cross-cutting management docs.
- **iteration:** running counter of file revisions. v1.0=1, v1.1=2, v2.0=3. Major/minor semantic version preserved in internal footer; iteration counter in filename.
- **dd_mm:** date.
- **descriptive:** short English description.

Examples:

- `design001.6_state_machine_06_05.md` — DESIGN-001, iteration 6.
- `s11.1-11.3.4_validation_spec_06_05.md` — sections 11.1-11.3, iteration 4.
- `decisions.1_post_arch_review_06_05.md` — decisions package, iteration 1.

---

## Folder Structure

```
docs/management/
├── README.md              ← this file
├── plans/                 ← roadmap and plan overviews
├── designs/               ← cross-cutting architectural designs
├── sprints/               ← sprint specs (also see /docs/specs/ for older)
├── audits/                ← audit specs and findings reports
├── sync/                  ← documentation sync packages
└── archive/               ← completed operational packages, superseded specs
```

---

## Current Index (06/05/2026)

### plans/

- `plan.1_overview_06_05.md` — roadmap. Covers section 11 (validation) through 17 (open questions). Items 1-9 done in main; item 10 done (PR #56). To update post AUDIT-001 to reflect SPRINT-002C DONE (PR #60).

### designs/

- `design001.6_state_machine_06_05.md` — Pipeline state machine + sync contracts. Target architecture. **Status: design complete, partial alignment with main; AUDIT-001 will identify gaps.**
- `design002.1_synthesis_decomposition_06_05.md` — Synthesis layer decomposition. **Status: skeleton (iteration 1); awaiting AUDIT-001 outputs to produce iteration 2.**

### sprints/

- `s11.1-11.3.4_validation_spec_06_05.md` — SPRINT-002C spec for validation layers 11.1-11.3. **Status: SHIPPED in PR #60.** Post-hoc canonical reference for validation pass.

### audits/

- `audit001.1_pr60_vs_design001_06_05.md` — Audit spec: compare PR #60 (main) to design001.6. Read-only audit. **Status: pending Codex execution.**

### sync/

- `sync001.1_post_pr60_06_05.md` — Documentation sync package after PR #60. Updates `docs/CURRENT_STATE.md`, appends D-020-D-026 to `docs/DECISIONS.md`, adds 11q to `docs/TECH_DEBT.md`. **Status: pending Codex implementation.**

### archive/

- `diag001.1_inngest_package_05_05.md` — DIAG-INNGEST-001 root cause + fix. CLOSED.
- `merge001.1_pr52_05_05.md` — Merge package for PR #52 (SPRINT-002B). MERGED.
- `smoke005.1_002c_retry_05_05.md` — SMOKE-002B-RETRY-005. PASSED.
- `decisions.1_post_arch_review_06_05.md` — **SUPERSEDED.** Used incorrect D-019 numbering (collided with existing D-019 = sprint methodology). Correct numbering D-020-D-026 is in `sync/sync001.1_post_pr60_06_05.md` Section 2 and gets committed to `docs/DECISIONS.md`.

---

## Dependencies Between Artifacts

```
plan.1_overview ────────→ scope of all subsequent designs/sprints
                                ↓
design001.6_state_machine ────→ s11.1-11.3.4 (post-hoc), audit001.1, design002.1
                                ↓
audit001.1 (when run) ────→ design002 iteration 2, possibly SPRINT-002D
                                ↓
sync001.1 (when applied) ─→ docs/CURRENT_STATE.md, docs/DECISIONS.md, docs/TECH_DEBT.md
                                ↓
SPRINT-003A (TBD) ────→ depends on design002 iteration 2 + AUDIT-001 findings
```

---

## Workflow

1. **CEO Claude** writes planning artifacts in this folder.
2. **Systems Architect** (separate chat) reviews designs, returns feedback.
3. **CEO Claude** revises (new iteration of file).
4. **CEO GPT** consumes finalized artifacts, writes Codex handoff packages.
5. **Codex** executes (sync apply, audit run, implementation).
6. **CEO + User** approve gates.

---

## Related Repo Locations

- `docs/specs/` — older sprint specs (per-spike specs from earlier rounds).
- `docs/project/ANTI_PATTERNS.md` — process anti-patterns log.
- `docs/CURRENT_STATE.md` — current sprint status (single source of truth for execution state).
- `docs/DECISIONS.md` — formal decisions D-001 through D-NNN.
- `docs/TECH_DEBT.md` — deferred items.
- `docs/CONVENTIONS.md` — coding conventions.
- `docs/API_CONTRACTS.md` — API surface.
- `docs/DB_SCHEMA.md` — database schema documentation.
- `docs/PM_REVIEW_CHECKLIST.md` — pre-merge checklist.

---

## Maintenance

- New iteration of a doc → new file with incremented iteration number. **Do not overwrite older iterations.** Keep history.
- Superseded files moved to `archive/` with `# SUPERSEDED — see <new file>` note at the top of the file.
- `README.md` updated when new files added or major status changes.
