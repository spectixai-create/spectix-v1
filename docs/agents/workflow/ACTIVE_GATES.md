# Active Gates

Updated after PR #79 / Real-case tuning round 1 planning.

## Current Main

- Repo: `spectixai-create/spectix-v1`
- Current main HEAD:
  `5f428fe8a9b76b9e6c12e7885263da03bd032a03`
- Latest merge: PR #79,
  `SYNC-011: Record UI-002C completion and post-PR78 state`
- Remaining open PR: #47, `Record OpenClaw Slack routing blocker`

## Recently Merged

- #79 - SYNC-011 post-PR78 UI-002C state synchronization, merge commit
  `5f428fe8a9b76b9e6c12e7885263da03bd032a03`
- #78 - SPRINT-UI-002C claimant email notifications via Resend, email-only,
  merge commit `b4b6158712a018dda3a99ad9fcf657a901f8a328`
- #77 - SYNC-010 UI-002C email-only spec and demo package, merge commit
  `4315cf78c322a6e873bc8153dae9077909e3fa6d`
- #76 - DEMO-POLISH-001 manual magic-link copy fallback and demo script, merge
  commit `4bdaf6dcaac0244ccfd1f0d7258ab7cfc8b5ea8a`
- #75 - SYNC-009 UI-002C deferral, merge commit
  `7f2fe87e6e843bf17c276de20c7a941110771c87`
- #74 - SYNC-008 post PR #73 handoff/current-state reconcile, merge commit
  `4c03f9f7b63fdffab140968151a385231a6fda42`
- #73 - SYNC-007 post PR #72 UI-002B state sync, merge commit
  `1252ade89ddc7124d0745d2bc97f3e599ae16855`
- #72 - UI-002B claimant responses core flow, merge commit
  `ebdb75c71ff340a3e5366672521bb74b83263d59`

## Completed UI-002 State

SPRINT-UI-002 is complete on `main`.

- UI-002A pre-flight: complete.
- UI-002B claimant response core flow: complete.
- UI-002C claimant email notifications via Resend: complete.
- Manual magic-link fallback: preserved.
- Twilio/SMS/WhatsApp automation: not added and not approved.

Post-PR78 staging validation passed:

- Vercel status for `b4b6158`: success.
- Staging health: PASS, HTTP 200, `ok:true`.
- Email path: PASS.
- No-email path: PASS.
- Invalid Resend webhook signature: PASS, HTTP 400.
- Manual fallback and copy-denied fallback: PASS.
- Generated claimant link origin matched `https://staging.spectix.co.il`.
- Audit leakage scan: PASS.
- Production Supabase touched: no.
- Secrets, raw tokens, and full magic links printed: no.

## Current Approved / Not Approved

Approved:

- Docs-only planning PR for Real-case tuning round 1 / pilot-readiness
  validation.
- Customer discovery and insurer demo preparation using non-production/demo
  data.

Not approved:

- Real-case tuning execution by this planning PR.
- Production Supabase.
- Production deploy.
- Production smoke.
- Manual production actions.
- Non-production Supabase mutation unless explicitly gated.
- New smoke unless explicitly gated.
- DNS changes.
- Vercel environment changes.
- Twilio, SMS automation, or WhatsApp automation.
- OpenClaw/native orchestration.
- Cron.
- 24/7 operation.
- Auto-merge.
- Auto-deploy.

## Next Operational Gate

The next operational gate is:

**Real-case tuning round 1 / pilot-readiness validation planning.**

Canonical planning document:
`docs/management/plans/real_case_tuning_round_1_07_05.md`

This planning PR only records the validation plan. It does not start real-case
tuning, create fixtures, mutate data, run smoke, send email, deploy, or approve
production work.

If the user reports the first signed LOI from an Israeli travel insurer, the
next gate becomes SPRINT-PROD-BLOCK by default.

## Supabase Gate

Allowed non-production target:

`aozbgunwhafabfmuwjol`

Forbidden production project:

`fcqporzsihuqtfohqtxs`

Production Supabase remains forbidden unless SPRINT-PROD-BLOCK or another
production-readiness gate is explicitly approved.

## Deployment Gate

Production deploy, production smoke, and manual production actions remain
blocked unless explicitly approved under a production-readiness gate.

## OpenClaw / Automation Gate

OpenClaw/native orchestration remains blocked because PR #47 remains open.

Cron, 24/7 operation, auto-merge, and auto-deploy remain not approved.

## Merge Rule

Docs-only PRs can be merged after:

1. Docs-only diff is verified.
2. Validation passes.
3. No runtime, migration, Supabase mutation, smoke, claim creation, upload,
   deploy, or production action occurred.
4. CEO explicitly approves merge.
