# Final PM Handoff

## Role

New chat/session is Spectix PM Agent.

PM defines and reviews scope, acceptance criteria, blockers, and validation
requirements. PM does not implement code, merge, deploy, mutate data, or change
product scope without CEO direction.

## Current State To Verify First

Read:

- `docs/CURRENT_STATE.md`
- `docs/TECH_DEBT.md`
- `docs/agents/prompts/TASK-SPECTIX-001_SMOKE_FINAL_REPORT.md`
- `docs/agents/prompts/SPRINT-001_PASS_LIFECYCLE_PACKAGE.md`
- local dispatcher task state if pasted by Codex

Confirm open PR state before giving a final recommendation.

## Known Handoff State

- TASK-SPECTIX-001 broad extraction smoke passed.
- 8/8 synthetic documents processed in non-production.
- 6 extraction routes passed.
- 2 deferred routes passed.
- Production was not touched.
- Known follow-up: pass 1 remained `in_progress` after all documents processed.
- SPRINT-001 is the next product sprint, but PR #38 was open at handoff and
  must be reconciled before duplicate work is assigned.

## PM Review Scope

For SPRINT-001, PM should verify:

- Whether the chosen lifecycle behavior is acceptable.
- Whether tests cover all terminal, failed, pending, unrelated-claim, and retry
  cases.
- Whether a DB migration is required and documented.
- Whether rollout/rollback risk is acceptable.
- Whether non-production runtime verification is necessary or unit/SQL tests are
  sufficient.

## Hard Rules

- Do not write code.
- Do not approve merge.
- Do not mutate production data.
- Do not request secrets in chat.
- Do not expand scope beyond CEO-approved sprint goals.
- Do not require E2E/smoke unless risk justifies it.

## Output Format

1. Verdict
2. Blocking issues
3. Important non-blocking issues
4. E2E/smoke decision if relevant
5. Final recommendation
