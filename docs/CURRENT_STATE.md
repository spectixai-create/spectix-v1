# Current State

Updated after PR #88 / UI-003 Part 3 completion and post-PR88 staging
verification.

## Version

Spectix post PR #88 / UI-003 Part 3 complete / Post-PR88 staging verification PASS -
2026-05-08

## Current Phase

The non-production MVP pipeline covers intake, document upload,
classification, normalized extraction, validation, deterministic synthesis, the
adjuster-facing brief view, the claimant response flow, email-only claimant
notifications via Resend, and UI-003 pilot-readiness hardening.

Current `main` HEAD is
`23936677014e32f01517f1ff0b6ffa5645acb282`, the merge commit for PR #88
(`UI-003 Part 3 demo-readiness fixes`).

The accepted claimant contact flow is:

- If the claim has a claimant email, dispatch attempts a Resend email
  notification.
- The adjuster still receives a `magic_link_url`.
- Manual magic-link sharing remains preserved as the fallback and operating
  procedure.

Twilio, SMS automation, WhatsApp automation, and multi-provider fallback are not
part of the approved MVP scope.

## Completed Spikes And Sprints

- #00 - Backend foundation: schema, Supabase, Inngest scaffolding.
- #00b - Frontend foundation: Tailwind, shadcn/ui, RTL, tokens.
- #00c - UI component library expansion.
- #00d - Investigation Brief View skeleton.
- #00e - Adjuster Dashboard skeleton.
- #02 - Claim Intake Form skeleton.
- #02a - Login UI, 404, VersionFooter.
- #02b - Clarification Questions Queue skeleton.
- #00a - Backend types contract in [lib/types.ts](../lib/types.ts).
- #01 - Supabase Auth wiring.
- #00z-A - Documentation infrastructure.
- #02c-1 - Schema Gap Audit in [SCHEMA_AUDIT.md](SCHEMA_AUDIT.md).
- #migration-0002 - Schema audit implementation in
  [0002_schema_audit_implementation.sql](../supabase/migrations/0002_schema_audit_implementation.sql).
- #02c-2 - Public claim intake API and form wiring.
- #03a - File upload and Storage foundation.
- #03b - Inngest document processing state machine.
- #03g - Claude document classifier, pass accounting, and status polling.
- #03ד-1a - Document subtype classification foundation.
- #03ד-1b - Broad extraction prompts and `documents.extracted_data` wiring.
- SPRINT-001 - Pass lifecycle completion after claim-level document processing.
- SPRINT-002A - Extraction schema contracts in PR #50.
- SPRINT-002B - Priority subtype extraction routes in PR #52.
- SPRINT-002C - Cross-document validation layers 11.1-11.3 in PR #60.
- SPRINT-002D - `errored` recovery and soft cost cap in PR #65.
- SPRINT-003A - Deterministic synthesis MVP in PR #66.
- SPRINT-UI-001 - Adjuster brief view MVP in PR #68.
- SPRINT-UI-002A - Claimant responses pre-flight in PR #70.
- SPRINT-UI-002B - Claimant responses core flow in PR #72.
- SYNC-007 - Post-PR72 UI-002B state sync in PR #73.
- SYNC-008 - Post-PR73 handoff/current-state reconcile in PR #74.
- SYNC-009 - UI-002C deferral recorded in PR #75.
- DEMO-POLISH-001 - UI-002B manual-link copy fallback and demo script in PR
  #76.
- SYNC-010 + DEMO-PACK-001 - UI-002C email-only spec and demo package in PR
  #77.
- SPRINT-UI-002C - Claimant email notifications via Resend, email-only, in PR
  #78.
- SYNC-011 - Post-PR78 UI-002C completion and state synchronization in PR
  #79.
- PLAN - Real-case tuning round 1 pilot-readiness validation planning in PR
  #80.
- VALIDATION - Real-case tuning round 1 report, verdict READY, in PR #81.
- DEMO - Insurer discovery execution pack in PR #82.
- QA-001 - Pilot-readiness audit and docs drift fixes in PR #83.
- REPORT - Architect Track A P3 verification in PR #84.
- SPRINT-UI-003 Part 1 - Design-system gate, public cleanup, HEIC, and health
  gate in PR #85.
- SPRINT-UI-003 Part 2 - ToS/Privacy, currency, trip dates, pre-trip
  insurance, and homepage in PR #86.
- SYNC - Correct UI-003 next gate after Architect UX audit in PR #87.
- SPRINT-UI-003 Part 3 - Authenticated demo-readiness fixes in PR #88.

