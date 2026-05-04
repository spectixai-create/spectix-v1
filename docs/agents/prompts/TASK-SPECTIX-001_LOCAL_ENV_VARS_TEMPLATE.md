# TASK-SPECTIX-001 Local Env Vars Template

This template lists local environment variable names only. It must not contain
real values and must not be copied into the repo with secrets filled in.

## Required Local App Variables

```text
NEXT_PUBLIC_SUPABASE_URL=<local Supabase URL only>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key only>
SUPABASE_SERVICE_ROLE_KEY=<local service role key only>
ANTHROPIC_API_KEY=<non-production Anthropic key or approved placeholder>
```

## Local Inngest Variables

```text
INNGEST_DEV=1
INNGEST_BASE_URL=http://localhost:8288
INNGEST_EVENT_KEY=<blank for local dev unless required>
INNGEST_SIGNING_KEY=<blank for local dev unless required>
```

## Optional Non-Production Controls

```text
SPECTIX_FAKE_CLAUDE_CLASSIFIER=true
SPECTIX_FORCE_DOCUMENT_FAILURE=<leave unset unless testing failure handling>
```

## Local Safety Checks

Before any smoke execution, confirm without printing secrets:

```text
NEXT_PUBLIC_SUPABASE_URL is local: yes/no
NEXT_PUBLIC_SUPABASE_ANON_KEY present: yes/no
SUPABASE_SERVICE_ROLE_KEY present: yes/no
ANTHROPIC_API_KEY present or fake classifier approved: yes/no
INNGEST_DEV set for local dev: yes/no
```

Stop if any value points to production or an unknown hosted Supabase project.
