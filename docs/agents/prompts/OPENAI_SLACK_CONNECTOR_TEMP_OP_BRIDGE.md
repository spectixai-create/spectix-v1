# OpenAI Slack Connector Temporary OP Bridge

## Purpose

This document defines the temporary Spectix OP bridge that uses the official OpenAI/Codex Slack connector as the Slack control plane and the local OpenClaw dispatcher as the task/state bridge.

This bridge exists because native OpenClaw Slack Socket Mode routing remains blocked. PR #47 records the current native Slack routing blocker. This document does not repair or enable native OpenClaw Slack routing.

## Control Plane

Slack control messages are read from:

- Workspace: `spectix`
- Channel: `new-channel`
- Channel ID: `C0B19UJLUJF`

Codex reads these messages through the official OpenAI Slack connector and may run only approved local dispatcher commands. Codex returns results to Slack or chat manually in the current interactive session.

## Allowed Command Format

Only these temporary OP commands are allowed:

- `OP: status`
- `OP: next`
- `OP: audit`
- `OP: handoff TASK-SPECTIX-001 pm`
- `OP: handoff TASK-SPECTIX-001 architect`
- `OP: handoff TASK-SPECTIX-001 qa`
- `OP: report open-prs`

## Forbidden Commands

These commands are explicitly forbidden through the temporary bridge:

- `OP: merge`
- `OP: deploy`
- `OP: smoke`
- `OP: create claim`
- `OP: upload document`
- `OP: mutate supabase`
- `OP: migrate db`
- `OP: edit env`
- `OP: enable cron`
- `OP: enable 24/7`
- `OP: auto-merge`
- `OP: auto-deploy`

Any Slack message containing these requests must be treated as blocked unless a separate explicit CEO approval is provided in the active Codex chat and all normal safety gates are satisfied.

## Dispatcher Mapping

The temporary bridge maps safe OP commands to existing local dispatcher commands:

| Slack command                            | Local command                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| `OP: status`                             | `node scripts/openclaw-local-dispatcher.mjs status`                                    |
| `OP: next`                               | `node scripts/openclaw-local-dispatcher.mjs next`                                      |
| `OP: audit`                              | `node scripts/openclaw-local-dispatcher.mjs audit`                                     |
| `OP: handoff TASK-SPECTIX-001 pm`        | `node scripts/openclaw-local-dispatcher.mjs handoff TASK-SPECTIX-001 --role pm`        |
| `OP: handoff TASK-SPECTIX-001 architect` | `node scripts/openclaw-local-dispatcher.mjs handoff TASK-SPECTIX-001 --role architect` |
| `OP: handoff TASK-SPECTIX-001 qa`        | `node scripts/openclaw-local-dispatcher.mjs handoff TASK-SPECTIX-001 --role qa`        |
| `OP: report open-prs`                    | `gh pr list --state open`                                                              |

The dispatcher handoff command may be used only if it is supported locally. If a requested handoff command is unsupported, Codex must report the limitation and may generate an explicit local prompt manually. Codex must not pretend that dispatcher execution succeeded.

## CEO Gates

CEO gates remain explicit:

- Codex may not implement unless a task status is `ceo_dev_approved` or the CEO gives explicit implementation approval in the active Codex chat.
- Codex may not merge unless the CEO gives final approval and the PR number, head SHA, base branch, and head branch are verified immediately before merge.
- Codex may not mutate Supabase or run smoke without explicit CEO approval.
- Codex may not create claims or upload documents without explicit CEO approval.
- Codex may not touch secrets, `.env.local`, deploy settings, billing, auth settings, production data, or production Supabase through this bridge.
- A Slack message alone is not enough for risky work unless it includes explicit CEO approval and the current Codex task context confirms the required safety gates.

## Operating Mode

The temporary OP bridge is manual and interactive only:

- No cron.
- No 24/7 process.
- No auto-polling.
- No autonomous execution loop.
- No native OpenClaw gateway.
- No public webhook.
- No auto-merge.
- No auto-deploy.

Codex acts as the human-supervised bridge between Slack control messages and local safe dispatcher reads.

## Audit Requirements

Every bridge action must report:

- Raw command output for dispatcher commands.
- Whether forbidden automation flags changed.
- Whether the repository stayed clean.
- Whether Supabase was touched.
- Whether smoke, claim creation, or document upload occurred.
- Whether secrets were printed.

The minimum safety check after any bridge action is:

```bash
git status --short
node scripts/openclaw-local-dispatcher.mjs audit
```

## Initial Bridge Smoke Result

The initial bridge smoke used only safe commands.

Slack connector:

- Connector available: yes.
- Workspace visible: yes, `spectix`.
- Channel visible: yes, `new-channel` / `C0B19UJLUJF`.
- Read access: yes.
- Post access: yes.
- Test message posted: yes.

Safe test message:

```text
Spectix OP connector test: Codex Slack connector is available. No automation enabled.
```

Dispatcher commands executed:

```bash
node scripts/openclaw-local-dispatcher.mjs status
node scripts/openclaw-local-dispatcher.mjs next
node scripts/openclaw-local-dispatcher.mjs audit
```

Result:

- Dispatcher healthy: yes.
- `TASK-SPECTIX-001` visible: yes.
- `cronEnabled`: false.
- `autoMerge`: false.
- `autoDeploy`: false.
- `channelsEnabled`: false.
- Supabase touched: no.
- Smoke/claims/uploads touched: no.
- Native OpenClaw Slack Socket Mode used: no.

## Current Status

Temporary OP bridge is usable for manual, safe dispatcher status/next/audit/handoff/report-open-PR workflows.

It does not enable native OpenClaw Slack routing, autonomous Slack command execution, cron, 24/7 operation, auto-merge, auto-deploy, Supabase mutation, smoke execution, claim creation, or document upload.

## Next CEO Decision

Choose one:

1. Use the temporary OP bridge to route the next planning step for `SPRINT-001` to Architect/PM.
2. Continue native OpenClaw Slack Socket Mode repair later using PR #47 as the blocker record.
3. Close or merge stale docs/setup PRs only after explicit CEO approval and verified PR/head SHA.
