# OpenClaw Slack Routing Blocker Report

## Summary

OP/OpenClaw Slack dummy routing did not pass. OpenClaw can validate its local config, start loopback-only, connect to Slack Socket Mode, resolve the configured Slack channel and allowed user, and authenticate the Slack bot token. However, Slack inbound events do not reach OpenClaw for the tested channel messages.

Durable blocker:

Slack App Event Subscriptions or app installation state is not delivering `app_mention`, `message.channels`, or slash command payloads to the app over Socket Mode.

## Scope

- Workspace: `spectix`
- Control channel: `new-channel`
- Control channel ID: `C0B19UJLUJF`
- Allowed operator user ID: `U0B1KTN2QE8`
- OpenClaw bot user ID: `U0B1M29MNSG`
- Gateway bind: loopback only
- Cron: disabled
- Auto-merge: disabled
- Auto-deploy: disabled

No Slack token values are recorded in this document.

## Evidence

Baseline checks:

- Local `main` was clean and up to date.
- Dispatcher status and audit passed.
- `TASK-SPECTIX-001` was visible locally with status `pm_spec_ready`.
- `openclaw config validate` passed.
- Gateway was stopped before validation.

Gateway validation:

- Gateway started on `127.0.0.1:18789`.
- `openclaw channels status --deep --json` showed Slack configured, running, connected, and healthy.
- Slack bot token and app token were available to the runtime from local secret files.
- Bot authentication resolved to workspace `spectix`.
- Bot membership in channel `C0B19UJLUJF` was confirmed.

Slack command tests:

- `<@U0B1M29MNSG> status`
- `/openclaw status`
- `/oc status`

Slack channel history showed these messages present in `C0B19UJLUJF` from allowed user `U0B1KTN2QE8`, but OpenClaw channel status continued to report `lastInboundAt: null`.

Raw Socket Mode probe:

- A local Socket Mode listener using the same Slack app token connected successfully.
- After sending `<@U0B1M29MNSG> next`, the raw listener received no `app_mention`, `message`, or slash command event.

This isolates the failure before OpenClaw command parsing. The event is not being delivered to Socket Mode.

Follow-up repair attempt:

- The in-app browser automation path was unavailable because the local `node_repl` runtime resolved `C:\Program Files\nodejs\node.exe` at version `22.18.0`, while `node_repl` requires `>=22.22.0`.
- Persistent system environment changes were not made because the activation task only allowed current shell/session environment variables.
- Slack API verification confirmed the bot token is valid for workspace `spectix`, bot user `U0B1M29MNSG`, and channel `C0B19UJLUJF`.
- Slack API verification confirmed the bot is a member of `new-channel`.
- Slack API response headers showed the bot token has relevant scopes including `app_mentions:read`, `chat:write`, `commands`, `channels:history`, `channels:read`, `groups:history`, `groups:read`, `im:history`, `im:read`, `mpim:history`, `mpim:read`, and `users:read`.
- The available bot token and app token cannot repair Slack App Event Subscriptions through Slack Web API. Manifest export/update calls returned `not_allowed_token_type`; event authorization inspection with the app token returned `missing_scope`.

This means the remaining repair path is manual Slack App dashboard configuration or a Slack configuration token with manifest-management permissions. No such configuration token was available locally.

## Required Slack App Configuration

The OpenClaw Slack manifest in the installed package expects Socket Mode plus these relevant bot scopes and events.

Required or relevant bot scopes:

- `app_mentions:read`
- `chat:write`
- `commands`
- `channels:history`
- `channels:read`
- `groups:history`
- `groups:read`
- `im:history`
- `im:read`
- `mpim:history`
- `mpim:read`
- `users:read`

Required or relevant bot event subscriptions:

- `app_mention`
- `message.channels`
- `message.groups`
- `message.im`
- `message.mpim`

OpenClaw's generated manifest also defines the native slash command `/openclaw`. The previously tested `/oc` command is not the installed manifest default.

## Safety Confirmations

- Gateway was stopped after validation.
- Port `18789` was no longer listening after validation.
- Repository remained clean before the docs-only report.
- Dispatcher audit passed after validation.
- No Supabase project was touched.
- No smoke test was run.
- No claims were created.
- No documents were uploaded.
- No app runtime code was changed.
- No DB schema was changed.
- No secrets were printed or committed.
- Cron and 24/7 remained disabled.
- Auto-merge and auto-deploy remained disabled.

## Next CEO Decision

Approve manual Slack App dashboard repair for the existing Spectix Slack app:

1. Open the Slack App dashboard for the existing OpenClaw Spectix Control app.
2. Confirm Socket Mode is enabled.
3. Confirm the app-level token remains valid.
4. Add or confirm the required bot scopes listed above.
5. Enable Event Subscriptions.
6. Add the required bot events listed above.
7. Confirm native slash command `/openclaw` exists if slash command routing is desired.
8. Reinstall the app to workspace `spectix`.
9. Re-invite the bot to channel `C0B19UJLUJF` if Slack requests it.
10. Rerun loopback-only dummy routing.

Alternative if dashboard access is not available:

Provide a Slack app configuration token that can read/update the existing app manifest, or update the Slack App manually from the dashboard and then rerun the loopback validation.

OP dummy routing should not be marked passed until Slack input from the allowed human user reaches OpenClaw, OpenClaw responds in Slack, and at least one safe dispatcher command works.
