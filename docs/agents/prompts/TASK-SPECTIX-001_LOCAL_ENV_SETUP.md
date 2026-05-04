# TASK-SPECTIX-001 Local Environment Setup Plan

This document prepares an isolated local environment path for the
`TASK-SPECTIX-001` broad extraction smoke test. It does not approve smoke
execution, create a claim, upload documents, mutate production or
non-production data, touch production DB, change secrets/env/deploy settings,
change app runtime code, create DB migrations, deploy, or enable OpenClaw
cron/24-7.

## 1. Purpose

CEO approved Option A planning/setup readiness only:

```text
local app + isolated local Supabase + local Inngest
```

The goal is to make the next execution decision concrete without starting
services or creating smoke records yet.

## 2. Required Local Tools

| Tool           | Required for                          | Current availability                                             |
| -------------- | ------------------------------------- | ---------------------------------------------------------------- |
| Node.js        | Next.js app and repo scripts          | Available: `v22.18.0`                                            |
| pnpm           | Package scripts                       | Available: `9.14.2`                                              |
| Docker         | Local Supabase containers             | Missing from PATH                                                |
| Docker Compose | Local Supabase containers             | Missing because Docker is unavailable                            |
| Supabase CLI   | Initialize/start/reset local Supabase | Missing from PATH                                                |
| Inngest CLI    | Local event processing                | No global CLI on PATH; repo script uses `npx inngest-cli@latest` |

No install or service startup was performed.

## 3. Current Availability Result

Local app:

- `pnpm dev` exists.
- Expected app URL: `http://localhost:3000`.
- The app can run locally only after `.env.local` points at an isolated local
  Supabase target and required env var names are populated.

Local Supabase:

- Repo migrations exist under `supabase/migrations/`.
- No `supabase/config.toml` is present.
- Supabase CLI is not available on PATH.
- Docker is not available on PATH.
- Local Supabase is therefore possible in principle, but not ready from the
  current machine state.

Local Inngest:

- `pnpm inngest:dev` exists and runs
  `npx inngest-cli@latest dev -u http://localhost:3000/api/inngest`.
- Inngest route exists at `/api/inngest`.
- Function registry includes `process-document` and
  `watchdog-stuck-documents`.
- Expected Inngest dashboard URL: `http://localhost:8288`.
- Local Inngest appears possible after the app is running and CEO approves
  environment validation.

## 4. Missing Tools

Before local smoke can be prepared for execution, install or expose:

- Docker Desktop or equivalent Docker runtime.
- Docker Compose support.
- Supabase CLI, or an approved project convention using `npx supabase`.

Do not start Docker, Supabase, the app, or Inngest until CEO approves the next
setup/execution step.

## 5. Required Env Var Names Only

Required for local app and Supabase access:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
```

Inngest local/dev:

```text
INNGEST_DEV
INNGEST_BASE_URL
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
```

Optional non-production/test controls:

```text
SPECTIX_FAKE_CLAUDE_CLASSIFIER
SPECTIX_FORCE_DOCUMENT_FAILURE
```

Do not print, commit, or paste actual values into repo files. Do not inspect
`.env.local` unless CEO explicitly asks a human-safe verification step that
does not reveal values.

## 6. Local Supabase Setup Plan

Readiness-only plan:

1. CEO approves local environment setup.
2. Human owner installs Docker and Supabase CLI, or approves `npx supabase`.
3. Create/restore `supabase/config.toml` using local-only defaults.
4. Start local Supabase only after approval.
5. Apply existing migrations only:
   - `0001_initial_schema.sql`
   - `0002_schema_audit_implementation.sql`
   - `0003_storage_mime_types.sql`
   - `0004_classifier_prep.sql`
   - `0005_document_subtype.sql`
6. Confirm the local Storage bucket and DB objects exist.
7. Confirm generated local Supabase URL/key values are used only in
   `.env.local`.
8. Confirm `.env.local` points to local Supabase, not any hosted/project URL.

No migrations should be created for TASK-SPECTIX-001 local setup.

## 7. Local Inngest Setup Plan

Readiness-only plan:

1. Start the local app later with `pnpm dev`.
2. Start Inngest later with `pnpm inngest:dev`.
3. Confirm Inngest dev server connects to:

   ```text
   http://localhost:3000/api/inngest
   ```

4. Confirm dashboard is reachable at:

   ```text
   http://localhost:8288
   ```

5. Confirm registered functions:
   - `process-document`
   - `watchdog-stuck-documents`

Do not start Inngest during this planning task.

## 8. Local App Setup Plan

Readiness-only plan:

1. Confirm `.env.local` contains only local/non-production values.
2. Confirm required env var names are present, without printing values.
3. Run `pnpm dev` only after CEO approves environment validation.
4. Use app URL:

   ```text
   http://localhost:3000
   ```

5. Use read-only health verification only after CEO approves it:

   ```text
   GET http://localhost:3000/api/health
   ```

The health route reads table counts through the Supabase admin client. It does
not mutate data, but it must still target local Supabase only.

## 9. Verifying The App Points To Local Supabase

Do not print secret values. Use evidence that does not reveal keys:

1. Human owner confirms `NEXT_PUBLIC_SUPABASE_URL` is a local Supabase URL, not
   a hosted `*.supabase.co` project.
2. Human owner confirms `SUPABASE_SERVICE_ROLE_KEY` is the local generated
   service role value.
3. Human owner confirms `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the local generated
   anon value.
