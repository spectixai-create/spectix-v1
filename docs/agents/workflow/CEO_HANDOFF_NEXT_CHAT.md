# CEO Handoff - Next Chat

Updated after PR #72 / SPRINT-UI-002B merge.

## Bootstrap Reading Order

For new CEO chats, read in this order:

1. `docs/CURRENT_STATE.md`
2. `docs/agents/workflow/ACTIVE_GATES.md`
3. `docs/agents/workflow/CHAT_TRANSITION_LOG.md`
4. `docs/management/designs/design001.11_state_machine_06_05.md`
5. `docs/management/designs/design002.8_synthesis_decomposition_06_05.md`
6. `docs/management/designs/design004.2_claimant_responses_06_05.md`
7. `docs/management/designs/design004.3_claimant_responses_06_05.md`
8. `docs/management/sprints/sprint_ui002b.1_claimant_responses_core_06_05.md`

## Current Date And Repo State

- Date: 2026-05-07
- Repo: `spectixai-create/spectix-v1`
- Local path: `C:\Users\smart\spectix`
- main HEAD: `ebdb75c71ff340a3e5366672521bb74b83263d59`
- Latest merged PR: #72, `UI-002B: claimant responses core flow`
- Remaining open PR: #47, `Record OpenClaw Slack routing blocker`

## Completed Sprints

- SPRINT-002B - Priority subtype extraction routes.
- SPRINT-002C - Validation layers 11.1-11.3.
- SPRINT-002D - `errored` recovery and soft cost cap.
- SPRINT-003A - Deterministic synthesis MVP.
- SPRINT-UI-001 - Adjuster brief view MVP.
- SPRINT-UI-002A - Claimant responses pre-flight.
- SPRINT-UI-002B - Claimant responses core flow.

## Current Active Task

SYNC-007 post-PR72 docs-only state sync.

## PR #72 Final State

- PR URL: <https://github.com/spectixai-create/spectix-v1/pull/72>
- Merge method: squash.
- Merge commit / current main HEAD:
  `ebdb75c71ff340a3e5366672521bb74b83263d59`
- PR head before merge: `07d02725da51f586e6e10fb685f5b5b5a2b72bbd`
- Base before merge: `62f6b05453ab9a8cb1b2dc533f21f09355eaa6c6`
- Branch retained: yes.
- Final-head validation: PASS.
- Tests: PASS, 23 files / 356 tests.
- Non-production final-head verification: PASS on `aozbgunwhafabfmuwjol`.
- Production Supabase touched: no.
- Deploy run by Codex: no.
- Notifications sent: no.
- Resend/Twilio added: no.
- UI-002C started: no.

## Current Product Surface

- `/dashboard` claims list.
- `/claim/[id]` adjuster brief view.
- Findings, documents, validation, and audit tabs.
- Approve, reject, request-info, escalate, and unescalate actions.
- `question_dispatches` support.
- `claims.escalated_to_investigator` support.
- Claimant magic-link response core flow.
- Claimant public RTL page at `/c/[claim_id]`.
- Claimant draft/upload/finalize APIs.
- Document-to-question linking.
- Response recycle Path A and Path B.
- Manual-share URL generation for adjusters.

## Next Gate

After SYNC-007, the next gate is UI-002C notification sprint
planning/dispatch, not automatic implementation.

UI-002C may proceed only after:

1. vov confirms non-production Resend account readiness.
2. vov confirms Twilio Israel number readiness.
3. Required notification environment variables are available or declared for
   non-production.
4. CEO GPT approves UI-002C dispatch.

If the user reports the first signed LOI from an Israeli travel insurer, the
next gate becomes SPRINT-PROD-BLOCK by default rather than UI-002C.

## Customer Discovery Track

- Target: 5 conversations with Israeli travel insurers.
- Trigger to PROD-BLOCK: first signed LOI.

## Hard Prohibitions

- No production Supabase.
- No production smoke.
- No deploy.
- No UI-002C implementation without gate approval.
- No `.env.local` edits.
- No secrets.
- No notification provider sends without UI-002C approval.
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

Then review SYNC-007 and decide the next planning gate.
