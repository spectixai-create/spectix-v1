# Handoff Protocol

## Why Handoff Is Needed

Long AI-assisted workflows can become overloaded, compacted, inconsistent, or
unsafe to continue. A handoff creates a clean role-specific snapshot so the next
chat starts from repo and dispatcher state instead of stale memory.

The handoff protocol is a stop-and-verify process. It does not approve scope,
execute smoke, mutate production data, merge, deploy, or activate OpenClaw.

## When To Open A New Chat

Open a new chat when:

- The current chat is too long or has been compacted.
- The role is losing consistency with the repo or task state.
- Instructions conflict or the safe next step is unclear.
- The chat has started mixing CEO, PM, Codex, QA, or Architect responsibilities.
- Any production, secret, deployment, merge, or smoke-execution risk appears.

## Handoff Process

1. Stop new work in the old chat.
2. Generate a role-specific handoff file with the local dispatcher.
3. Open a new chat for the same role.
4. Paste the role opening plus the handoff content.
5. The new chat performs read-only state verification before doing work.

## Handoff Command

Use:

```powershell
node scripts/openclaw-local-dispatcher.mjs handoff TASK-SPECTIX-001 --role codex
```

Supported roles:

- `ceo`
- `pm`
- `architect`
- `codex`
- `qa`

The dispatcher writes local-only artifacts under:

```text
.openclaw-local/outbox/TASK_ID/handoff-ROLE.md
```

These files are ignored runtime artifacts and must not be committed.

## First-Turn Verification Rule

Every new chat must verify current state before doing work. It must not edit
files in the first turn.

For Codex, the handoff asks for:

```powershell
git status --short
git branch --show-current
git log --oneline -8
node scripts/openclaw-local-dispatcher.mjs status
node scripts/openclaw-local-dispatcher.mjs show TASK-SPECTIX-001
```

If the task involves a PR, Codex should also verify the relevant PR metadata
with `gh pr view`.

## Examples

Codex handoff:

```powershell
node scripts/openclaw-local-dispatcher.mjs handoff TASK-SPECTIX-001 --role codex
```

PM handoff:

```powershell
node scripts/openclaw-local-dispatcher.mjs handoff TASK-SPECTIX-001 --role pm
```

CEO handoff:

```powershell
node scripts/openclaw-local-dispatcher.mjs handoff TASK-SPECTIX-001 --role ceo
```

QA handoff:

```powershell
node scripts/openclaw-local-dispatcher.mjs handoff TASK-SPECTIX-001 --role qa
```

Architect handoff:

```powershell
node scripts/openclaw-local-dispatcher.mjs handoff TASK-SPECTIX-001 --role architect
```

## What Not To Do

- Do not keep implementing in an overloaded or inconsistent chat.
- Do not skip first-turn verification.
- Do not merge without an explicit approved PR and head SHA.
- Do not execute smoke without explicit CEO execution approval.
- Do not mutate production data unless explicitly approved.
- Do not touch secrets, env, deployment settings, auth, billing, or pricing.
- Do not enable cron, 24/7, auto-merge, or auto-deploy.
- Do not commit `.openclaw-local/` handoff artifacts.

## Dispatcher Integration

Handoff generation is read-only with respect to task status. It loads the task
from `.openclaw-local/`, validates the task and role, and writes a markdown
snapshot to `.openclaw-local/outbox/TASK_ID/`.

The handoff includes:

- Source-of-truth order.
- Current task fields.
- Payload and history summaries.
- Safety reminders.
- Role-specific first-turn verification.
- Role-specific output format.
