# TASK-SPECTIX-001 Local Smoke Work Package Report

This report records the guarded local smoke work package for
`TASK-SPECTIX-001`. The work package merged PR #31, checked local toolchain
readiness, and stopped before any local Supabase setup, claim creation,
document upload, smoke execution, production mutation, secret/env/deploy
change, or OpenClaw cron/24-7 activation.

## 1. PR #31 Merge

PR #31:

```text
https://github.com/spectixai-create/spectix-v1/pull/31
```

Approved head SHA:

```text
1176707c02c75252517248c63eee3c3950d6af48
```

Verified before merge:

```json
{
  "state": "OPEN",
  "isDraft": false,
  "mergeable": "MERGEABLE",
  "headRefName": "ops/task-spectix-001-local-env-setup",
  "headRefOid": "1176707c02c75252517248c63eee3c3950d6af48",
  "baseRefName": "main"
}
```

Merge result:

```text
PR #31 merged: yes
main HEAD after pull: 2fb1e957d052df28da1678482bf5ebb35159b32a
```

## 2. Phase 1: Toolchain And Environment Readiness

Commands checked:

```text
node --version
pnpm --version
docker --version
docker compose version
supabase --version
inngest --version
pnpm exec inngest-cli --version
npm view supabase version
pnpm run
git status --short
```

Results:

| Check                                 | Result                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| Node.js                               | `v22.18.0`                                                                        |
| pnpm                                  | `9.14.2`                                                                          |
| Docker                                | unavailable on PATH                                                               |
| Docker Compose                        | unavailable because Docker is unavailable                                         |
| Supabase CLI                          | unavailable on PATH                                                               |
| Inngest global CLI                    | unavailable on PATH                                                               |
| `pnpm exec inngest-cli --version`     | unavailable; package not installed locally                                        |
| `npm view supabase version`           | registry package available as `2.98.0`; no project dependency was installed       |
| `pnpm inngest:dev` script             | available; uses `npx inngest-cli@latest dev -u http://localhost:3000/api/inngest` |
| Git working tree before report branch | clean                                                                             |

Phase result:

```text
blocked_missing_docker
```

Secondary blocker:

```text
blocked_missing_supabase_cli
```

Because Docker is unavailable, the work package stopped before local Supabase
execution. Local DB readiness was not faked.

## 3. Phase 2: Local Supabase Setup Design

Status:

```text
local_supabase_ready: no
phase result: blocked
```

Repo evidence:

- Migrations exist:
  - `0001_initial_schema.sql`
  - `0002_schema_audit_implementation.sql`
  - `0003_storage_mime_types.sql`
  - `0004_classifier_prep.sql`
  - `0005_document_subtype.sql`
- `supabase/config.toml` is not present.
- Docker is not available on PATH.
- Supabase CLI is not available on PATH.

Actions not performed:

- Did not create `supabase/config.toml`.
- Did not start Supabase.
- Did not apply migrations.
- Did not connect to any database.
- Did not generate or print local Supabase keys.

Exact user action needed:

1. Install and start Docker Desktop, or otherwise expose a working Docker
   runtime and Docker Compose to PATH.
2. Install/expose Supabase CLI on PATH, or explicitly approve an `npx`/`pnpm dlx`
   Supabase CLI workflow for the next task.
3. Approve creating/restoring a local-only `supabase/config.toml`.
4. Re-run local setup readiness before any data mutation.

## 4. Phase 3: Local App And Inngest Readiness

Status:

```text
local_app_ready: no
local_inngest_ready: no
phase result: blocked_missing_local_supabase
```

Repo evidence:

- Local app script exists:

  ```text
  pnpm dev
  ```

- Local Inngest script exists:

  ```text
  pnpm inngest:dev
  ```

- Inngest app route exists:

  ```text
  /api/inngest
  ```

- Inngest functions registered:
  - `process-document`
  - `watchdog-stuck-documents`

Expected local URLs after later approval:

```text
app: http://localhost:3000
Inngest dashboard: http://localhost:8288
Supabase: local generated Supabase URL only
```

Actions not performed:

- Did not start the app.
- Did not start Inngest.
- Did not inspect `.env.local`.
- Did not print secret values.
- Did not verify or mutate any local DB.

Required env var names only:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
INNGEST_DEV
INNGEST_BASE_URL
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
SPECTIX_FAKE_CLAUDE_CLASSIFIER
SPECTIX_FORCE_DOCUMENT_FAILURE
```

## 5. Phase 4: Smoke Execution

Status:

```text
smoke executed: no
claim created: no
documents uploaded: no
SMOKE_CLAIM_ID: not created
```

Reason:

```text
blocked_missing_docker
```

The required execution gates were not satisfied:

- Local Supabase was not confirmed.
- App was not confirmed to point to local Supabase.
- Local Inngest was not started or confirmed.
- No local DB was available.

No claim/document IDs exist from this work package because execution did not
begin.

## 6. Route Verification Status

Route-by-route smoke result:

| Slot                       | Expected route   | Result  |
| -------------------------- | ---------------- | ------- |
| `receipt_general`          | `receipt`        | not run |
| `police_report`            | `police`         | not run |
| `hotel_letter`             | `hotel_generic`  | not run |
| `medical_visit`            | `medical`        | not run |
| `witness_letter`           | `hotel_generic`  | not run |
| `flight_booking_or_ticket` | `hotel_generic`  | not run |
| `boarding_pass`            | `skip_dedicated` | not run |
| `other_misc`               | `skip_other`     | not run |

Audit/event findings:

```text
not available; no smoke execution occurred
```

Extracted data findings:

```text
not available; no smoke execution occurred
```

Failures/stuck documents:

```text
not available; no documents were uploaded
```

## 7. Safety Confirmations

| Safety item                      | Result |
| -------------------------------- | ------ |
| Production data touched          | no     |
| Production Supabase touched      | no     |
| Production claim created         | no     |
| Documents uploaded to production | no     |
| Any claim created                | no     |
| Any documents uploaded           | no     |
| Secrets printed                  | no     |
| `.env.local` read                | no     |
| Env/deploy settings changed      | no     |
| App runtime code changed         | no     |
| DB schema changed                | no     |
| Production migrations applied    | no     |
| Local migrations applied         | no     |
| Supabase project/branch created  | no     |
| Deploy performed                 | no     |
| OpenClaw cron/24-7 enabled       | no     |
| Auto-merge/deploy enabled        | no     |

## 8. Final Work Package Result

Overall result:

```text
blocked_missing_docker
```

Local Supabase readiness:

```text
not ready
```

Local app readiness:

```text
not started; blocked on local Supabase readiness
```

Local Inngest readiness:

```text
not started; blocked on local app and local Supabase readiness
```

Smoke execution readiness:

```text
not ready
```

## 9. Exact Next CEO Decision Required

CEO must choose one next path:

1. Continue Option A local setup:
   - Confirm Docker Desktop is installed and running.
   - Confirm Docker and Docker Compose are available on PATH.
   - Approve installing/exposing Supabase CLI, or approve `npx`/`pnpm dlx`
     Supabase CLI usage.
   - Approve creating/restoring local-only `supabase/config.toml`.
   - Approve a later setup-validation task that starts local Supabase and
     applies repo migrations locally only.

2. Provide another confirmed non-production environment:
   - Provide approved host.
   - Confirm Supabase target is non-production.
   - Confirm data mutation approval for that non-production target.
   - Confirm app/Inngest/document upload processing are wired there.

Until one path is approved and confirmed, Codex must not create the smoke
claim, upload documents, execute the smoke, mutate data, deploy, or touch
production Supabase.
