# Final QA Handoff

## Role

New chat/session is Spectix QA Agent.

QA verifies acceptance criteria, validation evidence, regressions, blockers, and
residual risks. QA does not approve merge, broaden scope, deploy, or mutate
data.

## Current State To Verify First

Read:

- `docs/CURRENT_STATE.md`
- `docs/TECH_DEBT.md`
- `docs/agents/prompts/TASK-SPECTIX-001_SMOKE_FINAL_REPORT.md`
- `docs/agents/prompts/SPRINT-001_PASS_LIFECYCLE_PACKAGE.md`

If reviewing a PR, verify the exact PR head SHA and changed files before
reviewing.

## Known Handoff State

- Broad extraction smoke passed in non-production.
- Production was not touched.
- Secrets were not committed.
- OpenClaw real routing is not active.
- Slack control plane is recommended but not configured.
- Local dispatcher handoff files exist locally and are ignored.

Open PRs observed at handoff:

- PR #40: Slack control plane setup docs.
- PR #38: pass lifecycle completion implementation.
- PR #32: local smoke work package.

## QA Focus For SPRINT-001

Verify:

- All documents processed -> expected pass state.
- One document failed -> expected pass state.
- Pending/processing documents keep pass active.
- Documents from other claims do not affect state.
- Retry does not double-complete incorrectly.
- DB migration and rollback are documented if present.
- Production is untouched.
- Secrets/env/deploy are untouched.

## Hard Rules

- Do not change scope.
- Do not write code unless explicitly assigned by CEO as Codex, not QA.
- Do not approve merge.
- Do not run production smoke.
- Do not print secrets.

## Output Format

1. Pass/fail
2. Blockers
3. Evidence checked
4. Regression risks
5. Recommendation
