# TASK-SPECTIX-001 Non-Production Environment Plan

This document records safe discovery for a non-production environment suitable
for the `TASK-SPECTIX-001` broad extraction smoke test. It does not approve or
run the smoke test, create a claim, upload documents, mutate production data,
change app code, change DB schema, touch secrets/env/deploy settings, create a
Supabase branch/project, deploy, or enable OpenClaw cron/24-7.

## 1. Discovery Scope

Inspected safely:

- `README.md`
- `docs/CURRENT_STATE.md`
- `docs/agents/prompts/TASK-SPECTIX-001_FINAL_EXECUTION_GATE.md`
- `.vercel/project.json`
- Vercel read-only project lookup, which returned `403 Forbidden`
- `package.json`
- `.env.local.example`
- Supabase repo structure and migration filenames
- `supabase/.temp/project-ref`
- `supabase/.temp/linked-project.json`
- Documentation references to staging, preview, local, Supabase, and Vercel

Not inspected or changed:

- `.env.local` secret values
- Vercel environment variable values
- Supabase service role keys, anon keys, pooler URLs, or credentials
- Supabase database contents
- Deployment settings
- Production or non-production data

## 2. Environment Inventory

| Option                                          | Evidence found                                                                                                            | Classification                | Notes                                                                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Production host `https://spectix-v1.vercel.app` | Documented in `docs/specs/spike-01.md` and final gate                                                                     | `unsafe_production`           | Claim creation and upload would mutate the configured Supabase target. Production mutation is not approved.                                    |
| Vercel preview + non-production Supabase        | Docs mention Vercel preview as a review step, but no concrete preview URL or non-production Supabase target is documented | `unknown`                     | Read-only Vercel project lookup returned `403 Forbidden`, so this session cannot confirm preview deployments or env targets.                   |
| Staging host + non-production Supabase          | No staging host or staging Supabase target found in repo docs/config                                                      | `unknown`                     | Requires CEO-provided host and target confirmation.                                                                                            |
| Local app + local Supabase                      | README documents local Next.js and Inngest dev; repo has migrations; `.env.local.example` lists required vars             | `possible_but_needs_setup`    | No `supabase/config.toml` exists, Supabase CLI is not on PATH, and `.env.local` was not read. Local target is not ready from repo state alone. |
| Existing linked Supabase project                | `supabase/.temp` links to a project named `spectix-v1`                                                                    | `blocked_missing_credentials` | Link metadata does not prove the project is non-production. Do not use for smoke until CEO confirms target purpose.                            |
| Dedicated Supabase branch/project for smoke     | No existing branch/project documented                                                                                     | `possible_but_needs_setup`    | Safest cloud-like path if CEO provides/approves isolated Supabase and Vercel preview wiring.                                                   |

No option is currently `ready_nonprod`.

## 3. Safest Recommended Path

Recommended path:

```text
Option A first: local app + isolated local Supabase + local Inngest
```

Why:

- It avoids production data mutation.
- It avoids deployment changes.
- It keeps smoke records local/disposable.
- It can reuse existing repo migrations and local synthetic PDFs.
- It does not require confirming or modifying Vercel preview environment
  variables.

Current blockers for Option A:

- `supabase/config.toml` is not present.
- Supabase CLI is not installed or not on PATH.
- `.env.local` exists but was not inspected because it may contain secrets.
- Local Supabase target is not confirmed isolated/non-production.
- Local Inngest processing must be explicitly started later if execution is
  approved.
- CEO has not approved creating local smoke data.

If a browser-accessible cloud path is required, the recommended fallback is:

```text
Option B: Vercel preview + dedicated non-production Supabase branch/project
```

This requires CEO/human owner to provide the preview URL and confirm that all
Vercel preview env vars point only at the isolated Supabase target.

## 4. Setup Plan Options

### Option A: Local Supabase + Local App

Required steps:

1. CEO approves local-only smoke environment preparation.
2. Install or expose Supabase CLI on PATH, or approve use of `npx supabase` if
   that is the project convention.
3. Create or restore `supabase/config.toml` using safe local defaults.
4. Start local Supabase.
5. Apply existing migrations only:
   - `0001_initial_schema.sql`
   - `0002_schema_audit_implementation.sql`
   - `0003_storage_mime_types.sql`
   - `0004_classifier_prep.sql`
   - `0005_document_subtype.sql`
6. Configure `.env.local` to point at the local Supabase target without
   printing or committing secret values.
7. Start `pnpm dev`.
8. Start `pnpm inngest:dev`.
9. Run a read-only health check only after CEO approves environment validation.
10. Proceed to claim creation/upload only in a later CEO-approved execution
    task.

Expected data mutation:

- Local-only `claims`, `documents`, Storage objects, `audit_log`, and Inngest
  events during the future smoke execution.

Secrets needed:

- Local Supabase anon/service-role values.
- Anthropic key or a CEO-approved non-production fake classifier mode.
- Local Inngest dev configuration if needed.

Risks:

- Local runtime may not exactly match Vercel production.
- Requires local CLI/Docker-style setup.
- If `.env.local` accidentally points at production, local app would still
  mutate production. Human confirmation is mandatory.

