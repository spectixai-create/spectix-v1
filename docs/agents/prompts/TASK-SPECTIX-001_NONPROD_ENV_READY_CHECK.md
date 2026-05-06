# TASK-SPECTIX-001 Nonproduction Env Ready Check

This document prepares local environment readiness for the
`TASK-SPECTIX-001` smoke flow against the confirmed nonproduction Supabase
project only. It does not approve smoke execution, create claims, upload
documents, mutate data, touch app code, deploy, print secrets, or enable
OpenClaw cron/24-7.

## 1. Approved Target

Use only:

```text
project_id: aozbgunwhafabfmuwjol
url: https://aozbgunwhafabfmuwjol.supabase.co
```

Never use:

```text
project_id: fcqporzsihuqtfohqtxs
classification: production/active data
```

## 2. Current Local Env File Check

`.env.local` exists locally.

Variable names observed in `.env.local`, values not printed:

```text
ANTHROPIC_API_KEY
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
VERCEL_OIDC_TOKEN
```

Presence of a variable name does not prove the value is safe or
nonproduction. A human must verify the values without pasting them into chat or
committing them.

## 3. Required Variable Names

Required for local app access to the nonproduction Supabase project:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Required for LLM processing or an approved substitute:

```text
ANTHROPIC_API_KEY
```

Required or allowed for local Inngest/dev execution:

```text
INNGEST_DEV
INNGEST_BASE_URL
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
```

Optional nonproduction control if CEO approves fake classifier mode:

```text
SPECTIX_FAKE_CLAUDE_CLASSIFIER
```

## 4. Local-Only Template

Local ignored template created:

```text
.openclaw-local/smoke-inputs/TASK-SPECTIX-001/nonprod.env.template
```

It contains names and placeholders only:

```text
NEXT_PUBLIC_SUPABASE_URL=https://aozbgunwhafabfmuwjol.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<fill from Supabase dashboard for aozbgunwhafabfmuwjol>
SUPABASE_SERVICE_ROLE_KEY=<fill from Supabase dashboard for aozbgunwhafabfmuwjol>
ANTHROPIC_API_KEY=<local test key or approved fake mode>
INNGEST_DEV=1
INNGEST_BASE_URL=http://localhost:8288
INNGEST_EVENT_KEY=<local dev value if required>
INNGEST_SIGNING_KEY=<local dev value if required>
```

Local ignored safety checklist created:

```text
.openclaw-local/smoke-inputs/TASK-SPECTIX-001/env-safety-checklist.md
```

## 5. Manual Value Fill Procedure

The user must manually fill `.env.local` outside git:

1. Open the Supabase dashboard for project `aozbgunwhafabfmuwjol`.
2. Copy the nonproduction anon key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Copy the nonproduction service role key into `SUPABASE_SERVICE_ROLE_KEY`.
4. Set `NEXT_PUBLIC_SUPABASE_URL` exactly to:

   ```text
   https://aozbgunwhafabfmuwjol.supabase.co
   ```

5. Set `ANTHROPIC_API_KEY` to a local test key, or obtain CEO approval to use
   an available fake/nonproduction classifier mode.
6. Set local Inngest fields as needed for local dev.
7. Do not commit `.env.local`.
8. Do not paste keys into chat, issues, PRs, docs, or logs.

## 6. Safe Verification Without Printing Secrets

Use checks that reveal only booleans or classifications:

```text
NEXT_PUBLIC_SUPABASE_URL equals https://aozbgunwhafabfmuwjol.supabase.co: yes/no
NEXT_PUBLIC_SUPABASE_URL contains fcqporzsihuqtfohqtxs: yes/no
NEXT_PUBLIC_SUPABASE_ANON_KEY present: yes/no
SUPABASE_SERVICE_ROLE_KEY present: yes/no
ANTHROPIC_API_KEY present or fake mode approved: yes/no
INNGEST_DEV set for local/dev execution: yes/no
```

Do not print the actual values.

## 7. Blockers

Smoke execution remains blocked if any item is true:

- `NEXT_PUBLIC_SUPABASE_URL` is not exactly
  `https://aozbgunwhafabfmuwjol.supabase.co`.
- Any local env value points at `fcqporzsihuqtfohqtxs`.
- Nonproduction anon/service role keys are missing.
- A production Vercel env value is copied into `.env.local`.
- `.env.local` would be committed.
- Any secret would be printed.
- CEO has not approved the separate smoke execution task.

## 8. Current Status

```text
local env prepared: template/checklist only
smoke executed: no
claim created: no
documents uploaded: no
data mutated: no
secrets printed: no
secrets committed: no
```

Exact next manual fields needed from the user:

```text
NEXT_PUBLIC_SUPABASE_ANON_KEY for aozbgunwhafabfmuwjol
SUPABASE_SERVICE_ROLE_KEY for aozbgunwhafabfmuwjol
ANTHROPIC_API_KEY local test value or approved fake-mode decision
INNGEST_EVENT_KEY local/dev value if required
INNGEST_SIGNING_KEY local/dev value if required
```
