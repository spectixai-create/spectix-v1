# Current State

Updated by Codex atomically with each spike PR. CEO updates this file only for decision changes or scope shifts. Source for the UI version string: [lib/version.ts](../lib/version.ts).

## Version

Spectix Spike #19 • 2026-05-03

## Current Phase

Claim intake writes real claim rows, uploads supporting documents to Supabase Storage, classifies documents through the Inngest + Claude broad + subtype classifier pipeline, and is adding broad extraction prompts into `documents.extracted_data`.

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

## Active Spike

#03ד-1b - Broad extraction prompts (02-05) and `extracted_data` wiring.

## Next Spike

Next document-processing spike: dedicated extraction prompts for subtype-specific documents.

## Current Routes

See [ROUTING.md](ROUTING.md).

## Known Tech Debt

See [TECH_DEBT.md](TECH_DEBT.md).

## Last Verified Status

For Spike #01, local verification was green: typecheck, lint, format check, vitest, build, Playwright 29/29, Lighthouse `/login` 100.
