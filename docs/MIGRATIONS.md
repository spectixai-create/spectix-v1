# Migrations

## Naming Convention

- Up migration: `supabase/migrations/{NNNN}_{name}.sql`
- Down migration: `supabase/rollbacks/{NNNN}_{name}.down.sql`

Implementation note: Supabase CLI executes every `*.sql` file in
`supabase/migrations`. Paired rollback files therefore cannot live in that
directory unless the CLI later adds first-class rollback support.

## D-015 Standard

From migration #0003 onward, every Supabase migration must ship with a paired
`down.sql` rollback file in the same PR. The up and down files are reviewed
together, tested together, and documented together.

Acceptance for migration PRs:

- Up migration applies cleanly.
- Down migration is manually tested in dev/local Supabase.
- Up migration is re-applied after the rollback test to verify idempotency or
  valid forward recovery.
- PR description includes rollback evidence.

## Retroactive Clarification

Migrations #0001 and #0002 PREDATE D-015. They have NO down.sql files. They are
immutable. Re-creating production from scratch is the supported path:

```text
0001 -> 0002 -> 0003
```

Rolling back 0001 or 0002 requires manual SQL surgery. From #0003 onward, all
migrations are reversible unless the down file explicitly documents permanent
data loss.

## Current Migrations

- `0001_initial_schema.sql`: initial tables, RLS, and private
  `claim-documents` bucket.
- `0002_schema_audit_implementation.sql`: schema additions from the schema gap
  audit.
- `0003_storage_mime_types.sql`: authoritative MIME allowlist for
  `claim-documents`.
- `0004_classifier_prep.sql`: document type CHECK, HEIC allowlist removal, and
  `upsert_pass_increment` RPC for D-016 pass accounting.
- `0005_document_subtype.sql`: nullable `documents.document_subtype` column,
  37-value CHECK constraint, and partial subtype index for D-018 two-tier
  classification.
