# INNGEST_BASE_URL Post-Merge Audit

## Context

SMOKE-002B-RETRY-004 failed before product processing because local Inngest registration failed. DIAG-INNGEST-001 identified local `INNGEST_BASE_URL` misconfiguration as the root cause. SMOKE-002B-RETRY-005 removed the local-only bad line from `.env.local`, verified `/api/inngest` registration, and passed.

## Investigation Result

The bad app-registration endpoint value was propagated by onboarding/runbook docs. Tracked docs contained `INNGEST_BASE_URL=http://localhost:3000/api/inngest`, which points at the Next.js registration route instead of the Inngest dev server.

Canonical local dev guidance already used the correct dev-server target:

- `docs/DEVELOPMENT.md`: `INNGEST_BASE_URL=http://localhost:8288`
- `docs/agents/prompts/TASK-SPECTIX-001_LOCAL_ENV_VARS_TEMPLATE.md`: `INNGEST_BASE_URL=http://localhost:8288`
- `playwright.config.ts` and e2e tests also use `http://localhost:8288`; these were inspected but not modified because this PR is docs-only and they already use the correct value.

## Corrected Docs

- `docs/agents/prompts/TASK-SPECTIX-001_NONPROD_ENV_SETUP_TEMPLATE.md`
- `docs/agents/prompts/TASK-SPECTIX-001_NONPROD_ENV_READY_CHECK.md`

Both now use:

`INNGEST_BASE_URL=http://localhost:8288`

## Local Artifact Not Edited

The ignored local file `.openclaw-local/smoke-inputs/TASK-SPECTIX-001/nonprod.env.template` also contains the old value, but it is local smoke input state and was not edited or committed. Future smoke setup should regenerate local env templates from the corrected tracked docs if needed.

## Safety

- `.env.local` was not read into docs, edited, printed, or committed.
- No Supabase mutation was performed.
- No smoke, claim creation, upload, deploy, or runtime code change was performed.
