# Active Gates

Updated after PR #74 / SYNC-008 and UI-002C deferral decision.

## Current Main

- Repo: `spectixai-create/spectix-v1`
- Current main HEAD:
  `4c03f9f7b63fdffab140968151a385231a6fda42`
- Latest merge: PR #74,
  `SYNC-008: Reconcile handoff and current state after PR73`
- PR #74 branch retained: yes

## Open PRs

- #47 - Record OpenClaw Slack routing blocker

## Recently Merged

- #74 - SYNC-008 post PR #73 handoff/current-state reconcile, merge commit
  `4c03f9f7b63fdffab140968151a385231a6fda42`
- #73 - SYNC-007 post PR #72 UI-002B state sync, merge commit
  `1252ade89ddc7124d0745d2bc97f3e599ae16855`
- #72 - UI-002B claimant responses core flow, merge commit
  `ebdb75c71ff340a3e5366672521bb74b83263d59`
- #71 - UI-002B source spec ingestion, merge commit
  `62f6b05453ab9a8cb1b2dc533f21f09355eaa6c6`
- #70 - UI-002A claimant responses pre-flight, merge commit
  `760e97d524822812843808aa175bd8cc57d768cc`
- #69 - SYNC-006 post PR #68 state sync, merge commit
  `004ff933e34d1d00e893f7952ccd0e2d664d9b40`
- #68 - SPRINT-UI-001 Adjuster brief view MVP, merge commit
  `51d6dee22ffdd614f224582fe86b707ca6c8b345`

## Current Approved / Not Approved

Approved:

- No implementation, smoke, deploy, production, Supabase, notification provider,
  or OpenClaw work is currently approved.
- The active gate is manual UI-002B end-to-end demo readiness / operational QA
  and customer discovery/LOI tracking. Any runtime demo, smoke, Supabase access,
  deploy, or production activity still requires explicit gate approval.

Not approved:

- UI-002C implementation.
- Production Supabase.
- Smoke unless explicitly gated.
- Deploy.
- OpenClaw/native orchestration.
- Cron.
- 24/7 operation.
- Auto-merge.
- Auto-deploy.

## SPRINT-UI-002B State

- Status: complete and merged.
- PR #72 is no longer active.
- Final-head validation: PASS.
- Unit test suite: PASS, 23 files / 356 tests.
- Final-head non-production verification: PASS on `aozbgunwhafabfmuwjol`.
- Production project `fcqporzsihuqtfohqtxs` was not touched.

Shipped core scope:

- Claimant magic links.
- Draft responses and finalized question responses.
- Document-to-question linking.
- Public claimant RTL page at `/c/[claim_id]`.
- Claimant draft/upload/finalize APIs.
- Adjuster dispatch/regenerate-link endpoints returning manual-share URL.
- Dispatch badges, copy-link support, and no-contact manual-share state.
- Response recycle Path A and Path B.
- D-029 registered.

Notifications are still not implemented.

## UI-002C Gate

UI-002C is deferred/skipped for now and is not approved automatically.

UI-002C readiness is deferred until Resend/DNS/webhook/env setup is manually
configured and verifiable:

1. vov confirms non-production Resend account readiness.
2. `spectix.co.il` DNS is configured for Resend domain verification.
3. Resend webhook setup is configured.
4. Required notification environment variables are available or declared for
   non-production.
5. Codex/CEO GPT can verify readiness without printing secrets.
6. CEO GPT approves UI-002C dispatch.

Current readiness blockers recorded by SYNC-009:

- Codex cannot safely operate the already-open browser/account sessions for
  Resend or DNS setup.
- Public DNS for `spectix.co.il` currently returns NXDOMAIN.
- Vercel env read access exists, but notification env vars are not configured.

Resend/DNS/Vercel notification setup is not blocking the current manual UI-002B
flow.

UI-002C remains a notification sprint only. It must not imply production access,
deploy, provider sends, or UI-002C implementation before explicit gate approval.

## Manual UI-002B Demo-Readiness Gate

The current working flow is manual magic-link sharing from UI-002B. Adjusters
can use the returned `magic_link_url` from dispatch/regenerate-link responses
and share it with claimants manually.

Next operational gate:

1. Prepare manual UI-002B end-to-end demo-readiness / operational QA plan.
2. Keep the customer discovery track active.
3. Do not run smoke, mutate Supabase, deploy, or touch production unless a
   future prompt explicitly approves that gated action.

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