4. If a script is approved later, it should print only booleans/classification,
   for example:

   ```text
   NEXT_PUBLIC_SUPABASE_URL is local: yes/no
   SUPABASE_SERVICE_ROLE_KEY present: yes/no
   NEXT_PUBLIC_SUPABASE_ANON_KEY present: yes/no
   ```

5. Stop immediately if any local app variable points at a production or hosted
   Supabase project not explicitly approved for this smoke.

## 10. Creating A Local Smoke Claim Later

Do not run now.

After CEO approves local execution, create the claim with:

```text
POST http://localhost:3000/api/claims
```

Use the approved payload from
`docs/agents/prompts/TASK-SPECTIX-001_FINAL_EXECUTION_GATE.md`.

Record:

```text
SMOKE_CLAIM_ID = response.data.claim.id
```

Expected local-only mutation:

- One local `claims` row.
- One local `audit_log` row with `action = 'claim_created'`.

## 11. Uploading Synthetic PDFs Later

Do not run now.

After CEO approves upload execution, upload only the local synthetic PDFs under:

```text
.openclaw-local/smoke-inputs/TASK-SPECTIX-001/files/
```

Use:

```text
POST http://localhost:3000/api/claims/<SMOKE_CLAIM_ID>/documents
```

Multipart field:

```text
file
```

Expected local-only mutation:

- Local Storage objects under the local `claim-documents` bucket.
- Local `documents` rows.
- Local `audit_log` rows.
- Local Inngest `claim/document.uploaded` events.

## 12. Running Verification Queries Locally Later

Do not run now.

After CEO approves verification, run only the SQL queries from:

```text
docs/agents/prompts/TASK-SPECTIX-001_SMOKE_READINESS_PACKET.md
```

Replace only:

```text
<SMOKE_CLAIM_ID>
```

Use the local Supabase database only. Do not query production or hosted
projects unless separately approved.

## 13. Stop Conditions

Stop before setup or execution if any condition is true:

- Docker is unavailable.
- Supabase CLI or approved CLI alternative is unavailable.
- `supabase/config.toml` is missing and CEO has not approved creating/restoring
  it.
- `.env.local` cannot be confirmed local-only without exposing secrets.
- Any required env var is missing.
- Any env var points to production or unknown hosted Supabase.
- The local app cannot start without production credentials.
- Inngest local dev cannot connect to `http://localhost:3000/api/inngest`.
- Any synthetic PDF is missing.
- Any claim creation/upload/smoke execution approval is missing.
- Any schema, migration, secret, deploy, auth, billing, pricing, or production
  data change is required.

## 14. Execution Approval Status

This document does not approve smoke execution.

Current status:

```text
smoke executed: no
claim created: no
documents uploaded: no
production data mutated: no
local environment setup executed: no
```

Exact next CEO decision required:

```text
Approve installing/exposing Docker and Supabase CLI plus creating/restoring
local-only supabase/config.toml, or provide a different confirmed non-production
environment.
```
