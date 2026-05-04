# OpenClaw Slack Activation Report

## Purpose

This report records the TASK-065 Slack control-plane preparation for Spectix
OpenClaw routing. It does not enable real routing, cron, 24/7 operation,
auto-merge, auto-deploy, smoke execution, claim creation, or document upload.

## Repository State

- PR #40: merged
- Main HEAD after PR #40: `429cf38654f29d0af3721571032f44bd626710ce`
- PR #40 scope: docs and local config templates only
- Real Slack credentials in repo: no
- App runtime code changed: no
- Secrets, env, deploy settings touched: no
- Production data mutated: no

## Slack Target

- Slack team/workspace ID: `T0B1V6YN0F3`
- Slack control channel ID: `C0B19UJLUJF`
- Channel name in local OpenClaw skeleton: `slack-spectix-control`

## OpenClaw Support Findings

- OpenClaw version: `2026.5.2`
- Slack support: yes
- Slack transport: Socket Mode
- Slack capabilities observed:
  - direct messages
  - channel messages
  - threads
  - reactions
  - media
  - native commands
- Required config fields observed:
  - `mode`
  - `webhookPath`
  - `userTokenReadOnly`
  - `groupPolicy`
- Credential names required for Socket Mode:
  - `SLACK_BOT_TOKEN`
  - `SLACK_APP_TOKEN`
- Optional credential depending on Slack event/API mode:
  - `SLACK_SIGNING_SECRET`

## Local Config Status

- Local config path: `C:\Users\smart\.openclaw\openclaw.json`
- Local OpenClaw config changed: yes
- Slack config added locally: yes
- Slack channel enabled: no
- Gateway bind: loopback
- Cron enabled: no
- Auto-merge enabled: no
- Auto-deploy enabled: no
- Token values written to config: no
- Token values printed: no

The local config now contains env-var references only:

- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`
- `SLACK_SIGNING_SECRET`

The Slack channel skeleton is intentionally disabled until credentials are
provided and validated.

## Credential Check

- `SLACK_BOT_TOKEN`: missing
- `SLACK_APP_TOKEN`: missing
- `SLACK_SIGNING_SECRET`: missing

No token values were printed, written to repo, or committed.

## Agent State

Configured local agents:

- `main`
- `ceo`
- `pm`
- `qa`
- `codex`
- `architect`
- `codex_ops`

Binding attempt result:

- `ceo` was bound to `slack`
- Directly binding `architect`, `pm`, `qa`, and `codex_ops` to the same
  `slack` binding was blocked by OpenClaw with a binding conflict against
  `ceo`

This means the first safe Slack activation should treat Slack as a single
control-plane entry point and route role-specific work through explicit
commands, local dispatcher handoffs, or a later OpenClaw-supported routing
model. Direct multi-agent binding to one Slack channel is not yet proven.

## Validation Result

- `openclaw config validate`: passed
- Gateway started: no
- Slack dummy commands tested: no

Gateway and Slack dummy testing were intentionally skipped because Slack
credentials are not yet present.

## Planned Allowed Initial Commands

When credentials are present and the Slack skeleton is explicitly enabled, the
first dummy validation should be limited to:

- `/oc status`
- `/oc next`
- `/oc audit`
- `/oc handoff TASK-SPECTIX-001 --role pm`
- `/oc handoff TASK-SPECTIX-001 --role qa`
- `/oc handoff TASK-SPECTIX-001 --role architect`
- `/oc handoff TASK-SPECTIX-001 --role codex`

## Forbidden Commands

Slack control-plane activation must not allow:

- merge
- deploy
- production mutation
- DB migration
- secrets or env changes
- claim creation
- document upload
- smoke execution
- cron
- 24/7 automation
- auto-merge
- auto-deploy

## Manual Steps Required

1. Open or create the Slack app for workspace `T0B1V6YN0F3`.
2. Enable Socket Mode.
3. Create the Slack app-level token and store it locally as
   `SLACK_APP_TOKEN`.
4. Create or retrieve the Slack bot token and store it locally as
   `SLACK_BOT_TOKEN`.
5. Add the OpenClaw-required bot scopes from the setup guide.
6. Install the Slack app to workspace `T0B1V6YN0F3`.
7. Invite the bot to private channel `C0B19UJLUJF`.
8. Record allowed Slack user IDs locally.
9. Put credentials in local OpenClaw config or local environment only.
10. Enable the local Slack skeleton only after credentials are present.
11. Run `openclaw config validate`.
12. Start the gateway in foreground, loopback-only mode for validation.
13. Test `/oc status`, `/oc next`, and one handoff command.
14. Stop the gateway after validation.

## Next Decision Needed

CEO needs to provide or confirm local Slack credentials and allowed Slack user
IDs, then approve a loopback-only Slack dummy validation run. Cron, 24/7,
public webhooks, production commands, merge, deploy, claim creation, document
upload, and smoke execution remain closed.
