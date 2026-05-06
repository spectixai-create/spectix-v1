# PR #52 Merge Authorization + Post-Merge Task Queue

**Date:** 05/05/2026
**Identifier:** MERGE-PR52-001
**Predecessors:** DIAG-INNGEST-001 (Branch D resolved), SMOKE-002B-RETRY-005 (PASS)

---

# Part 1 — Merge Authorization For CEO GPT

## Decision

**APPROVED for merge: PR #52 head `f2a7fc08f7846ffbfe13ddef9cc2e7bd9adf3085`**

## Evidence basis

- SMOKE-002B-RETRY-005 ran on `86bec004dcb02cc830b1c32ff7dfdf7ea4dffee4` and passed all gates:
  - 9/9 documents reached terminal `processed` status
  - All 5 regression checks passed (police_report normalized, report_or_filing_date populated, boarding_pass normalized, flight_date populated, pass not stuck in_progress)
  - pass.status = completed
  - B2 control fixture confirmed skip/defer path works for non-MVP subtypes
- Delta between smoke-tested `86bec00` and merge target `f2a7fc0`: documentation only (`docs/TECH_DEBT.md`), per Codex confirmation in section 9 of the smoke report ("product code changed: no", "package files changed: no")
- Production project `fcqporzsihuqtfohqtxs` not touched
- Non-production smoke against `aozbgunwhafabfmuwjol` only

## Merge instructions

1. Verify on GitHub that the only file diff between `86bec00` and `f2a7fc0` is `docs/TECH_DEBT.md`. If any other file changed, abort merge and escalate.
2. Merge PR #52 to main using squash-merge.
3. Do NOT delete the branch immediately — keep `sprint/subtype-extraction-routes` available for 24h in case rollback is needed.
4. After merge, trigger the four post-merge tasks queued in Part 2.

## Risks accepted

- **Merge target ≠ smoke target SHA.** Mitigated: documentation-only delta. Procedural anti-pattern logged for future enforcement (see Part 2 task 1).
- **23 LLM calls on 9 documents not fully explained in smoke report.** Mitigated: cost within expected range ($0.026/doc), establishes baseline. Detailed breakdown queued (see Part 2 task 3).

---

# Part 2 — Post-Merge Task Queue

These four tasks execute after merge, in order. Each is independent and small.

## Task 1 — Add ANTI-PATTERN #8 to `docs/project/ANTI_PATTERNS.md`

**Title:** Codex pushed documentation changes onto smoke-validated SHA without separate PR

**Section to append:**

```markdown
## 8. Documentation Pushed Onto Smoke-Validated SHA

**Observed:** SMOKE-002B-RETRY-005 ran on `86bec00`. Codex then committed and pushed a TECH_DEBT.md update, advancing the branch HEAD to `f2a7fc0`. The merge candidate SHA was therefore one commit ahead of the smoke-validated SHA. Practical risk was zero (markdown-only change), but the scope discipline rule "do not push to PR branch" was bypassed.
**Evidence:** SMOKE-002B-RETRY-005 report, sections 7-8. Codex commands `::git-stage`, `::git-commit`, `::git-push` after smoke completion.
**Mitigation:** Codex spec rules forbidding pushes to PR branches must explicitly include documentation-only changes. Documentation updates discovered during smoke must be queued as a separate post-merge PR, not pushed onto the smoke-validated branch. Smoke reports must include the final HEAD SHA explicitly labeled "smoke-tested SHA" vs "merge-candidate SHA"; if these differ, merge requires either re-smoke or explicit CEO acknowledgment of the delta.
```

Footer version bump for `ANTI_PATTERNS.md`: previous version → next version, with note "added #8 from MERGE-PR52-001 retrospective".

## Task 2 — Sync `SPRINT-002B_STATUS.md` (still pending from earlier)

**Reason:** previously identified as stale, still describes only attempt 1. Now also needs attempt 5 PASS result.

**Section to add (after current Attempt 1 block, before any "Next Steps" footer):**

