# Spike #02c-1 - Schema Gap Audit

Status: READY
Owner: Codex
Branch: backend-schema-audit
Estimated effort: 0.5 day
Priority: P0 critical
Reference decisions: D-007, D-014

## Context

Schema sources of truth:

- [supabase/migrations/0001_initial_schema.sql](../../supabase/migrations/0001_initial_schema.sql) is the DB structure.
- [lib/types.ts](../../lib/types.ts) is the TypeScript contract.

Frontend skeleton spikes (#02, #02b, #00d, #00e) collected richer form and sample data than migration #0001 currently stores. PM review of #02c uncovered systemic gaps:

- Intake form has `claimantEmail`, `claimantPhone`, `policyNumber`, `country`, and `city`.
- Questions queue UI uses `closed` status, `urgency`, `resolvedBy`, and `resolutionNote`.
- Brief view sample data has passes, pass events, and pass-level risk state.
- Hebrew form labels map to English enum values, but the translation layer is undocumented.
- `findings` and `gaps` are missing pipeline-state fields needed by later rules.

This spike produces a comprehensive audit document only. It does not modify schema, types, UI, sample data, API routes, or runtime logic.

## Files to create

1. [docs/SCHEMA_AUDIT.md](../SCHEMA_AUDIT.md)
   - Comprehensive audit by entity.
   - Decision rubric: `METADATA`, `COLUMN`, `DROP`, `DERIVED`.
   - Concrete migration #0002 scope with SQL snippets.
   - Hebrew to English form-value mapping.
   - Source-of-truth invariants.

## Files to update

1. [docs/TECH_DEBT.md](../TECH_DEBT.md)
   - Append Migration #0002 scope, effort estimate, blocked spikes, and 3-day deadline note.
2. [docs/CONVENTIONS.md](../CONVENTIONS.md)
   - Add schema invariants.
   - Add Hebrew to English form translation convention.
3. [docs/CURRENT_STATE.md](../CURRENT_STATE.md)
   - Mark #02c-1 complete.
   - Set next spike to `#migration-0002`.
   - Bump version to Spike #12.
4. [lib/version.ts](../../lib/version.ts)
   - `APP_VERSION = '0.12.0'`
   - `APP_SPIKE_NUMBER = 12`
   - `APP_BUILD_DATE = '2025-05-02'`

## Files MUST NOT touch

- `supabase/migrations/*`
- `lib/types.ts`
- `lib/sample-data/*`
- `components/*`
- `app/*` page files
- `lib/auth/*`
- `middleware.ts`
- `inngest/*`
- `scripts/*`
- `app/api/*`

## Acceptance criteria

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and `pnpm test` pass.
- [docs/SCHEMA_AUDIT.md](../SCHEMA_AUDIT.md) exists with the required audit sections.
- [docs/TECH_DEBT.md](../TECH_DEBT.md) has Migration #0002 scope and 3-day deadline note.
- [docs/CONVENTIONS.md](../CONVENTIONS.md) has schema invariants and Hebrew translation sections.
- [docs/CURRENT_STATE.md](../CURRENT_STATE.md) reflects #02c-1 done and `#migration-0002` next.
- [lib/version.ts](../../lib/version.ts) is bumped to Spike #12.
- No changes to schema migrations, `lib/types.ts`, sample data, app routes, components, API routes, middleware, or backend runtime logic.
- D-012 evidence includes docs file tree, version diff, typecheck output, and test/build output.

## Self-verification

- Read [AGENTS.md](../../AGENTS.md) and [docs/CURRENT_STATE.md](../CURRENT_STATE.md).
- Read all sample-data files referenced in the audit.
- Read [lib/types.ts](../../lib/types.ts).
- Read [supabase/migrations/0001_initial_schema.sql](../../supabase/migrations/0001_initial_schema.sql).
- Cross-check UI/sample fields against DB and TS before writing audit entries.
- Open PR via gh CLI titled `Spike #02c-1: Schema Gap Audit`.
- Update [docs/CURRENT_STATE.md](../CURRENT_STATE.md) atomically in the same PR.

## Self-review before merge

- No runtime code modifications except the permitted version bump.
- No `lib/types.ts` changes.
- No migration files created.
- All audit table entries have explicit rationale.
- Migration #0002 scope is concrete and has no `TBD` placeholders.
- SQL snippets are syntax-reviewed.
- Markdown cross-references resolve.
