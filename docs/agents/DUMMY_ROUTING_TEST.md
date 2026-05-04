# Dummy Routing Test

## Purpose

Verify the local OpenClaw dispatcher can route a controlled docs-only dummy task
without touching app code, DB schema, auth, billing, secrets, deployments, cron,
24/7 automation, or external channels.

## Test Task

Task ID: `DUMMY-OPENCLAW-001`

Goal: create or update only:

```text
docs/agents/dummy-output.md
```

## Command Sequence

Run from the repo root:

```powershell
node scripts/openclaw-local-dispatcher.mjs init
node scripts/openclaw-local-dispatcher.mjs status
node scripts/openclaw-local-dispatcher.mjs create-dummy
node scripts/openclaw-local-dispatcher.mjs show DUMMY-OPENCLAW-001
node scripts/openclaw-local-dispatcher.mjs dispatch
node scripts/openclaw-local-dispatcher.mjs approve-dev DUMMY-OPENCLAW-001
node scripts/openclaw-local-dispatcher.mjs run-codex-dummy DUMMY-OPENCLAW-001
node scripts/openclaw-local-dispatcher.mjs qa DUMMY-OPENCLAW-001
node scripts/openclaw-local-dispatcher.mjs final-approve DUMMY-OPENCLAW-001
node scripts/openclaw-local-dispatcher.mjs audit
node scripts/openclaw-local-dispatcher.mjs status
```

## Expected Flow

1. `create-dummy` creates the task in `.openclaw-local/inbox/`.
2. `dispatch` creates a PM prompt and deterministic PM spec, then moves the task
   to `pm_spec_ready`.
3. `approve-dev` simulates CEO development approval and moves the task to
   `ceo_dev_approved`.
4. `run-codex-dummy` writes only `docs/agents/dummy-output.md` and moves the
   task to `dev_done`.
5. `qa` verifies the dispatcher ledger for the dummy output and moves the task
   to `qa_approved`.
6. `final-approve` simulates CEO final approval, moves the task to `done`, and
   archives the task JSON under `.openclaw-local/archive/`.

## Expected Stops

- If Codex is requested before `ceo_dev_approved`, the dispatcher stops.
- If the dummy task allows anything except `docs/agents/dummy-output.md`, the
  dispatcher stops.
- If a task allows app code, DB, auth, billing, pricing, secrets, env,
  deployment, Supabase, migration, or Vercel paths, the dispatcher stops.
- The dispatcher has no merge, deploy, git push, branch deletion, external API,
  cron, 24/7, or external-channel command.

## Pass Criteria

- Task ID is preserved in every handoff.
- Status transitions are logged in task history.
- Only `docs/agents/dummy-output.md` is written by the Codex simulation.
- `.openclaw-local/` runtime files remain ignored and uncommitted.
- `node scripts/openclaw-local-dispatcher.mjs audit` passes.
- `git diff --check` passes.
- No automatic merge or deploy occurs.
