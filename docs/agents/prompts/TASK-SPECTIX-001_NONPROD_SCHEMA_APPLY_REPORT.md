# TASK-SPECTIX-001 Nonproduction Schema Apply Report

This report records the manual/local completion of the nonproduction Supabase
schema setup for `TASK-SPECTIX-001`.

Production project was not touched:

```text
project_id: fcqporzsihuqtfohqtxs
name: spectix-v1
classification: production/active data
```

Nonproduction target:

```text
project_id: aozbgunwhafabfmuwjol
url: https://aozbgunwhafabfmuwjol.supabase.co
classification: empty nonproduction candidate
```

## 1. Scope And Safety

Actions performed:

- Confirmed repo was current on `main`.
- Confirmed migration files existed locally.
- Confirmed target project ref was exactly `aozbgunwhafabfmuwjol`.
- Checked available Supabase CLI paths.
- Applied pending migrations `0002` through `0005` to
  `aozbgunwhafabfmuwjol` only through the Supabase connector migration tool.
- Ran read-only verification queries against `aozbgunwhafabfmuwjol` only.

Actions not performed:

- Did not touch project `fcqporzsihuqtfohqtxs`.
- Did not create a claim.
- Did not upload documents.
- Did not run smoke.
- Did not touch app code.
- Did not read or print `.env.local`.
- Did not print or commit secrets.
- Did not deploy.
- Did not enable OpenClaw cron/24-7.

## 2. Tool Checks

| Tool check                    | Result              |
| ----------------------------- | ------------------- |
| `supabase --version`          | unavailable on PATH |
| `npx supabase --version`      | `2.98.0`            |
| `pnpm dlx supabase --version` | `2.98.0`            |

The schema application itself used the Supabase connector migration tool scoped
to `aozbgunwhafabfmuwjol`, not production.

## 3. Migrations Applied

Initial state before this task:

```text
0001_initial_schema applied
0002-0005 not applied
public app tables existed and were empty
```

Applied in this task:

| Migration                          | Applied |
| ---------------------------------- | ------- |
| `0002_schema_audit_implementation` | yes     |
| `0003_storage_mime_types`          | yes     |
| `0004_classifier_prep`             | yes     |
| `0005_document_subtype`            | yes     |

Migration history after apply:

```text
20260504071559 0001_initial_schema
20260504072030 0002_schema_audit_implementation
20260504072042 0003_storage_mime_types
20260504072058 0004_classifier_prep
20260504072113 0005_document_subtype
```

## 4. Schema Verification

Required columns:

| Table       | Column               | Result  |
| ----------- | -------------------- | ------- |
| `claims`    | `policy_number`      | present |
| `claims`    | `current_pass`       | present |
| `claims`    | `total_llm_cost_usd` | present |
| `documents` | `processing_status`  | present |
| `documents` | `document_subtype`   | present |

Required table/function:

| Object                         | Result |
| ------------------------------ | ------ |
| `public.passes`                | exists |
| `public.upsert_pass_increment` | exists |

Required document constraints:

| Constraint                          | Result  |
| ----------------------------------- | ------- |
| `documents_document_type_check`     | present |
| `documents_document_subtype_check`  | present |
| `documents_processing_status_valid` | present |

RLS verification:

| Table                     | RLS enabled |
| ------------------------- | ----------- |
| `audit_log`               | yes         |
| `claims`                  | yes         |
| `clarification_questions` | yes         |
| `documents`               | yes         |
| `enrichment_cache`        | yes         |
| `findings`                | yes         |
| `gaps`                    | yes         |
| `passes`                  | yes         |

## 5. Row Counts

Application table row counts after applying migrations:

| Table                     | Row count |
| ------------------------- | --------- |
| `audit_log`               | 0         |
| `claims`                  | 0         |
| `clarification_questions` | 0         |
| `documents`               | 0         |
| `enrichment_cache`        | 0         |
| `findings`                | 0         |
| `gaps`                    | 0         |
| `passes`                  | 0         |

No smoke data was created.

## 6. Storage Bucket Verification

Required bucket:

```text
claim-documents
```

Verified bucket state:

| Field                | Result                                       |
| -------------------- | -------------------------------------------- |
| `id`                 | `claim-documents`                            |
| `name`               | `claim-documents`                            |
| `public`             | `false`                                      |
| `file_size_limit`    | `33554432`                                   |
| `allowed_mime_types` | `application/pdf`, `image/jpeg`, `image/png` |

Storage object row count remained `0`.

## 7. Blockers

Schema setup blockers:

```text
none for migrations 0002-0005
```

Remaining smoke blockers:

- Local `.env.local` has not been configured/confirmed for
  `aozbgunwhafabfmuwjol`.
- No nonproduction Supabase keys were entered into local env by Codex.
- Local app has not been started.
- Local Inngest has not been started.
- CEO has not approved creating the smoke claim or uploading synthetic
  documents.

## 8. Final Status

```text
target project confirmed: aozbgunwhafabfmuwjol
0002 applied: yes
0003 applied: yes
0004 applied: yes
0005 applied: yes
production project touched: no
smoke executed: no
claim created: no
documents uploaded: no
production data mutated: no
app code changed: no
secrets printed/committed: no
```

## 9. Exact Next CEO Decision Required

Approve nonproduction local app configuration using
`aozbgunwhafabfmuwjol` keys outside git, then approve a separate guarded task to
start the local app/Inngest and run the TASK-SPECTIX-001 smoke flow against
`aozbgunwhafabfmuwjol` only.