## Current Sprint Status

**SPRINT-UI-002C - Claimant Email Notifications** - DONE

- Merged: PR #78 -> `main`
- Merge method: merge commit
- Merge commit:
  `b4b6158712a018dda3a99ad9fcf657a901f8a328`
- Current main HEAD after PR #79 state sync:
  `5f428fe8a9b76b9e6c12e7885263da03bd032a03`
- Scope: claimant email notifications via Resend, email-only.
- Manual fallback preserved: yes.
- Twilio/SMS/WhatsApp added: no.
- Production Supabase touched: no.
- Manual deploy run by Codex: no.
- Production smoke run: no.

**SPRINT-UI-003 - Pilot Readiness** - DONE

- Part 1 merged: PR #85, `UI-003 Part 1: hide design-system + public cleanup
  - HEIC + health gate`.
- Part 1 scope: `/design-system` gate, public cleanup, HEIC upload support,
  and minimal public `/api/health`.
- Part 2 merged: PR #86, `UI-003 Part 2: ToS/Privacy + currency + trip dates
  - homepage`.
- Part 2 scope: ToS/Privacy draft consent flow, currency selector, trip dates,
  pre-trip insurance, homepage hero, and supporting migration/rollback.
- Part 3 merged: PR #88, `UI-003 Part 3 demo-readiness fixes`.
- Part 3 scope: authenticated UI demo-readiness fixes: design-system nav
  removal, clean authenticated footer, initials/avatar identity, Hebrew
  grammar, Hebrew claim types, Risk Band dashboard column, KPI cards, tab
  counters, question card action clarity, leading-finding severity color, and
  RTL action order.
- Current main HEAD after PR #86:
  `b1c95fc53163fc59efa4c4d2b498ae71a9970f93`.
- Current main HEAD after PR #88:
  `23936677014e32f01517f1ff0b6ffa5645acb282`.
- CAPTCHA status: blocked/deferred until Cloudflare Turnstile keys are
  provided.
- Twilio/SMS/WhatsApp added: no.
- Production Supabase touched: no.
- Manual deploy run by Codex: no.

Post-PR86 staging verification:

- Vercel status for `b1c95fc`: success.
- Staging URL: `https://staging.spectix.co.il`.
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

Post-PR88 staging verification:

- Vercel status for `2393667`: success / Ready.
- Staging URL: `https://staging.spectix.co.il`.
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

Post-Architect UX audit correction:

- System is functionally validated.
- Functional readiness passed, including post-PR86 and post-PR88 staging
  verification.
- Commercial insurer-demo readiness blockers identified by the audit are closed
  by PR #88 and post-PR88 staging verification.
- New Architect UX audit found 6 P0 commercial-impact issues on
  authenticated/demo-exposed UI.
- Outreach and insurer demos remain blocked until explicitly approved as a
  business/customer-discovery action.

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

PR #78 post-merge staging validation:

- Vercel status for `b4b6158`: success.
- Staging URL: `https://staging.spectix.co.il`.
- Staging health: PASS, HTTP 200, `ok:true`.
- Non-production Supabase target: `aozbgunwhafabfmuwjol`.
- Email path: PASS with safe test recipient fixture.
- No-email path: PASS.
- Invalid Resend webhook signature: PASS, HTTP 400.
- Manual fallback and copy-denied fallback: PASS.
- Generated claimant link origin matched staging.
- Audit leakage scan: PASS.
- Secrets, raw tokens, and full magic links printed: no.

**SPRINT-UI-002B - Claimant Responses Core Flow** - DONE

- Merged: PR #72 -> `main`
- Final-head validation: PASS.
- Non-production final-head verification: PASS on `aozbgunwhafabfmuwjol`
  only.
- Production Supabase touched: no.

Scope shipped:

- Claimant magic links.
- Draft responses and finalized question responses.
- Document-to-question linking via `documents.response_to_question_id`.
- Claimant public RTL page at `/c/[claim_id]`.
- Claimant draft, upload, and finalize APIs.
- Adjuster dispatch and regenerate-link endpoints returning a manual-share URL.
- Dispatch badges, copy-link support, copy fallback polish, and no-contact
  manual-share state.
- Claimant response recycle Path A: no documents -> validation requested.
- Claimant response recycle Path B: documents present -> document fan-out,
  extraction, validation, synthesis.
- D-029 registered in [DECISIONS.md](DECISIONS.md).

## Active Gates

See [ACTIVE_GATES.md](agents/workflow/ACTIVE_GATES.md).

