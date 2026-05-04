# Local OpenClaw Dispatcher

## Why This Exists

The installed OpenClaw CLI does not currently support GitHub issue or pull
request comments as a channel or binding target. Spectix still needs a usable
local agent workflow for safe dummy routing, so this repository includes a
temporary filesystem dispatcher.

This dispatcher is local operations tooling. It does not change Spectix product
runtime behavior and does not replace the OpenClaw Gateway. It is intended to
bridge the gap until a supported OpenClaw channel or TaskFlow import path is
available.

## Safety Model

The dispatcher:

- Stores runtime state under ignored `.openclaw-local/`.
- Manages tasks as JSON files.
- Enforces CEO, PM, Codex, QA, and CEO-final gates.
- Creates prompt and report files for local handoff inspection.
- Refuses unsafe allowed files such as app code, DB, auth, billing, pricing,
  secrets, env, deployment, Supabase, migration, and Vercel paths.
- Does not enable cron, 24/7 mode, external channels, auto-merge, or
  auto-deploy.
- Does not call external APIs.
- Does not run arbitrary shell commands.

For the dummy flow, the only repository file the Codex simulation may write is:

```text
docs/agents/dummy-output.md
```

## Commands

Initialize local runtime state:

```powershell
node scripts/openclaw-local-dispatcher.mjs init
```

Show dispatcher state:

```powershell
node scripts/openclaw-local-dispatcher.mjs status
```

Create the dummy task:

```powershell
node scripts/openclaw-local-dispatcher.mjs create-dummy
```

Show the dummy task:

```powershell
node scripts/openclaw-local-dispatcher.mjs show DUMMY-OPENCLAW-001
```

Dispatch the dummy task to the PM simulation:

```powershell
node scripts/openclaw-local-dispatcher.mjs dispatch
```

Simulate CEO development approval:

```powershell
node scripts/openclaw-local-dispatcher.mjs approve-dev DUMMY-OPENCLAW-001
```

Run the dummy Codex simulation:

```powershell
node scripts/openclaw-local-dispatcher.mjs run-codex-dummy DUMMY-OPENCLAW-001
```

Run the dummy QA simulation:

```powershell
node scripts/openclaw-local-dispatcher.mjs qa DUMMY-OPENCLAW-001
```

Simulate CEO final approval and archive the task:

```powershell
node scripts/openclaw-local-dispatcher.mjs final-approve DUMMY-OPENCLAW-001
```

Audit safety:

```powershell
node scripts/openclaw-local-dispatcher.mjs audit
```

## Full Dummy Flow

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

## Manual Regression: QA Rejects Unauthorized Diffs

Run this from a clean checkout when testing QA enforcement:

```powershell
node scripts/openclaw-local-dispatcher.mjs init
node scripts/openclaw-local-dispatcher.mjs create-dummy
node scripts/openclaw-local-dispatcher.mjs dispatch
node scripts/openclaw-local-dispatcher.mjs approve-dev DUMMY-OPENCLAW-001
node scripts/openclaw-local-dispatcher.mjs run-codex-dummy DUMMY-OPENCLAW-001
```

Temporarily modify `package.json` in a harmless reversible way, then run:

```powershell
node scripts/openclaw-local-dispatcher.mjs qa DUMMY-OPENCLAW-001
```

Expected result: QA fails and reports `package.json` as an unauthorized changed
file. Revert `package.json` completely, then run:

```powershell
node scripts/openclaw-local-dispatcher.mjs qa DUMMY-OPENCLAW-001
```

Expected result: QA passes when the actual git changed files are limited to:

```text
docs/agents/dummy-output.md
```

## Runtime Files

The dispatcher creates and updates ignored runtime files under:

```text
.openclaw-local/
```

Do not commit that directory. Prompt, task, queue, archive, and state files are
local-only operating records.

## Upgrade Path

When OpenClaw supports an auditable command channel, the local dispatcher should
be replaced or adapted by mapping the same task schema and status transitions to
the real channel. The replacement must preserve these safety defaults:

- No automatic merge.
- No automatic deploy.
- No cron or 24/7 loop without explicit approval.
- Codex only receives approved tasks.
- Dummy docs-only routing must pass before any product task is routed.
