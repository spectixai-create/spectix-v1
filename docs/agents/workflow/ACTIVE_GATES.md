# Active Gates

Updated after PR #76 / DEMO-POLISH-001.

## Current Main

- Repo: `spectixai-create/spectix-v1`
- Current main HEAD:
  `4bdaf6dcaac0244ccfd1f0d7258ab7cfc8b5ea8a`
- Latest merge: PR #76,
  `DEMO: Polish UI-002B manual link sharing and demo script`
- Remaining open PR: #47, `Record OpenClaw Slack routing blocker`

## Recently Merged

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

## Current Approved / Not Approved

Approved:

- Docs-only planning and customer discovery package work.
- Manual UI-002B insurer demo preparation from existing non-production/demo
  materials.

Not approved:

- UI-002C implementation.
- Production Supabase.
- Non-production Supabase mutation unless explicitly gated.
- Smoke unless explicitly gated.
- Deploy.
- Resend integration or provider sends.
- DNS changes.
- Vercel environment changes.
- Twilio, SMS automation, or WhatsApp automation.
- OpenClaw/native orchestration.
- Cron.
- 24/7 operation.
- Auto-merge.
- Auto-deploy.

## SPRINT-UI-002B State

- Status: complete and merged.
- Manual demo polish: complete and merged via PR #76.
- Current working MVP flow: adjuster receives `magic_link_url` and shares it
  manually with the claimant.
- Notifications are still not implemented.

Shipped core scope:

- Claimant magic links.
- Draft responses and finalized question responses.
- Document-to-question linking.
- Public claimant RTL page at `/c/[claim_id]`.
- Claimant draft/upload/finalize APIs.
- Adjuster dispatch/regenerate-link endpoints returning manual-share URL.
- Dispatch badges, copy-link support, copy fallback polish, and no-contact
  manual-share state.
- Response recycle Path A and Path B.
- D-029 registered.

## UI-002C Gate

UI-002C is deferred/skipped and is not approved automatically.

Future UI-002C scope is email-only via Resend per D-030. No Twilio, no SMS
fallback, no WhatsApp automation, and no multi-provider fallback are approved
for MVP.

UI-002C readiness remains deferred until:

1. Resend account exists.
2. `spectix.co.il` domain is registered.
3. DKIM/SPF/DMARC are configured and Resend domain verification passes.
4. Resend webhook secret is generated/configured.
5. Vercel non-production env readiness is verified for `RESEND_API_KEY`,
   `RESEND_WEBHOOK_SECRET`, and `APP_BASE_URL`.
6. CEO GPT approves UI-002C dispatch.

UI-002C must not start automatically.

## Manual UI-002B Demo / Customer Discovery Gate

The active next gate is insurer demo package execution, customer discovery, and
LOI qualification.

Do not run smoke, mutate Supabase, deploy, touch production, configure
notifications, or start UI-002C unless a future prompt explicitly approves that
gated action.

## SPRINT-PROD-BLOCK Gate

If the user reports the first signed LOI from an Israeli travel insurer, the
next gate becomes SPRINT-PROD-BLOCK by default rather than UI-002C.

Customer discovery parallel track:

- Target: 5 conversations with Israeli travel insurers.
- Trigger to PROD-BLOCK: first signed LOI.

## Supabase Gate

Allowed non-production target:

`aozbgunwhafabfmuwjol`

Forbidden production project:

`fcqporzsihuqtfohqtxs`

Production Supabase remains forbidden unless SPRINT-PROD-BLOCK is explicitly
approved.

## Deployment Gate

Deploy remains not approved unless explicitly approved.

## OpenClaw / Automation Gate

OpenClaw/native orchestration remains not approved.

Cron, 24/7 operation, auto-merge, and auto-deploy remain not approved.

## Merge Rule

Docs-only PRs can be merged after:

1. Docs-only diff is verified.
2. Validation passes.
3. No runtime, migration, Supabase mutation, smoke, claim creation, upload,
   deploy, or production action occurred.
4. CEO explicitly approves merge.
