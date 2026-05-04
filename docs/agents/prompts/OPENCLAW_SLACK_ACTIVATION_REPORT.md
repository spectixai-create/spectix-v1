# OpenClaw Slack Activation Check

## Purpose

This report records TASK-066: verification of whether the installed Slack app
can be used as the OpenClaw Slack control plane for Spectix agents.

This check did not enable real routing, cron, 24/7 operation, auto-merge,
auto-deploy, smoke execution, claim creation, document upload, public webhooks,
or production access.

## Slack Target

- Slack team/workspace ID: `T0B1V6YN0F3`
- Slack control channel ID: `C0B19UJLUJF`
- Slack URL: `https://app.slack.com/client/T0B1V6YN0F3/C0B19UJLUJF`
- Intended OpenClaw channel name: `slack-spectix-control`

## OpenClaw Slack Provider

- Slack provider supported: yes
- Transport supported: Socket Mode
- Supported chat types:
  - direct
  - channel
  - thread
- Supported features:
  - reactions
  - media
  - native commands
- Required Slack config fields observed:
  - `mode`
  - `webhookPath`
  - `userTokenReadOnly`
  - `groupPolicy`
- Required credential names:
  - `SLACK_BOT_TOKEN`
  - `SLACK_APP_TOKEN`
- Optional credential depending on mode/setup:
  - `SLACK_SIGNING_SECRET`

## Current OpenClaw Local State

- Local config path: `C:\Users\smart\.openclaw\openclaw.json`
- `openclaw config validate`: passed
- Existing Slack channel configured in OpenClaw: yes
- Slack channel enabled: no
- Slack channel ID configured locally: yes, `C0B19UJLUJF`
- Gateway bind: loopback
- Cron enabled: no
- Auto-merge enabled: no
- Auto-deploy enabled: no

Configured agents:

- `main`
- `ceo`
- `pm`
- `qa`
- `codex`
- `architect`
- `codex_ops`

Existing binding:

- `ceo` is bound to `slack`

Known binding limitation:

- A prior direct attempt to bind `architect`, `pm`, `qa`, and `codex_ops` to
  the same `slack` binding was blocked by OpenClaw as a conflict with `ceo`.
- The safe first activation model remains a single Slack control-plane entry
  point that routes role-specific work through explicit dispatcher commands or
  a later OpenClaw-supported routing design.

## Credential Availability

Environment variables:

- `SLACK_BOT_TOKEN`: missing
- `SLACK_APP_TOKEN`: missing
- `SLACK_SIGNING_SECRET`: missing
- `SLACK_CONTROL_CHANNEL_ID`: missing
- `ALLOWED_SLACK_USER_IDS`: missing

Local OpenClaw config:

- Bot token actual value stored: no
- App token actual value stored: no
- Signing secret actual value stored: no
- Env-var references configured: yes

No Slack token values were printed, committed, or copied into repo files.

## Installed Slack AI App Assessment

- Installed Slack AI App usable by OpenClaw: unknown as installed; not usable
  by the current local OpenClaw configuration.
- Reason:
  - OpenClaw requires a Slack bot token and Slack app-level Socket Mode token.
  - The local environment does not contain those credentials.
  - The local OpenClaw config contains env-var references only, not actual
    credential values.
  - A Slack app being installed in the workspace is not sufficient by itself
    unless its `xoxb` bot token and `xapp` app token are available to OpenClaw
    locally.

Practical conclusion:

- If the installed Slack AI App exposes the needed bot/app tokens to the
  operator, those tokens can be used locally with OpenClaw.
- If it does not expose those tokens, OpenClaw needs a separate Slack app
  created from the OpenClaw Slack setup instructions.

## Gateway And Slack Dummy Validation

- Gateway started: no
- Gateway mode requested: loopback-only when approved
- Slack dummy commands tested: no

Reason not tested:

- Required Slack credentials are missing locally.
- Starting the gateway without valid Slack credentials would not validate the
  installed Slack app or Slack channel behavior.

## Allowed First Dummy Commands

When credentials are present and CEO approves loopback-only validation, test
only:

- `/oc status`
- `/oc next`
- `/oc audit`
- `/oc handoff TASK-SPECTIX-001 --role pm`
- `/oc handoff TASK-SPECTIX-001 --role qa`
- `/oc handoff TASK-SPECTIX-001 --role architect`
- `/oc handoff TASK-SPECTIX-001 --role codex`

## Forbidden Commands

The Slack control plane must not allow:

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

## Blockers

OpenClaw Slack activation is blocked by missing local credential values:

- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`
- allowed Slack user IDs

`SLACK_SIGNING_SECRET` is also missing. It may be required depending on final
Slack event mode, but Socket Mode primarily requires the bot token and app
token.

## Next Manual Action

CEO/operator must choose one:

1. Retrieve the installed Slack app's `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN`
   and provide them only to the local OpenClaw environment/config.
2. If the installed Slack AI App does not expose these tokens, create a
   dedicated OpenClaw Slack app using the existing setup guide, install it to
   workspace `T0B1V6YN0F3`, invite it to channel `C0B19UJLUJF`, and store
   tokens locally only.

After credentials and allowed Slack user IDs are present, CEO can approve a
foreground, loopback-only gateway validation run for `/oc status`, `/oc next`,
and one handoff command.

## Safety Confirmations

- App runtime code changed: no
- DB schema changed: no
- Production data mutated: no
- Smoke executed: no
- Claims created: no
- Documents uploaded: no
- `.env.local` touched: no
- Secrets printed: no
- Secrets committed: no
- OpenClaw cron/24/7 enabled: no
- Auto-merge/deploy enabled: no
- Public webhook exposed: no
