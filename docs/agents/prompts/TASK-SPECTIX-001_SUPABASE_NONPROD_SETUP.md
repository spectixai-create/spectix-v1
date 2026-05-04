# TASK-SPECTIX-001 Supabase Nonproduction Setup Package

This package prepares review material for setting up the empty Supabase
nonproduction candidate for `TASK-SPECTIX-001`. It does not apply SQL, mutate
any Supabase project, create claims, upload documents, run smoke tests, touch
secrets/env/deploy settings, deploy, or enable OpenClaw cron/24-7.

## 1. Project Targets

Approved nonproduction candidate:

```text
project_id: aozbgunwhafabfmuwjol
name: spectixai-create's Project
url: https://aozbgunwhafabfmuwjol.supabase.co
observed public tables: none
observed migrations: none
classification: empty nonproduction candidate
```

Forbidden production/active project:

```text
project_id: fcqporzsihuqtfohqtxs
name: spectix-v1
observed rows:
  claims: 1026
  documents: 2302
classification: production/active data
```

Codex did not connect to, modify, or apply SQL to either project in this task.

## 2. Repo Migration Inventory

Local migrations found:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_schema_audit_implementation.sql`
3. `supabase/migrations/0003_storage_mime_types.sql`
4. `supabase/migrations/0004_classifier_prep.sql`
5. `supabase/migrations/0005_document_subtype.sql`

Local generated bundle:

```text
.openclaw-local/supabase-nonprod/TASK-SPECTIX-001/nonprod_schema_bundle.sql
```

The generated bundle is local-only and ignored. It is a concatenation of the
committed migrations with a target warning header. It must not be applied by
Codex without a separate CEO execution approval.

## 3. Schema Coverage

The ordered migrations cover:

| Area                                      | Covered by                                          |
| ----------------------------------------- | --------------------------------------------------- |
| `claims`                                  | `0001`, extended by `0002`                          |
| `documents`                               | `0001`, extended by `0002`, `0004`, `0005`          |
| `audit_log`                               | `0001`                                              |
| `passes`                                  | `0002`                                              |
| `findings`                                | `0001`, extended by `0002`                          |
| `gaps`                                    | `0001`, extended by `0002`                          |
| `clarification_questions`                 | `0001`, extended by `0002`                          |
| `enrichment_cache`                        | `0001`                                              |
| Storage bucket `claim-documents`          | `0001`, refined by `0003`, `0004`                   |
| Document subtype column/check/index       | `0005`                                              |
| Broad extraction `extracted_data` storage | `0001` JSONB column plus PR #18 runtime/type wiring |

The migrations include `documents.document_subtype` from PR #16. They also
include the `documents.extracted_data jsonb` column used by PR #18. PR #18 did
not require an additional DB migration because its broad extraction result
shape is persisted into the existing JSONB column and guarded in
TypeScript/runtime code.

## 4. Storage Requirements

Required bucket:

```text
claim-documents
```

Expected bucket properties:

- Private bucket.
- Bucket file size limit: 32 MB.
- Upload API limit: 4 MB per file.
- Allowed MIME types after all migrations:
  - `application/pdf`
  - `image/jpeg`
  - `image/png`

Storage policy posture:

- No `storage.objects` policies are added by current migrations.
- Supabase defaults plus no policies mean anon/authenticated users are denied.
- The app uploads through the server API using the service role admin client.
- Frontend clients do not upload directly to Storage.

## 5. RLS And Policy Posture

RLS is enabled on:

- `claims`
- `documents`
- `findings`
- `gaps`
- `clarification_questions`
- `enrichment_cache`
- `audit_log`
- `passes`

Current migrations intentionally define no table policies. Server-side API
routes use the Supabase service role client, which bypasses RLS. This is the
current POC contract and must be reviewed before public/customer data.

## 6. Manual Apply Procedure

Manual apply must be performed only after CEO approval and only against:

```text
aozbgunwhafabfmuwjol
```

Never apply to:

```text
fcqporzsihuqtfohqtxs
```

Recommended manual procedure:

1. In Supabase dashboard or approved plugin flow, select project
   `aozbgunwhafabfmuwjol`.
2. Confirm the project URL is
   `https://aozbgunwhafabfmuwjol.supabase.co`.
3. Confirm public tables are still empty/nonexistent.
4. Apply migrations in order:
   - `0001_initial_schema.sql`
   - `0002_schema_audit_implementation.sql`
   - `0003_storage_mime_types.sql`
   - `0004_classifier_prep.sql`
   - `0005_document_subtype.sql`
5. Do not apply to the production project.
6. Do not paste or commit keys.
7. After apply, run read-only verification against
   `aozbgunwhafabfmuwjol` only.

Important: `0002_schema_audit_implementation.sql` is intended for ordered
application after `0001`. It includes plain `ALTER TABLE ... ADD COLUMN`
statements and should not be rerun blindly. The generated bundle is for a
known-empty target with no prior migrations.

## 7. Risks

- Applying the bundle to `fcqporzsihuqtfohqtxs` would touch production/active
  data and is forbidden.
- Re-running migration `0002` on an already migrated project may fail because
  several additions are not `IF NOT EXISTS`.
- Service-role keys must remain outside git and must not be printed.
- The public claim/document endpoints mutate the configured Supabase target.
- Without nonproduction env verification, a local app could accidentally point
  to production.

## 8. Current Status

```text
schema bundle created locally: yes
schema applied: no
smoke executed: no
claim created: no
documents uploaded: no
production data mutated: no
secrets/env/deploy touched: no
```

Exact next approval needed:

```text
CEO approval for manual schema application to aozbgunwhafabfmuwjol only,
followed by nonproduction env key configuration outside git.
```