Immediate next operational gate is **insurer outreach/demo execution decision**.

Round 2 case sourcing and outreach material drafting may proceed, but no
insurer contact or demo is approved until explicitly authorized.

If the user reports the first signed LOI from an Israeli travel insurer, the
next gate becomes SPRINT-PROD-BLOCK by default.

## Customer Discovery Track

- Target: 5 conversations with Israeli travel insurers.
- Execution package:
  [insurer_discovery_execution_pack_07_05.md](demo/insurer_discovery_execution_pack_07_05.md).
- Status: prepared; UI-003 Part 3 technical/commercial demo-readiness blockers
  are closed, but real insurer contact/demo still requires explicit approval.
- Demo package:
  [ui002b_insurer_demo_package.md](demo/ui002b_insurer_demo_package.md).
- Discovery questions:
  [ui002b_customer_discovery_questions.md](demo/ui002b_customer_discovery_questions.md).
- Outreach email: [ui002b_outreach_email_he.md](demo/ui002b_outreach_email_he.md).
- Demo checklist: [ui002b_demo_checklist.md](demo/ui002b_demo_checklist.md).
- Trigger to SPRINT-PROD-BLOCK: first signed LOI.
- Production Supabase remains forbidden unless SPRINT-PROD-BLOCK or another
  production-readiness gate is explicitly approved.

## Recent Merges

| PR  | Title                                                      | Merge SHA  | Date       | Notes                |
| --- | ---------------------------------------------------------- | ---------- | ---------- | -------------------- |
| #88 | UI-003 Part 3 demo-readiness fixes                         | `2393667…` | 2026-05-08 | Demo blockers closed |
| #87 | SYNC: correct UI-003 next gate after UX audit              | `c78d6d2…` | 2026-05-08 | Docs/state sync      |
| #86 | UI-003 Part 2: ToS/Privacy + currency + trip dates         | `b1c95fc…` | 2026-05-08 | Public readiness     |
| #85 | UI-003 Part 1: design-system, cleanup, HEIC, health gate   | `072e0d0…` | 2026-05-08 | UI hardening         |
| #84 | REPORT: Architect Track A P3 verification                  | `9d67615…` | 2026-05-08 | UX report            |
| #83 | QA-001: Pilot-readiness audit + docs drift fixes           | `93ad93a…` | 2026-05-08 | QA report            |
| #82 | DEMO: Insurer discovery execution pack                     | `094688e…` | 2026-05-07 | Demo package         |
| #81 | VALIDATION: Real-case tuning round 1 report                | `640f447…` | 2026-05-07 | Validation report    |
| #80 | PLAN: Real-case tuning round 1 pilot-readiness validation  | `4f9993a…` | 2026-05-07 | Planning             |
| #79 | SYNC-011: Record UI-002C completion and post-PR78 state    | `5f428fe…` | 2026-05-07 | State sync           |
| #78 | UI-002C: claimant email notifications (Resend, email-only) | `b4b6158…` | 2026-05-07 | Email notifications  |
| #77 | SYNC-010: Add UI-002C email-only spec and demo package     | `4315cf7…` | 2026-05-07 | Docs/demo package    |
| #76 | DEMO: Polish UI-002B manual link sharing and demo script   | `4bdaf6d…` | 2026-05-07 | Demo polish          |
| #75 | SYNC-009: Record UI-002C deferral                          | `7f2fe87…` | 2026-05-07 | Docs/state sync      |
| #74 | SYNC-008: Reconcile handoff/current state                  | `4c03f9f…` | 2026-05-07 | Docs/state sync      |
| #73 | SYNC-007: Record post-PR72 UI-002B state                   | `1252ade…` | 2026-05-07 | Docs/state sync      |
| #72 | UI-002B: claimant responses core flow                      | `ebdb75c…` | 2026-05-07 | Product core flow    |

## Open PRs

- #47 - Record OpenClaw Slack routing blocker (informational, no code).

## Environment Gates

- Non-production project: `aozbgunwhafabfmuwjol`.
- Production project: `fcqporzsihuqtfohqtxs` remains forbidden unless explicitly
  approved under a production-readiness gate.
- Production deploy, production smoke, and manual production actions remain not
  approved unless explicitly gated.
- OpenClaw/native orchestration remains blocked while PR #47 remains open.
- Cron, 24/7 operation, auto-merge, and auto-deploy remain not approved.

## Known Tech Debt

See [TECH_DEBT.md](TECH_DEBT.md).
