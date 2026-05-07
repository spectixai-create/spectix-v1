# Current State

Updated by Codex for SYNC-010 after PR #76.

## Version

Spectix post PR #76 / UI-002B manual demo polish complete - 2026-05-07

## Current Phase

The non-production MVP pipeline covers intake, document upload,
classification, normalized extraction, validation, deterministic synthesis, the
adjuster-facing brief view, and the core claimant response flow without
automated notifications.

Current `main` HEAD is
`4bdaf6dcaac0244ccfd1f0d7258ab7cfc8b5ea8a`, the merge commit for PR #76
(`DEMO: Polish UI-002B manual link sharing and demo script`).

The accepted MVP flow is manual magic-link sharing: the adjuster receives a
`magic_link_url` from dispatch/regenerate-link and shares it manually with the
claimant.

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

## Current Sprint Status

**DEMO-POLISH-001 - UI-002B Manual Demo Polish** - DONE

- Merged: PR #76 -> `main`
- Merge method: merge commit
- Merge commit / current main HEAD:
  `4bdaf6dcaac0244ccfd1f0d7258ab7cfc8b5ea8a`
- Scope: manual magic-link copy fallback and demo script.
- Production Supabase touched: no
- Deploy run by Codex: no
- Smoke run by Codex: no
- UI-002C started: no

**SYNC-009 - UI-002C Deferral** - DONE

- Merged: PR #75 -> `main`
- Merge method: merge commit
- Merge commit: `7f2fe87e6e843bf17c276de20c7a941110771c87`
- Scope: docs-only UI-002C deferral / manual-flow state.
- Production Supabase touched: no
- Deploy run by Codex: no
- Smoke run by Codex: no
- UI-002C started: no

**SPRINT-UI-002B - Claimant Responses Core Flow** - DONE

- Merged: PR #72 -> `main`
- Final-head validation: PASS
- Non-production final-head verification: PASS on `aozbgunwhafabfmuwjol`
  only.
- Production Supabase touched: no
- Deploy run by Codex: no
- Notifications sent: no
- Resend/Twilio added: no
- UI-002C started: no

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

## UI-002C Notification Status

**SPRINT-UI-002C - Claimant Email Notifications** is deferred/skipped and is
not approved for implementation.

Future UI-002C scope is email-only via Resend per D-030. Twilio, SMS fallback,
WhatsApp automation, and multi-provider fallback are out of MVP scope.

UI-002C remains gated. It may be reconsidered only after:

1. Resend account exists.
2. `spectix.co.il` domain is registered.
3. DKIM/SPF/DMARC are configured and Resend domain verification passes.
4. Resend webhook secret is generated/configured.
5. Vercel non-production env readiness is verified for `RESEND_API_KEY`,
   `RESEND_WEBHOOK_SECRET`, and `APP_BASE_URL`.
6. CEO GPT approves UI-002C dispatch.

UI-002C must not start automatically.

## Active Gates

See [ACTIVE_GATES.md](agents/workflow/ACTIVE_GATES.md).

Immediate next gate is the manual UI-002B insurer demo package / customer
discovery / LOI track, not UI-002C implementation.

If the user reports the first signed LOI from an Israeli travel insurer, the
next gate becomes SPRINT-PROD-BLOCK by default rather than UI-002C.

## Customer Discovery Track

- Target: 5 conversations with Israeli travel insurers.
- Demo package:
  [ui002b_insurer_demo_package.md](demo/ui002b_insurer_demo_package.md).
- Discovery questions:
  [ui002b_customer_discovery_questions.md](demo/ui002b_customer_discovery_questions.md).
- Outreach email: [ui002b_outreach_email_he.md](demo/ui002b_outreach_email_he.md).
- Demo checklist: [ui002b_demo_checklist.md](demo/ui002b_demo_checklist.md).
- Trigger to SPRINT-PROD-BLOCK: first signed LOI.
- Production Supabase remains forbidden unless SPRINT-PROD-BLOCK is explicitly
  approved.

## Recent Merges

| PR  | Title                                               | Merge SHA  | Date       | Notes             |
| --- | --------------------------------------------------- | ---------- | ---------- | ----------------- |
| #76 | DEMO: Polish UI-002B manual link sharing and script | `4bdaf6d…` | 2026-05-07 | Demo polish       |
| #75 | SYNC-009: Record UI-002C deferral                   | `7f2fe87…` | 2026-05-07 | Docs/state sync   |
| #74 | SYNC-008: Reconcile handoff/current state           | `4c03f9f…` | 2026-05-07 | Docs/state sync   |
| #73 | SYNC-007: Record post-PR72 UI-002B state            | `1252ade…` | 2026-05-07 | Docs/state sync   |
| #72 | UI-002B: claimant responses core flow               | `ebdb75c…` | 2026-05-07 | Product core flow |

## Open PRs

- #47 - Record OpenClaw Slack routing blocker (informational, no code).

## Environment Gates

- Non-production project: `aozbgunwhafabfmuwjol`.
- Production project: `fcqporzsihuqtfohqtxs` remains forbidden unless explicitly
  approved under SPRINT-PROD-BLOCK.
- Deploy remains not approved unless explicitly approved.
- OpenClaw/native orchestration remains not approved.
- Cron, 24/7 operation, auto-merge, and auto-deploy remain not approved.

## Known Tech Debt

See [TECH_DEBT.md](TECH_DEBT.md).
