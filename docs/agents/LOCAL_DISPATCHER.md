# Local OpenClaw Dispatcher

## Why This Exists

The installed OpenClaw CLI does not currently support GitHub issue or pull
request comments as a channel or binding target. Spectix still needs a usable
local agent workflow for safe dummy routing, so this repository includes a
temporary filesystem dispatcher.

This dispatcher is local operations tooling. It does not change Spectix product
runtime behavior and does not replace the OpenClaw Gateway. It is intended to
bridge the gap until a supported OpenClaw channel or TaskFlow import path is
available. After PR #23, it is the operational baseline for local Spectix
CEO/PM/Codex/QA handoffs.

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

For real Spectix project work, non-dummy task types are planning-only. They may
create ignored local prompt files under `.openclaw-local/outbox/`, but they may
not approve or write repository files. Product implementation still requires a
separate explicit CEO-approved Codex task.

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

Create a real planning task:

```powershell
node scripts/openclaw-local-dispatcher.mjs create-task --id TASK-SPECTIX-001 --title "Post-merge production smoke plan for broad extraction" --type ops_planning --risk medium
```

Generate local agent prompts:

```powershell
node scripts/openclaw-local-dispatcher.mjs generate-agent-prompts TASK-SPECTIX-001
```

Generate a role-specific handoff packet:

```powershell
node scripts/openclaw-local-dispatcher.mjs handoff TASK-SPECTIX-001 --role codex
node scripts/openclaw-local-dispatcher.mjs handoff TASK-SPECTIX-001 --role pm
node scripts/openclaw-local-dispatcher.mjs handoff TASK-SPECTIX-001 --role ceo
```

List tasks:

```powershell
node scripts/openclaw-local-dispatcher.mjs list
```

Show next required actions:

```powershell
node scripts/openclaw-local-dispatcher.mjs next
```

Advance a task through a valid gate:

```powershell
node scripts/openclaw-local-dispatcher.mjs advance TASK-SPECTIX-001 --to pm_spec_ready
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

## Operational Planning Flow

Use planning tasks for work that should be routed through CEO, PM, Architect,
Codex, and QA without executing implementation yet. The dispatcher supports
these planning task types:

- `ops_planning`
- `pm_review`
- `codex_implementation_prompt`
- `qa_review_plan`

Only `dummy_docs_only` may write a repository file, and only the dummy output
file. Every other task type must keep `allowedFiles` empty and use local outbox
prompts until a later approved implementation task exists.

## Handoff Flow

Use handoff files when a CEO, PM, Codex, QA, or Architect chat becomes too long,
compacted, inconsistent, or unsafe to continue. The dispatcher writes:

```text
.openclaw-local/outbox/TASK_ID/handoff-ROLE.md
```

Handoff generation is read-only with respect to task status. It does not approve
scope, execute smoke, merge, deploy, mutate production data, or enable OpenClaw
automation. The new chat must verify state before doing any work and must not
edit files in its first turn.

See [HANDOFF_PROTOCOL.md](HANDOFF_PROTOCOL.md).

For the final CEO chat transition package, use
[CHAT_SETUP_CHECKLIST.md](CHAT_SETUP_CHECKLIST.md) and the role handoff files
under `docs/agents/prompts/FINAL_*_HANDOFF.md`. Local runtime handoffs generated
by the dispatcher remain ignored under `.openclaw-local/outbox/`.

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

The first supported real-channel path is prepared in
[OPENCLAW_SLACK_CONTROL_PLANE_SETUP.md](prompts/OPENCLAW_SLACK_CONTROL_PLANE_SETUP.md).
Until Slack dummy routing passes, the local dispatcher remains the operational
bridge and all `.openclaw-local/` runtime artifacts remain uncommitted.
