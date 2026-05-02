# Spike #migration-0002 - Schema Audit Implementation

Status: READY
Owner: Codex
Branch: backend-migration-0002
Estimated effort: 1 day
Priority: P0 critical
Reference decisions: D-007, D-014

## Context

Implements Migration #0002 scope from [docs/SCHEMA_AUDIT.md](../SCHEMA_AUDIT.md) exactly. The audit is canonical; this spike does not re-decide scope.

This is the first real DB migration since #00. It alters production tables, creates `passes`, adds CHECK constraints, adds triggers, and updates [lib/types.ts](../../lib/types.ts).

CEO decisions applied:

- Run migration directly on Supabase production.
- Wrap the entire migration in a transaction with rollback on failure.
- Back up schema before migration via Supabase CLI.
- Do not add a DB FK from `clarification_questions.resolved_by` to `auth.users`; enforce in application code and track as tech debt.

## Files to create

1. [supabase/migrations/0002_schema_audit_implementation.sql](../../supabase/migrations/0002_schema_audit_implementation.sql)
   - Transaction-wrapped migration.
   - Pre-flight checks for existing data.
   - Claims, documents, findings, gaps, clarification question additions.
   - New `passes` table.
   - `update_claim_pipeline_state()` trigger.
   - In-migration verification DO block.

## Files to update

1. [lib/types.ts](../../lib/types.ts)
   - Mirror migration #0002.
   - Remove `DocumentDerivedStatus`.
   - Add `Pass`, `PassStatus`, `FindingStatus`, `QuestionUrgency`, `GapFillMethod`, `BriefRecommendation`, and `DocumentProcessingStatus`.
2. [lib/types.test.ts](../../lib/types.test.ts)
   - Extend compile tests for all new fields and unions.
3. [docs/DB_SCHEMA.md](../DB_SCHEMA.md)
   - Document migration #0002 and the new `passes` table.
4. [docs/TECH_DEBT.md](../TECH_DEBT.md)
   - Mark migration #0002 as done and add follow-up debt.
5. [docs/CURRENT_STATE.md](../CURRENT_STATE.md)
   - Mark #migration-0002 done and set #02c-2 next.
6. [docs/specs/README.md](README.md)
   - Update spike index.
7. [lib/version.ts](../../lib/version.ts)
   - Bump to Spike #13, build date `2025-05-03`.

## Migration Summary

Migration #0002 adds:

- `claims`: `claimant_email`, `claimant_phone`, `policy_number`, `current_pass`, `total_llm_cost_usd`, `brief_text`, `brief_pass_number`, `brief_recommendation`, `brief_generated_at`, status CHECK, brief recommendation CHECK.
- `passes`: normalized pipeline pass table with FK to `claims`, status and risk-band CHECKs, indexes, RLS.
- `documents`: `processing_status` and CHECK.
- `clarification_questions`: `urgency`, `resolved_by`, `resolution_note`, `closed_at`, status and urgency CHECKs.
- `findings`: context-adjustment and lifecycle fields plus CHECKs.
- `gaps`: fill fields, `updated_at`, status/fill-method CHECKs, `gaps_set_updated_at` trigger.
- `update_claim_pipeline_state()` trigger on `passes`.

## Execution Steps

1. Create branch `backend-migration-0002`.
2. Create the migration and update types/tests/docs.
3. Run local verification:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm format:check`
   - `pnpm test`
   - `pnpm build`
4. If typecheck fails due to sample-data drift, stop and report.
5. Back up schema:
   - `npx supabase db dump --schema-only > <temp>/pre_0002_schema.sql`
6. Apply migration:
   - `npx supabase db push`
7. Run production verification SQL:
   - insert temporary claim
   - insert pass
   - confirm trigger updates current pass and cost
   - complete pass and confirm risk band update
   - confirm invalid pass status CHECK rejects insert
   - delete temporary claim
8. Push and open PR titled `Spike #migration-0002: Schema Audit Implementation`.

## Files MUST NOT touch

- `supabase/migrations/0001_initial_schema.sql`
- `lib/sample-data/*`
- `components/*`
- `app/*` page files
- `lib/auth/*`
- `middleware.ts`
- `inngest/*`
- `scripts/*`
- `app/api/*`

## Edge Cases

1. Existing data violates a CHECK constraint: pre-flight fails and transaction rolls back.
2. Typecheck fails after `types.ts` update: stop; sample-data refactor is separate.
3. Partial migration failure: transaction rollback should keep schema unchanged.
4. `lock_timeout` fires: retry once only if clearly transient.
5. `resolved_by` has no DB FK by design; application code validates users.

## Acceptance Criteria

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, and `pnpm build` pass.
- Migration applies successfully via `npx supabase db push`.
- In-migration verification passes.
- Production trigger functional test passes.
- CHECK constraints reject invalid inserts.
- `lib/types.ts` and `lib/types.test.ts` reflect migration #0002.
- `docs/DB_SCHEMA.md`, `docs/TECH_DEBT.md`, `docs/CURRENT_STATE.md`, and `lib/version.ts` are updated.
- PR includes D-012 evidence: local verification output, migration apply log, and trigger test output.
