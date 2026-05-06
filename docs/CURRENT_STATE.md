# Current State

Updated by Codex atomically with each spike PR. CEO updates this file only for decision changes or scope shifts. Source for the UI version string: [lib/version.ts](../lib/version.ts).

## Version

Spectix SPRINT-002C • 2026-05-06

## Current Phase

Claim intake writes real claim rows, uploads supporting documents to Supabase Storage, classifies documents through the Inngest + Claude broad + subtype classifier pipeline, persists broad and normalized extraction results into `documents.extracted_data`, closes pass 1 only after true terminal document-level processing, and now has SPRINT-002C validation layers merged for claim-level name, date, and currency validation.

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
- SPRINT-001 - Pass lifecycle completion after claim-level document processing.
- SPRINT-002A - Extraction schema contracts in PR #50.
- SPRINT-002B - Priority subtype extraction routes in PR #52.
- SPRINT-002C - Cross-document validation layers 11.1-11.3 in PR #60.

## Current Sprint Status

**SPRINT-002C - Cross-Document Validation Layers (11.1-11.3)** - DONE

- Merged: PR #60 -> main
- Merge commit: `828e16ef3e04a66fff85a67611fc4fa40ab6ef6d`
- Scope shipped: layer 11.1 (`name_match`), 11.2 (date validation), 11.3 (currency validation)
- Migration: `claim_validations` table created
- Inngest events: `claim/extraction.completed`, `claim/validation.completed`
- Handler: `run-validation-pass`
- FX provider: `FakeExchangeRateProvider` default; `FetchExchangeRateProvider` implemented but disabled
- Out of scope (deferred): 11.4 authenticity, 11.5 anomaly

**SPRINT-DESIGN-001 - Pipeline State Machine + Sync Contracts** - DESIGN COMPLETE

- Document: [design001.6_state_machine_06_05.md](management/designs/design001.6_state_machine_06_05.md)
- Status: target spec. Partially aligned with PR #60. Audit pending (AUDIT-001).
- Audit will identify gaps between spec and main; gaps become SPRINT-002D items or TECH_DEBT.

**SPRINT-DESIGN-002 - Synthesis Layer Decomposition** - IN PLANNING

- Status: skeleton spec drafted in [design002.1_synthesis_decomposition_06_05.md](management/designs/design002.1_synthesis_decomposition_06_05.md).
- Iteration 1 to expand after AUDIT-001 outputs.

**SPRINT-003A - Synthesis Data Model** - READY FOR PLANNING (blocked behind DESIGN-002)

## Recent Merges

| PR  | Title                                       | Merge SHA  | Date       | Notes                                     |
| --- | ------------------------------------------- | ---------- | ---------- | ----------------------------------------- |
| #61 | SYNC-002: docs management folder            | `683c8b8…` | 2026-05-06 | Planning artifacts                        |
| #60 | SPRINT-002C: validation layers 11.1-11.3    | `828e16e…` | 2026-05-06 | Smoked + merged                           |
| #59 | SPRINT-002C verification report             | `06f9ecc…` | 2026-05-06 | Pre-implementation audit                  |
| #58 | PLAN-OVERVIEW verification                  | `df5de0c…` | 2026-05-06 | Documentation                             |
| #57 | .gitignore for `.claude/`, `.diag/`         | `07d0654…` | 2026-05-06 | Tooling                                   |
| #56 | Post-merge retro for SPRINT-002B            | `bc971bf…` | 2026-05-06 | ANTI-PATTERNS #8 and #9                   |
| #52 | SPRINT-002B: 7 normalized extraction routes | `754c87f…` | 2026-05-06 | 9/9 docs smoke pass before merge decision |

## Open PRs

- #47 - Record OpenClaw Slack routing blocker (informational, no code).

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
