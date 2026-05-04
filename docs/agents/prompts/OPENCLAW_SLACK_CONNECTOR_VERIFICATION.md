# OpenClaw Slack Connector Verification

## Purpose

This report records TASK-068: verification of whether the ChatGPT Slack
connector access to the Spectix Slack workspace/channel can be reused directly
by OpenClaw.

This task did not start the OpenClaw gateway, enable real routing, enable
cron/24/7 operation, enable auto-merge/deploy, run smoke tests, create claims,
upload documents, mutate production data, or touch app runtime code.

## Verified Slack Connector Access

- ChatGPT Slack connector verified: yes
- Workspace: `spectix`
- Connected user/profile: `spectix.ai / spectix.ai@gmail.com`
- Channel ID: `C0B19UJLUJF`
- Channel name: `new-channel`
- Write access through ChatGPT Slack connector: yes
- Slack action performed: safe draft created in the channel, not sent

This proves ChatGPT connector access to Slack. It does not prove OpenClaw bot
access to Slack.

## OpenClaw Slack Provider

- OpenClaw Slack provider supported: yes
- Provider label: Slack Socket Mode
- Supported chat types:
  - direct
  - channel
  - thread
- Supported features:
  - reactions
  - media
  - native commands
- Required OpenClaw config fields:
  - `mode`
  - `webhookPath`
  - `userTokenReadOnly`
  - `groupPolicy`
- Required credential names:
  - `SLACK_BOT_TOKEN`
  - `SLACK_APP_TOKEN`
- Optional credential depending on final Slack mode:
  - `SLACK_SIGNING_SECRET`

## Local OpenClaw Config Status

- Local config path: `C:\Users\smart\.openclaw\openclaw.json`
- OpenClaw config validation: passed
- Slack configured in local OpenClaw config: yes
- Slack enabled: no
- Slack mode: Socket Mode
- Control channel ID configured: yes, `C0B19UJLUJF`
- Gateway bind: loopback
- Cron enabled: no
- Local OpenClaw config changed in this task: no

The local config contains env-var references for Slack credentials, but no
actual token values.

## Credential Status

Environment variables:

- `SLACK_BOT_TOKEN`: missing
- `SLACK_APP_TOKEN`: missing
- `SLACK_SIGNING_SECRET`: missing
- `SLACK_CONTROL_CHANNEL_ID`: missing
- `ALLOWED_SLACK_USER_IDS`: missing

Local OpenClaw config:

- Actual bot token value stored: no
- Actual app token value stored: no
- Actual signing secret value stored: no
- Bot token env-var reference configured: yes
- App token env-var reference configured: yes
- Signing secret env-var reference configured: yes
- Allowed Slack user IDs configured: no

No Slack token values were printed, committed, copied into docs, or copied into
`.env.local`.

## Agent And Binding Status

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

Known limitation:

- Directly binding all role agents to the same Slack channel conflicted in the
  previous activation check. The first safe OpenClaw Slack activation should
  therefore use a single Slack control-plane entry point and route role-specific
  work through explicit dispatcher commands unless OpenClaw supports a cleaner
  multi-agent Slack routing model after credentials are installed.

## Connector Reuse Decision

- Can OpenClaw use the ChatGPT Slack connector directly: no evidence available;
  treat as no for implementation.
- Does OpenClaw require its own Slack bot/app tokens: yes.
- Is the existing Slack AI App enough: unknown.

Reason:

- OpenClaw's Slack provider is implemented as a Slack Socket Mode channel.
- OpenClaw's setup wizard explicitly requires a Slack bot token and Slack
  app-level token.
- The ChatGPT Slack connector grants ChatGPT access to Slack, but it does not
  expose those Slack app credentials to the local OpenClaw process.
- If the installed Slack AI App exposes a bot token and app-level Socket Mode
  token to the operator, those may be usable by OpenClaw. If it does not, a
  dedicated OpenClaw Slack app is still required.

## Gateway Validation

- Gateway started: no
- Slack dummy commands tested: no

Reason:

- Required Slack credentials are missing locally.
- Starting a loopback gateway without Slack credentials would not validate
  OpenClaw Slack routing.

## Manual Steps Required

1. Create or open the Slack App intended for OpenClaw.
2. Enable Socket Mode.
3. Create an app-level token with the required Socket Mode capability.
4. Create or retrieve the bot token.
5. Invite the Slack bot to channel `C0B19UJLUJF`.
6. Record allowed Slack user IDs.
7. Place token values in `C:\Users\smart\.openclaw\openclaw.json` or local
   environment only.
8. Do not commit tokens.
9. Re-run `openclaw config validate`.
10. With CEO approval, run a foreground loopback-only gateway validation.
11. Test only:
    - `/oc status`
    - `/oc next`
    - `/oc handoff TASK-SPECTIX-001 --role pm`

## Safety Confirmations

- App runtime code changed: no
- DB schema changed: no
- Production data mutated: no
- `.env.local` touched: no
- Secrets printed: no
- Secrets committed: no
- Gateway started: no
- Cron/24/7 enabled: no
- Auto-merge/deploy enabled: no
- Smoke executed: no
- Claim created: no
- Documents uploaded: no
