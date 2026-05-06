# Audit: PR #60 (main) vs design001.6 State Machine Spec

**Date:** 06/05/2026
**Identifier:** AUDIT-001
**Iteration:** 1
**Owner:** Codex (read-only audit, no code changes).
**Output:** structured report listing gaps between target spec and shipped main.

---

## Purpose

design001.6 (state machine + sync contracts) is the target architectural spec. PR #60 shipped SPRINT-002C without going through this spec (design refinement happened post-merge). This audit identifies:

- What from spec is already in main → confirms.
- What from spec is NOT in main → gap → categorize as SPRINT-002D (must build) OR TECH_DEBT (deferred).
- What is in main but NOT in spec → reverse drift → spec update needed.

**Read-only.** No code changes in this audit. No PR. Output = single markdown report.

---

## Audit Method

For each section below: Codex inspects main (`828e16ef…` or current HEAD), runs the listed checks, records actual state, compares to spec, flags status.

Status values:

- **MATCH** — main matches spec.
- **GAP** — spec specifies, main does not have.
- **DRIFT** — main has it, spec doesn't describe it.
- **PARTIAL** — partially aligned, details in notes.
- **N/A** — not applicable to current scope.

---

## Section A — Claim State Vocabulary

### A.1 — Allowed states (per design001.6 Section A)

Spec lists 11 states: `intake`, `documents_open`, `extraction_complete`, `validating`, `validation_complete`, `synthesizing`, `ready`, `pending_info`, `cost_capped`, `errored`, `rejected`.

**Codex check:**

```sql
-- Query 1: distinct claim status values currently in DB
SELECT status, count(*) FROM claims GROUP BY status ORDER BY count(*) DESC;

-- Query 2: CHECK constraint on claims.status (if any)
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'claims'::regclass AND contype = 'c';
```

**Report:**

- Distinct values + counts.
- CHECK constraint definition (or "none").
- Status: MATCH / GAP / DRIFT.
- For DRIFT (legacy values): list each legacy value, propose mapping (CEO approves separately per K.6).

---

## Section B — Transition Rules

### B.1 — `passes.status` column existence (K.1)

