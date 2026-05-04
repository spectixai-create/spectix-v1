# TASK-SPECTIX-001 Nonproduction Env Setup Template

Use this template only for local `.env.local` setup after CEO approves schema
application to the nonproduction Supabase project. Do not commit filled values.
Do not use production keys.

Approved nonproduction Supabase URL:

```text
NEXT_PUBLIC_SUPABASE_URL=https://aozbgunwhafabfmuwjol.supabase.co
```

Required variable names:

```text
NEXT_PUBLIC_SUPABASE_ANON_KEY=<fill from Supabase dashboard/project API settings>
SUPABASE_SERVICE_ROLE_KEY=<fill from Supabase dashboard; never commit>
ANTHROPIC_API_KEY=<local test key or fake mode if supported>
INNGEST_DEV=1
INNGEST_BASE_URL=http://localhost:3000/api/inngest
INNGEST_EVENT_KEY=<local dev value if needed>
INNGEST_SIGNING_KEY=<local dev value if needed>
```

Optional nonproduction controls:

```text
SPECTIX_FAKE_CLAUDE_CLASSIFIER=true
SPECTIX_FORCE_DOCUMENT_FAILURE=<leave unset unless testing failure handling>
```

## Safety Checks Before Running Smoke

Confirm without printing secrets:

```text
NEXT_PUBLIC_SUPABASE_URL contains aozbgunwhafabfmuwjol: yes/no
NEXT_PUBLIC_SUPABASE_ANON_KEY is present: yes/no
SUPABASE_SERVICE_ROLE_KEY is present: yes/no
ANTHROPIC_API_KEY present or fake mode approved: yes/no
INNGEST_DEV is set for local/dev execution: yes/no
```

Hard stop if:

- `NEXT_PUBLIC_SUPABASE_URL` contains `fcqporzsihuqtfohqtxs`.
- Any key is copied from production.
- Any env value is committed to git.
- The app would point at production/active data.

## Current Status

```text
env file changed by Codex: no
secrets printed: no
schema applied: no
smoke executed: no
```
