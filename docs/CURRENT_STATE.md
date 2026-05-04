# Current State

Updated by Codex atomically with each spike PR. CEO updates this file only for decision changes or scope shifts. Source for the UI version string: [lib/version.ts](../lib/version.ts).

## Version

Spectix Spike #19 • 2026-05-03

## Current Phase

Claim intake writes real claim rows, uploads supporting documents to Supabase Storage, classifies documents through the Inngest + Claude broad + subtype classifier pipeline, persists broad extraction prompt results into `documents.extracted_data`, and has SPRINT-001 locally validated in PR #38 to close pass 1 only after true terminal document-level processing.

## Completed Spikes

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
- #migration-0002 - Schema audit implementation in [0002_schema_audit_implementation.sql](../supabase/migrations/0002_schema_audit_implementation.sql).
- #02c-2 - Public claim intake API and form wiring.
- #03a - File upload and Storage foundation.
- #03b - Inngest document processing state machine.
- #03g - Claude document classifier (Prompt 01), pass accounting, and status polling.
- #03ד-1a - Document subtype classification foundation (Prompt 01b).
- #03ד-1b - Broad extraction prompts (02-05) and `extracted_data` wiring.

## Active Spike

SPRINT-001 - Pass lifecycle completion after claim-level document processing is locally validated on PR #38 and pending QA review.

## Next Spike

Next document-processing spike: dedicated extraction prompts for subtype-specific documents.

## Agent Operations

OpenClaw external channel routing remains blocked in the installed local OpenClaw runtime because GitHub issue and PR comments are not supported as a channel target. The local filesystem dispatcher is the current operational bridge for CEO/PM/Codex/QA handoffs. It passed the docs-only dummy flow and keeps runtime state under ignored `.openclaw-local/`.

## Smoke Verification

TASK-SPECTIX-001 passed the non-production broad extraction smoke test against Supabase project `aozbgunwhafabfmuwjol` using smoke claim `2026-001` (`443bdef7-1377-4628-9105-c0bed8a55614`). Production project `fcqporzsihuqtfohqtxs` was not touched. The final report is tracked in [TASK-SPECTIX-001_SMOKE_FINAL_REPORT.md](agents/prompts/TASK-SPECTIX-001_SMOKE_FINAL_REPORT.md).

The smoke verified eight synthetic documents: six extraction routes reached `extracted_data.kind = 'extraction'` with expected routes, and two deferred routes reached `kind = 'classification'` with expected deferrals.

## Current Routes

See [ROUTING.md](ROUTING.md).

## Known Tech Debt

See [TECH_DEBT.md](TECH_DEBT.md).

## Last Verified Status

For Spike #01, local verification was green: typecheck, lint, format check, vitest, build, Playwright 29/29, Lighthouse `/login` 100.