**Codex check:**

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'passes' AND column_name = 'status';
```

**Report:**

- Column exists: yes/no.
- If yes: data_type, is_nullable, column_default.
- CHECK constraint on column (if any): definition.
- Status: MATCH (spec assumes column exists with text type, CHECK in {`in_progress`, `completed`, `failed`}) / GAP / PARTIAL.

### B.2 — UPSERT on `(claim_id, pass_number)`

**Codex check:**

- Look at existing pass insertion code paths: `inngest/`, `lib/pipeline/`, validation handler from PR #60.
- Identify: do they use INSERT, UPSERT, or other?
- Spec requires: `INSERT ... ON CONFLICT (claim_id, pass_number) DO UPDATE`.

**Report:**

- Code paths inspected (file paths + line numbers).
- Pattern used in each.
- Status: MATCH / GAP / PARTIAL.

### B.3 — Forward path transitions (B.1 in spec)

For each transition row in spec B.1 (rows 1-7):

- Identify code path that performs it.
- Verify trigger, preconditions, side effects.

**Codex check (per transition):**

- Find the `transitionClaim` or equivalent function.
- Find the call site for this specific transition.
- Note any deviation from spec.

**Report:**

- Per-transition table: spec → actual → status.

### B.4 — Recovery path (B.2)

Transitions 8-10. Spec specifies:

- Row 9 re-cycle: only `created_at > previous_pass_completed_at` re-extracted.

**Codex check:**

- Locate Pass-1 finalizer logic.
- Verify re-cycle scope filter (or absence).

**Report:**

- Status, code path, deviations.

### B.5 — System failure path (B.3, per D-026)

Spec specifies `errored` state, transition to `errored` on retry-budget exceeded, recovery via admin retry.

**Codex check:**

- Search for `errored` literal in claim status enum/CHECK/code.
- Identify how Inngest function failures currently transition claim status (if at all).

**Report:**

- Status: likely GAP (errored state is post-PR-#60 design).
- Document current behavior on system failure (probably claim stays in `validating` or similar).

### B.6 — Terminal failure paths (B.4)

Rows 14-18. Includes `cost_capped` and admin rejection.

**Codex check:**

- Search for `cost_capped` literal.
- Identify cost cap enforcement code (if any).

**Report:**

- Status per row.

---

## Section C — Sync Contracts (C.1)

### C.1 — Extraction → Validation read contract

Spec specifies validation reads:

- `documents` filtered by `extracted_data->>'kind' = 'normalized_extraction'`
- Field paths `extracted_data.normalized_data.fields.<field_name>`
- broad_fallback skipped

**Codex check:**

- Inspect `lib/validation/` code from PR #60.
- Verify filter pattern.
- Verify broad_fallback handling.

**Report:**

- Status: MATCH expected (PR #60 was built per s11.1-11.3.4 spec which aligned with this contract).
- Confirm or note deviations.

---

## Section D — Race Condition Policies

### D.1-D.8 — Upload/mutation behavior per claim status

Spec specifies upload allowed/rejected per status with 409 + estimated_completion_seconds.

**Codex check:**

- Inspect upload API endpoint(s).
- Identify status check before allowing upload.

**Report:**

- Per-status table: spec → actual → status.
- Note: spec uses placeholder `estimated_completion_seconds` values (60s, 90s). Actual implementation may not include this field.

---

## Section H — Implementation Specifications

### H.1 — Cost cap enforcement

Spec specifies:

- Soft cap $2.00, NonRetriableError pattern, cost-check + LLM in same step.
- TECH_DEBT 11q for hard cap V2.

**Codex check:**

- Search for `CostCapHalt`, `cost_capped`, `total_llm_cost_usd >= 2`.
- Identify wrapper or guard around LLM calls.

**Report:**

- Likely GAP. Document current cost tracking (passes.cost_usd accumulates, but no enforcement?).
- Status, severity (does production risk overrun?).

### H.2 — Audit log convention

Spec specifies:

- Action names like `claim_extraction_completed`, `claim_validation_started`.
- `details: { claim_id, from_status, to_status, trigger, pass_number?, pass_id? }`.

**Codex check:**

- Inspect audit_log writes from PR #60 validation handler.
- Compare action names + details structure.

**Report:**

- Per-action audit: spec name → actual name → status.

### H.3 — Claim-level watchdog HR-002

Spec specifies cron query for stuck claims, transition to `errored` if updated_at < now() - 30min.

**Codex check:**

- Search for HR-002, watchdog, stuck-claim cron.

**Report:**

- Likely GAP (post-PR-#60 design). Confirm.

### H.4 — SQL state audit script

Spec provides daily query. Existence in repo expected.

**Codex check:**

- Search for state audit script in `/scripts/`, `/sql/`.

**Report:**

- Status. If absent: GAP, propose SPRINT-002D inclusion.

### H.5 — Concurrency limits per claim (K.4)

**Codex check:**

```bash
grep -rn "concurrency" inngest/ lib/inngest/
```

Find Inngest function `concurrency: { ... }` config. Spec assumes 5 per claim_id.

**Report:**

- Actual cap value, source location.
- If different from 5: H.1 cost-cap math adjustment per design001.6 K.4 instruction.

---

## Section K — Pre-Implementation Verifications

K.1 (passes.status): covered in B.1 above.
K.2 (D-019): RESOLVED.
K.3 (documents.processing_status vocabulary):

**Codex check:**

```sql
SELECT processing_status, count(*) FROM documents GROUP BY processing_status ORDER BY count(*) DESC;
```

Spec assumes `pending`, `processing`, `processed`, `failed_blocking`, `failed_non_blocking`.

**Report:**

- Distinct values + counts.
- CHECK constraint definition.
- Status: MATCH / DRIFT.

K.4 (Inngest concurrency): covered in H.5.
K.5 (Inngest SDK NonRetriableError import path):

**Codex check:**

```bash
cat package.json | grep inngest
node -e "const { NonRetriableError } = require('inngest'); console.log(typeof NonRetriableError);"
```

**Report:**

- Inngest SDK version.
- NonRetriableError import success/failure.
- If failure: alternative import path documented.

K.6 (claims.status backfill): covered in A.1 above.

---

## Output Format

Codex produces a single markdown report: `audit001.2_pr60_findings_<dd_mm>.md`

Structure:

```markdown
# AUDIT-001 Findings — PR #60 vs design001.6

**Audit date:** <YYYY-MM-DD>
**main HEAD:** <commit SHA>
**Auditor:** Codex

## Summary

- Total checks: N
- MATCH: N
- GAP: N
- DRIFT: N
- PARTIAL: N

## Findings by Section

### A.1 Claim States

- Status: ...
- Details: ...

### B.1 passes.status

- Status: ...
- Details: ...

[... per section above ...]

## Recommended Actions

### Critical Gaps (suggest SPRINT-002D)

- <list>

### Acceptable Deferrals (suggest TECH_DEBT)

- <list>

### Spec Updates Needed (drift back to spec)

- <list>

### CEO Decisions Required

- <list>
```

---

## Audit Done Criteria

- [ ] All sections audited per checks above.
- [ ] Report file created in repo at `docs/audits/audit001.2_pr60_findings_<dd_mm>.md`.
- [ ] PR opened with audit report only.
- [ ] No code changes.
- [ ] CEO reviews report and decides per finding (SPRINT-002D vs TECH_DEBT vs spec update).

---

## Version

audit001 — iteration 1 — 06/05/2026
**Filename:** `audit001.1_pr60_vs_design001_06_05.md`
**Next step:** CEO GPT writes Codex handoff. Codex executes audit, produces findings report. CEO triages findings.
