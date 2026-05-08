# Active Gates

Updated after PR #88 / UI-003 Part 3 completion and post-PR88 staging
verification.

## Current Main

- Repo: `spectixai-create/spectix-v1`
- Current main HEAD:
  `23936677014e32f01517f1ff0b6ffa5645acb282`
- Latest merge: PR #88, `UI-003 Part 3 demo-readiness fixes`
- Remaining open PR: #47, `Record OpenClaw Slack routing blocker`

## Recently Merged

- #88 - UI-003 Part 3 demo-readiness fixes, merge commit
  `23936677014e32f01517f1ff0b6ffa5645acb282`
- #87 - SYNC: correct UI-003 next gate after UX audit, merge commit
  `c78d6d2f995333422e73769f3d03d69b9b26035f`
- #86 - UI-003 Part 2: ToS/Privacy, currency, trip dates/pre-trip insurance,
  and homepage, merge commit
  `b1c95fc53163fc59efa4c4d2b498ae71a9970f93`
- #85 - UI-003 Part 1: design-system gate, public cleanup, HEIC, and health
  gate, merge commit `072e0d01a0eed7170699be68802a20b36a8b651b`
- #84 - Architect Track A P3 verification report, merge commit
  `9d6761515a191029c740472085f168c847e216bd`
- #83 - QA-001 pilot-readiness audit and docs drift fixes, merge commit
  `93ad93ac3467c5a1e0bd2b8aad1f40908c18dec1`
- #82 - Insurer discovery execution pack, merge commit
  `094688ec62a5bb2b1331786125c3c15e65c6822b`
- #81 - Real-case tuning round 1 validation report, merge commit
  `640f44736eb50bed02f57dec38a99fdbeeb0d4db`
- #80 - Real-case tuning round 1 pilot-readiness planning, merge commit
  `4f9993ab232495bec567b37959aafd2058669018`
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

Real-case tuning round 1:

- PR #81 merged.
- Verdict: READY.
- Report:
  `docs/management/reports/real_case_tuning_round_1_report_07_05.md`.
- Eight synthetic non-production cases were validated.
- Production touched: no.
- OpenClaw used: no.

## Completed UI-003 State

SPRINT-UI-003 is complete on `main`.

- UI-003 Part 1: complete in PR #85.
- UI-003 Part 1 scope: `/design-system` gate, public cleanup, HEIC upload
  support, and public `/api/health` info-disclosure reduction.
- UI-003 Part 2: complete in PR #86.
- UI-003 Part 2 scope: ToS/Privacy draft consent, currency selector, trip
  dates, pre-trip insurance, homepage hero, migration, and rollback.
- UI-003 Part 3: complete in PR #88.
- UI-003 Part 3 scope: authenticated UI demo-readiness fixes for navigation,
  footer, identity, Hebrew text, dashboard triage signals, question cards, tab
  counters, leading finding severity, and RTL action order.
- CAPTCHA remains blocked/deferred until Cloudflare Turnstile keys are
  provided.

Post-PR86 staging verification passed:

- `/api/health` minimal public response: PASS.
- Homepage: PASS.
- `/terms` and `/privacy`: PASS.
- Intake UI: PASS.
- Currency UX: PASS.
- Trip validation: PASS.
- Consent modal/state preservation: PASS.
- Missing consent API rejection: PASS, HTTP 400.
- Synthetic non-production intake smoke: PASS.
- Synthetic claim ID: `45bd8f76-5a42-46e7-b9b6-1f8653bb255e`.
- `consent_log` minimal row: PASS.
- Pending clarification question: PASS.
- Pending question ID: `1160f3b5-ff22-4f62-81bc-94b309eeeec8`.
- Production touched: no.
- Production Supabase touched: no.
- Deploy run: no.
- OpenClaw used: no.
- PR #47 touched: no.
- Real claimant data used: no.

Post-PR88 staging verification passed:

- Vercel status for `2393667`: success / Ready.
- `/api/health` minimal public response: PASS.
- Public `/`, `/new`, `/terms`, and `/privacy`: PASS.
- Anonymous `/design-system` blocked: PASS.
- Authenticated dashboard: PASS.
- Authenticated questions queue: PASS.
- Authenticated claim page: PASS.
- Authenticated `/design-system` direct access: PASS.
- No raw email in header by default: PASS.
- Initials/avatar dropdown visible: PASS.
- No design-system nav link: PASS.
- Clean footer: `Spectix • 2026`.
- KPI cards visible: PASS.
- Risk Band column visible: PASS.
- Claim types localized to Hebrew: PASS.
- Tab counters visible: PASS.
- Question cards include `פתח תיק`: PASS.
- Bad Hebrew plural `1 ימים` absent: PASS.
- RTL primary action order verified: PASS.
- Production touched: no.
- Production Supabase touched: no.
- Supabase mutation after merge: no.
- Deploy run manually: no.
- Vercel environment changed: no.
- Secrets, raw tokens, and full magic links printed: no.
- OpenClaw used: no.
- PR #47 touched: no.
- Outreach/contact triggered: no.

## Post-Architect UX Audit Correction

The system is functionally validated. The commercial insurer-demo readiness
blockers found by the Architect UX audit are closed by PR #88 and post-PR88
staging verification.

The next gate is now:

**Insurer outreach/demo execution decision.**

Closed UI-003 Part 3 P0 issues:

- P0.1 `/design-system` link still visible for authenticated users.
- P0.2 Authenticated footer still exposes internal Spike/build text.
- P0.3 User email visible in header; replace with initials/avatar dropdown.
- P0.4 Hebrew plural grammar issue: `1 ימים`.
- P0.5 Dashboard claim type values still shown in English.
- P0.6 Dashboard missing Risk Band column.

Completed selected UI-003 Part 3 P1 scope:

- Dashboard KPI cards.
- Tags vs status badge separation.
- Question cards primary action `פתח תיק`.
- Tabs counters.
- Leading finding severity color coding.
- RTL primary/secondary button order.

Decisions registered in UI-003 Part 3:

- D-038 - Authenticated UI treated as demo-exposed.
- D-039 - Risk Bands canonical visualization.
- D-040 - User identity rendering uses initials avatar pattern.
- D-041 - UI-003 Part 3 scope.

## Current Approved / Not Approved

Approved:

- Round 2 case sourcing and outreach material drafting without insurer contact.
- Business decision on whether to begin insurer outreach/demo execution.

Not approved:

- Insurer contact or demo execution unless explicitly approved.
- Automated outreach or customer contact by this docs PR.
- Product operations by this docs PR.
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

**Insurer outreach/demo execution decision.**

Functional validation passed and the UI-003 Part 3 commercial demo-readiness
blockers are closed. This docs PR does not contact insurers, send outreach, run
smoke, mutate Supabase, deploy, approve production work, or execute product
operations.

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
