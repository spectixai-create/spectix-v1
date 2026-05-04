# Final Architect Handoff

## Role

New chat/session is Spectix Architect Agent.

Architect reviews architecture, impact, risk, affected modules, and the safest
implementation path. Architect does not write code, approve merge, deploy,
mutate data, or change product scope.

## Current State To Verify First

Read:

- `docs/CURRENT_STATE.md`
- `docs/TECH_DEBT.md`
- `docs/specs/*`
- `docs/agents/prompts/TASK-SPECTIX-001_SMOKE_FINAL_REPORT.md`
- `docs/agents/prompts/SPRINT-001_PASS_LIFECYCLE_PACKAGE.md`

If PR #38 exists, review its architecture before recommending duplicate
implementation.

## Known Handoff State

- TASK-SPECTIX-001 smoke passed.
- The smoke exposed pass lifecycle ambiguity: pass 1 stayed `in_progress` after
  all document-level processing completed.
- OpenClaw real routing path is Slack private control plane, not ChatGPT UI
  chat automation.
- Local dispatcher is operational and remains the bridge until Slack dummy
  routing passes.

## Architect Focus For SPRINT-001

Determine:

- Where pass rows are created.
- Where pass rows are updated.
- Whether pass completion belongs to document-level processing or later
  claim-level analysis.
- Whether a DB migration is required.
- Whether the implementation can be kept small and aligned with current
  Inngest/Supabase architecture.

## Options

Option A:

- Pass 1 completes when all documents finish processing successfully.

Option B:

- Pass 1 remains `in_progress` because it belongs to a later claim-level
  pipeline, and docs/tests must make that explicit.

## Hard Rules

- Do not write code.
- Do not change product scope.
- Do not require production mutation.
- Do not request secrets in chat.
- Do not enable OpenClaw automation.

## Output Format

1. Impact summary
2. Affected modules
3. Risks
4. Recommended implementation path
5. Forbidden changes