Cost/complexity:

- Lowest cloud cost.
- Medium setup effort because local Supabase config is absent.

Recommendation:

- Best first target if CEO wants no production mutation.

### Option B: Supabase Branch + Vercel Preview

Required steps:

1. CEO approves creating or using a dedicated Supabase non-production
   branch/project.
2. Human owner provisions the Supabase branch/project outside this task.
3. Apply existing migrations to that target.
4. Configure Vercel preview environment variables to point only at the
   non-production Supabase target.
5. Confirm Inngest preview/dev routing can process document uploads.
6. Provide Codex with:
   - approved preview host
   - environment type `preview`
   - Supabase target confirmation
   - mutation approval for the preview target
7. Proceed to execution only in a later approved task.

Expected data mutation:

- Preview/non-production `claims`, `documents`, Storage objects, `audit_log`,
  and Inngest events.

Secrets needed:

- Non-production Supabase API keys in Vercel preview env.
- Anthropic key or CEO-approved fake classifier config.
- Inngest preview/dev keys if required.

Risks:

- Vercel preview env could accidentally target production.
- Read-only Vercel project lookup returned `403 Forbidden` in this session, so
  Codex cannot independently confirm deployment/env metadata.
- Requires careful owner verification before use.

Cost/complexity:

- Medium to high depending on Supabase branching/project availability.
- Better fidelity than local if preview mirrors deployment runtime.

Recommendation:

- Best cloud-like path after CEO/human owner confirms isolation.

### Option C: Separate Staging Project

Required steps:

1. CEO approves a separate staging Supabase project and staging app host.
2. Human owner provisions and documents the staging host.
3. Apply migrations to staging.
4. Configure app env values for staging only.
5. Configure Inngest processing for staging.
6. Provide Codex with host and target confirmation.
7. Execute only in a later approved smoke task.

Expected data mutation:

- Staging-only claim/document/storage/audit/Inngest records.

Secrets needed:

- Staging Supabase and Inngest secrets.
- Staging Anthropic key or approved fake classifier mode.

Risks:

- Highest setup and maintenance overhead.
- Requires ongoing separation from production.
- Must prevent accidental production env reuse.

Cost/complexity:

- Highest cost and complexity.
- Strongest long-term safety if maintained.

Recommendation:

- Best long-term test environment, but heavier than needed for the immediate
  smoke unless Spectix expects repeated production-like validation.

## 5. Exact Blockers

- No documented ready non-production host.
- No documented staging host.
- No documented Vercel preview URL for this smoke.
- Vercel read-only project metadata lookup returned `403 Forbidden`.
- No `supabase/config.toml`.
- Supabase CLI is not available on PATH.
- Existing Supabase link metadata does not prove a non-production target.
- `.env.local` was not read and cannot be used as evidence without exposing or
  manually confirming secrets.
- `SMOKE_CLAIM_ID` is still missing.
- CEO has not approved claim creation, document upload, or smoke execution.

## 6. What CEO Must Provide Or Approve

For any non-production path, CEO/human owner must provide:

```text
APPROVED_HOST:
ENVIRONMENT_TYPE: local / preview / staging
SUPABASE_PROJECT_CONFIRMED: yes
DATA_MUTATION_APPROVED: yes
CREATE_CLAIM_APPROVED: yes/no
UPLOAD_DOCUMENTS_APPROVED: yes/no
RUN_SMOKE_APPROVED: yes/no
```

For local setup specifically, CEO must approve:

- Local Supabase setup or restoration of `supabase/config.toml`.
- Human confirmation that `.env.local` targets only local/non-production
  Supabase.
- Local Inngest dev usage.
- Whether to use real Anthropic calls or non-production fake classifier mode.

For Vercel preview or staging, CEO/human owner must approve and provide:

- The exact host.
- Confirmation that Supabase target is non-production.
- Confirmation that Vercel env vars target only the approved non-production
  Supabase project/branch.
- Confirmation that Inngest processing is wired for that environment.

## 7. Must Not Touch

- App runtime code.
- DB schema or migrations.
- Secrets/env values.
- Vercel deployment settings.
- Supabase project/branch creation.
- Production data.
- Production storage objects.
- Auth, billing, or pricing.
- OpenClaw cron/24-7.
- Auto-merge or auto-deploy.

## 8. Why Production Smoke Is Not Currently Approved

The only confirmed deployed host is `https://spectix-v1.vercel.app`, which is
classified `unsafe_production` for this task. Running the smoke there would
create a claim, upload synthetic documents, write Storage objects, insert
`documents` and `audit_log` rows, and trigger Inngest processing against the
configured target. CEO has not explicitly approved production mutation, and the
Supabase target behind the host has not been confirmed safe for this smoke in
the required approval fields.

## 9. Final Recommendation

Current decision:

```text
No ready non-production smoke environment exists from repo-verifiable evidence.
```

Recommended next decision:

```text
Approve Option A local isolated environment setup, or provide a confirmed
non-production Vercel preview/staging host with Supabase target confirmation.
```

Until that decision is made, Codex must not create the claim, upload documents,
execute the smoke, mutate data, create Supabase resources, or deploy.
