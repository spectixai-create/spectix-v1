# Current State

Updated by Codex atomically with each spike PR. CEO updates this file only for decision changes or scope shifts. Source for the UI version string: [lib/version.ts](../lib/version.ts).

## Version

Spectix Spike #11 • 2025-05-02

## Current Phase

Documentation infrastructure is complete. Auth wiring is already merged on `main`.

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

## Active Spike

None.

## Next Spike

Spike #03 - Document processing and investigation pipeline integration. A PM-reviewed spec should be added under [docs/specs](specs/) before execution.

## Current Routes

See [ROUTING.md](ROUTING.md).

## Known Tech Debt

See [TECH_DEBT.md](TECH_DEBT.md).

## Last Verified Status

For Spike #01, local verification was green: typecheck, lint, format check, vitest, build, Playwright 29/29, Lighthouse `/login` 100.
