# SPRINT-001 Pass Lifecycle Package

## Sprint

SPRINT-001 — Pass lifecycle + claim-level processing completion.

## Goal

Investigate and resolve why pass 1 remained `in_progress` after all
document-level smoke processing completed.

TASK-SPECTIX-001 observed:

- all 8 synthetic smoke documents processed
- 6 extraction routes passed
- 2 deferred routes passed
- pass 1 stayed `in_progress`
- `llm_calls_made = 19`
- `cost_usd = 0.16041`

## Required Flow

CEO → Architect → PM → CEO approval → Codex → QA → CEO final approval.

No Codex implementation should start from this package alone. First verify
whether PR #38 already covers this sprint and whether it is approved, obsolete,
or needs revision.

## Architect First

Architect must inspect:

- `inngest/functions/process-document.ts`
- related Inngest functions
- pass accounting functions
- `public.upsert_pass_increment`
- migrations `0002` and `0004`
- tests around passes and `process-document`
- `docs/TECH_DEBT.md`
- `docs/CURRENT_STATE.md`
- `docs/specs/*`

Architect must answer:

1. Where is pass created?
2. Where is pass updated?
3. Why does pass remain `in_progress`?
4. Is there already a concept of claim-level pass completion?
5. What behavior do tests imply?
6. What is the safest expected lifecycle?

## Decision Options

### Option A

Pass 1 completes when all documents finish processing successfully.

Expected behavior:

- all documents processed/deferred/extracted successfully -> pass 1
  `completed`
- any document failed -> pass 1 `failed` or remains failed according to
  existing status vocabulary
- any document pending/processing -> pass 1 remains `in_progress`

### Option B

Pass 1 remains `in_progress` because it belongs to a later claim-level pipeline.

Expected behavior:

- explicit docs/tests make that lifecycle clear
- separate status marker or note prevents operators from treating it as a bug
- no ambiguous `in_progress` interpretation after document-level completion

## Codex Scope After Approval

If CEO approves implementation:

- Use one branch.
- Use one PR.
- Do not touch production.
- Do not print or commit secrets.
- Do not deploy.
- Add/update tests for terminal success, failure, pending, unrelated claim, and
  retry cases.
- Add DB migration only if investigation proves it is required and safe.
- Update docs and TECH_DEBT.

## QA Scope

QA must verify:

- behavior matches chosen option
- tests cover required cases
- migration/rollback exists if schema/function changes are present
- production not touched
- secrets/env/deploy untouched
- app runtime changes are limited to approved lifecycle path

## Open PR Reconciliation

At this handoff, PR #38 was open:

```text
Clarify pass lifecycle completion after document processing
```

The next CEO chat should review PR #38 before creating duplicate SPRINT-001
work.