```markdown
## Smoke Retry Attempts (Final, 2026-05-05)

| Attempt | Head       | Outcome                                                                                                                                                                           | Failure layer                                  |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1       | `18cabf1a` | Reached product code. `police_report` fell back to broad `police` (missing `report_or_filing_date`). `boarding_pass` failed (missing `flight_date`). Pass 1 stayed `in_progress`. | Product (extraction contract gaps in fixtures) |
| 2       | n/a        | Stopped at preflight. `supabase/.temp/project-ref` pointed to forbidden production project.                                                                                       | Environment (CLI ref)                          |
| 3       | n/a        | Stopped at Phase A. `claim_form.synthetic.pdf` missing locally.                                                                                                                   | Environment (missing fixture)                  |
| 4       | `86bec00`  | Created claim, uploaded 9 docs, fired events. Local Inngest function registration failed (`PUT /api/inngest 500`, `POST /fn/register 404`). Documents stuck `pending`.            | Environment (Inngest registration)             |
| 5       | `86bec00`  | **PASS.** All 9 documents processed. All 5 regression checks passed. pass.status = completed. Total LLM cost: $0.231822. p95 = 49224ms.                                           | None                                           |

## Resolution

DIAG-INNGEST-001 identified Branch D — `INNGEST_BASE_URL` in `.env.local` pointed to app port 3000 instead of Inngest dev server port 8288. SDK attempted out-of-band registration via `POST /fn/register` against the app, received HTML 404, failed JSON parse, returned 500.

Fix applied: removed `INNGEST_BASE_URL` line from `.env.local` (single line, gitignored, no other change). Default behavior with `INNGEST_DEV=1` resolves correctly to dev server.

## Final Status

- PR #52 merge target: `f2a7fc08f7846ffbfe13ddef9cc2e7bd9adf3085`
- Merge: APPROVED, executed via MERGE-PR52-001
- Sprint status: COMPLETE
- Next sprint: SPRINT-003A (synthesis data model) — not yet started
```

Update version footer: `SPRINT-002B_STATUS v2.0 — 05/05/2026`. Mark previous v1.0 as "covered attempt 1 only", v2.0 as "complete history through attempt 5 PASS and merge".

## Task 3 — Request LLM call breakdown from Codex

**Prompt for Codex:**

```
Reference: SMOKE-002B-RETRY-005, claim 9222197e-2760-4c10-8b71-501a2aeb4158.

Section 6 of the smoke report states 23 LLM calls across 9 documents but the explanation does not reconcile with the count. Naive expected count is 9 (one per document) or 18 (classifier + extraction per document).

Required: query the audit log for claim 9222197e-2760-4c10-8b71-501a2aeb4158, group LLM calls by (document_id, llm_call_purpose), produce a table showing exactly which calls happened per document. Append result to `docs/agents/workflow/CODEX_REPORT_LOG.md` under heading "SMOKE-002B-RETRY-005 LLM Call Breakdown". This becomes the SPRINT-002B baseline for future cost regression detection.

No code changes. No re-runs. Read-only audit log query against non-production Supabase aozbgunwhafabfmuwjol.
```

## Task 4 — Open follow-up issue for `INNGEST_BASE_URL` onboarding fix

The misconfiguration that caused attempts 4's failure was in `.env.local`, which is per-developer. If onboarding documentation, setup scripts, or `.env.example` propagated this misconfiguration, future developers will hit the same wall.

**Investigation:**

- Check `.env.example` for `INNGEST_BASE_URL=http://localhost:3000` line. If present, remove it.
- Check `README.md`, `docs/onboarding/`, or any CONTRIBUTING-style files for instructions setting INNGEST_BASE_URL to port 3000. If present, correct.
- Check setup scripts (anything under `scripts/` or `bin/` that touches env). If present, correct.

If any of the above contains the misconfiguration, open a small fix-PR. If none do, document the finding in TECH_DEBT.md as "single-developer misconfiguration, no propagation risk identified."

---

# Part 3 — Sequencing

```
[NOW]
  └─> CEO executes merge of PR #52 to f2a7fc0
       │
       ├─> Task 1: ANTI-PATTERN #8 (small docs PR)
       ├─> Task 2: SPRINT-002B_STATUS sync (small docs PR — can be combined with Task 1)
       ├─> Task 3: LLM call breakdown (Codex audit log query, no PR)
       └─> Task 4: INNGEST_BASE_URL onboarding investigation (may yield small PR)
            │
            └─> [SPRINT-003A starts]
```

Tasks 1+2 should be combined into a single "post-SPRINT-002B documentation" PR. Tasks 3 and 4 are independent and can run in parallel.

SPRINT-003A does not start until tasks 1-4 are complete.

---

## Version

MERGE-PR52-001 v1.0 — 05/05/2026
**Decision:** approve merge of PR #52 head `f2a7fc08f7846ffbfe13ddef9cc2e7bd9adf3085`
**Authority:** CEO authorization to proceed without per-step confirmation, granted in current chat session
