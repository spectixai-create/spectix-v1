# CEO Handoff - Next Chat

Updated after PR #68 / SPRINT-UI-001 merge.

## Bootstrap Reading Order

For new CEO chats, read in this order:

1. `docs/CURRENT_STATE.md`
2. `docs/agents/workflow/ACTIVE_GATES.md`
3. `docs/agents/workflow/CHAT_TRANSITION_LOG.md`
4. `docs/management/designs/design001.10_state_machine_06_05.md`
5. `docs/management/designs/design002.7_synthesis_decomposition_06_05.md`
6. `docs/management/designs/design003.4_ui_requirements_06_05.md`
7. `docs/management/sprints/sprint_ui001.2_brief_view_implementation_06_05.md`

External Project Knowledge upload is no longer required for canonical repo
state, but `design004.1_claimant_responses_06_05.md` currently remains external
and pending user decisions before SPRINT-UI-002.

## Current Date And Repo State

- Date: 2026-05-06
- Repo: `spectixai-create/spectix-v1`
- Local path: `C:\Users\smart\spectix`
- main HEAD: `51d6dee22ffdd614f224582fe86b707ca6c8b345`
- Latest merged PR: #68, `SPRINT-UI-001: Adjuster brief view MVP`
- Remaining open PR: #47, `Record OpenClaw Slack routing blocker`

## Completed Sprints

- SPRINT-002B - Priority subtype extraction routes.
- SPRINT-002C - Validation layers 11.1-11.3.
- SPRINT-002D - `errored` recovery and soft cost cap.
- SPRINT-003A - Deterministic synthesis MVP.
- SPRINT-UI-001 - Adjuster brief view MVP.

## Current Active Task

SYNC-006 post-PR68 docs-only state sync.

## PR #68 Final State

- PR URL: <https://github.com/spectixai-create/spectix-v1/pull/68>
- Merge method: squash.
- Merge commit / current main HEAD:
  `51d6dee22ffdd614f224582fe86b707ca6c8b345`
- PR head before merge: `0420a1efec0b2a6f394fbfc337960f1343244eb2`
- Base before merge: `21b63dc97f622fff7489c9f2228bb84956b1d1f6`
- Branch retained: yes.
- Non-production UI smoke: PASS after fix-forward.
- Scenarios 1-10: PASS.
- Production Supabase touched: no.
- Deploy run by Codex: no.

## Current Product Surface

- `/dashboard` claims list.
- `/claim/[id]` adjuster brief view.
- Findings, documents, validation, and audit tabs.
- Approve, reject, request-info, escalate, and unescalate actions.
- `question_dispatches` support.
- `claims.escalated_to_investigator` support.
- Hebrew RTL adjuster UI.

## Next Gate

After SYNC-006, the next gate is SPRINT-UI-002 planning / pre-flight, not
implementation.

SPRINT-UI-002 may proceed only after:

1. User decisions on claimant response design:
   - Decision 1: notification channel.
   - Decision 2: claimant auth method.
   - Decision 8: re-cycle trigger.
2. Codex pre-flight on email/SMS infrastructure in current `main`.
3. CEO GPT gate approval.

If the user reports the first signed LOI from an Israeli travel insurer, the
next gate becomes SPRINT-PROD-BLOCK by default rather than UI-002.

## Customer Discovery Track

- Target: 5 conversations with Israeli travel insurers.
- Trigger to PROD-BLOCK: first signed LOI.

## Hard Prohibitions

- No production Supabase.
- No production smoke.
- No deploy.
- No SPRINT-UI-002 implementation without gate approval.
- No `.env.local` edits.
- No secrets.
- No native OpenClaw orchestration.
- No cron.
- No 24/7 operation.
- No auto-merge.
- No auto-deploy.

## First Action For New CEO Chat

Read:

1. `docs/CURRENT_STATE.md`
2. `docs/agents/workflow/ACTIVE_GATES.md`
3. `docs/agents/workflow/CHAT_TRANSITION_LOG.md`

Then review SYNC-006 and decide the next planning gate.
