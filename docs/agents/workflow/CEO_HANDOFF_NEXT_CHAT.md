# CEO Handoff - Next Chat

Updated after PR #79 / Real-case tuning round 1 planning.

## Bootstrap Reading Order

For new CEO chats, read in this order:

1. `docs/CURRENT_STATE.md`
2. `docs/agents/workflow/ACTIVE_GATES.md`
3. `docs/agents/workflow/CHAT_TRANSITION_LOG.md`
4. `docs/management/plans/plan.2_overview_06_05.md`
5. `docs/management/plans/real_case_tuning_round_1_07_05.md`
6. `docs/management/sprints/sprint_ui002b.1_claimant_responses_core_06_05.md`
7. `docs/management/sprints/sprint_ui002c.1_claimant_email_notifications_06_05.md`
8. `docs/demo/ui002b_insurer_demo_package.md`
9. `docs/demo/ui002b_customer_discovery_questions.md`
10. `docs/demo/ui002b_demo_checklist.md`

## Current Date And Repo State

- Date: 2026-05-07
- Repo: `spectixai-create/spectix-v1`
- Local path: `C:\Users\smart\spectix`
- main HEAD: `5f428fe8a9b76b9e6c12e7885263da03bd032a03`
- Latest merged PR: #79,
  `SYNC-011: Record UI-002C completion and post-PR78 state`
- Previous product PR: #78,
  `UI-002C: claimant email notifications (Resend, email-only)`
- Remaining open PR: #47, `Record OpenClaw Slack routing blocker`

## Completed Sprints / Gates

- SPRINT-002B - Priority subtype extraction routes.
- SPRINT-002C - Validation layers 11.1-11.3.
- SPRINT-002D - `errored` recovery and soft cost cap.
- SPRINT-003A - Deterministic synthesis MVP.
- SPRINT-UI-001 - Adjuster brief view MVP.
- SPRINT-UI-002A - Claimant responses pre-flight.
- SPRINT-UI-002B - Claimant responses core flow.
- DEMO-POLISH-001 - Manual link sharing polish and demo script.
- SYNC-010 + DEMO-PACK-001 - UI-002C email-only spec and demo package.
- SPRINT-UI-002C - Claimant email notifications via Resend, email-only.

## Current Active Task

Docs-only planning PR:

- create the Real-case tuning round 1 / pilot-readiness validation plan;
- update gates and CEO handoff to reference the planning document;
- record that this planning PR does not start tuning, smoke, Supabase
  mutation, deploy, or production work.

## PR #78 Final State

- PR URL: <https://github.com/spectixai-create/spectix-v1/pull/78>
- Merge method: merge commit.
- Merge commit / current main HEAD:
  `b4b6158712a018dda3a99ad9fcf657a901f8a328`
- Scope: claimant email notifications via Resend, email-only.
- Manual magic-link fallback preserved: yes.
- Twilio/SMS/WhatsApp added: no.
- Production Supabase touched: no.
- Manual deploy run by Codex: no.
- Production smoke run: no.

Post-merge validation:

- Vercel status for `b4b6158`: success.
- Staging health: PASS, HTTP 200, `ok:true`.
- Non-production Supabase: `aozbgunwhafabfmuwjol`.
- Email path: PASS.
- No-email path: PASS.
- Invalid Resend webhook signature: PASS.
- Manual fallback and copy-denied fallback: PASS.
- Generated claimant link origin matched staging.
- Audit leakage scan: PASS.
- Secrets, raw tokens, and full magic links printed: no.

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
- Manual link copy fallback: if browser clipboard permission fails, the link
  remains visible and auto-selectable for manual copy.
- Email-only claimant notification path via Resend.
- Resend webhook route for sent/delivered/bounced/complained events.

## Next Gate

Exact next recommended action after this planning PR merge:

**CEO GPT review and decide whether to approve a separate Real-case tuning
round 1 execution gate.**

Do not start tuning, create fixtures, mutate Supabase, run smoke, send email,
or deploy from this handoff.

If the user reports the first signed LOI from an Israeli travel insurer, the
next gate becomes SPRINT-PROD-BLOCK by default.

## Customer Discovery Track

- Target: 5 conversations with Israeli travel insurers.
- Trigger to PROD-BLOCK: first signed LOI.
- Demo package docs live under `docs/demo/`.

## Hard Prohibitions

- No production Supabase.
- No production smoke.
- No production deploy or manual production action.
- No `.env.local` edits.
- No secrets.
- No raw token or full magic-link output.
- No Twilio, SMS automation, or WhatsApp automation.
- No native OpenClaw orchestration while PR #47 remains open.
- No cron.
- No 24/7 operation.
- No auto-merge.
- No auto-deploy.

## First Action For New CEO Chat

Read:

1. `docs/CURRENT_STATE.md`
2. `docs/agents/workflow/ACTIVE_GATES.md`
3. `docs/agents/workflow/CHAT_TRANSITION_LOG.md`

Then review the Real-case tuning round 1 planning PR. Do not start real-case
tuning or production-readiness work automatically.
