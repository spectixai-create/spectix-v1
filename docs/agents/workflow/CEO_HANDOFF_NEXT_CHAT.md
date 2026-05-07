# CEO Handoff - Next Chat

Updated after PR #76 / DEMO-POLISH-001.

## Bootstrap Reading Order

For new CEO chats, read in this order:

1. `docs/CURRENT_STATE.md`
2. `docs/agents/workflow/ACTIVE_GATES.md`
3. `docs/agents/workflow/CHAT_TRANSITION_LOG.md`
4. `docs/management/sprints/sprint_ui002b.1_claimant_responses_core_06_05.md`
5. `docs/management/sprints/sprint_ui002c.1_claimant_email_notifications_06_05.md`
6. `docs/demo/ui002b_insurer_demo_package.md`
7. `docs/demo/ui002b_customer_discovery_questions.md`
8. `docs/demo/ui002b_demo_checklist.md`

## Current Date And Repo State

- Date: 2026-05-07
- Repo: `spectixai-create/spectix-v1`
- Local path: `C:\Users\smart\spectix`
- main HEAD: `4bdaf6dcaac0244ccfd1f0d7258ab7cfc8b5ea8a`
- Latest merged PR: #76,
  `DEMO: Polish UI-002B manual link sharing and demo script`
- Previous state PR: #75, `SYNC-009: Record UI-002C deferral`
- Previous product PR: #72, `UI-002B: claimant responses core flow`
- Remaining open PR: #47, `Record OpenClaw Slack routing blocker`

## Completed Sprints / Gates

- SPRINT-002B - Priority subtype extraction routes.
- SPRINT-002C - Validation layers 11.1-11.3.
- SPRINT-002D - `errored` recovery and soft cost cap.
- SPRINT-003A - Deterministic synthesis MVP.
- SPRINT-UI-001 - Adjuster brief view MVP.
- SPRINT-UI-002A - Claimant responses pre-flight.
- SPRINT-UI-002B - Claimant responses core flow.
- SYNC-007 - Post-PR72 UI-002B state sync.
- SYNC-008 - Post-PR73 handoff/current-state reconcile.
- SYNC-009 - UI-002C deferral.
- DEMO-POLISH-001 - Manual link sharing polish and demo script.

## Current Active Task

SYNC-010 + DEMO-PACK-001 docs-only package:

- record UI-002C email-only spec as deferred/gated;
- add D-030;
- update current state and handoff after PR #76;
- add insurer demo/customer discovery package for the UI-002B manual flow.

## PR #76 Final State

- PR URL: <https://github.com/spectixai-create/spectix-v1/pull/76>
- Merge method: merge commit.
- Merge commit / current main HEAD:
  `4bdaf6dcaac0244ccfd1f0d7258ab7cfc8b5ea8a`
- Scope: manual magic-link copy fallback and demo script.
- Production Supabase touched: no.
- Deploy run by Codex: no.
- Smoke run by Codex: no.
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
- Manual link copy fallback: if browser clipboard permission fails, the link
  remains visible and auto-selectable for manual copy.

## Next Gate

Exact next action: execute insurer demo/customer discovery package work for the
UI-002B manual claimant response flow.

Current accepted MVP/pilot workflow: adjusters use the UI-002B returned
`magic_link_url` and share it manually with claimants. Notifications are not
implemented.

UI-002C email automation is deferred/skipped. Future UI-002C scope is
email-only via Resend and must not start automatically.

UI-002C may be reconsidered only after:

1. Resend account exists.
2. `spectix.co.il` domain is registered.
3. DKIM/SPF/DMARC are configured and Resend domain verification passes.
4. Resend webhook secret is generated/configured.
5. Vercel non-production env readiness is verified for `RESEND_API_KEY`,
   `RESEND_WEBHOOK_SECRET`, and `APP_BASE_URL`.
6. CEO GPT approves UI-002C dispatch.

If the user reports the first signed LOI from an Israeli travel insurer, the
next gate becomes SPRINT-PROD-BLOCK by default rather than UI-002C.

## Customer Discovery Track

- Target: 5 conversations with Israeli travel insurers.
- Trigger to PROD-BLOCK: first signed LOI.
- Demo package docs live under `docs/demo/`.

## Hard Prohibitions

- No production Supabase.
- No production smoke.
- No deploy.
- No UI-002C implementation without gate approval.
- No `.env.local` edits.
- No secrets.
- No notification provider sends without UI-002C approval.
- No Resend/DNS/Vercel env changes without gate approval.
- No Twilio, SMS automation, or WhatsApp automation.
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

Then review SYNC-010 + DEMO-PACK-001. Do not start UI-002C implementation
automatically.
