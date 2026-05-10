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

Second repair attempt:

- CEO approved unblocking the local browser/runtime chain.
- Node.js was upgraded with `winget` from `v22.18.0` to `v22.22.2`.
- After the upgrade, `node_repl` started successfully.
- The Codex in-app browser runtime initialized and created an `about:blank` tab.
- External navigation through the in-app browser still failed with `failed to start codex app-server: The system cannot find the path specified. (os error 3)`.
- Localhost navigation still worked, which indicates the remaining browser blocker is Codex external-navigation/app-server handling, not the Node version.
- A non-invasive attempt to open existing Chrome with `--remote-debugging-port=9222` did not expose a remote debugging endpoint.
- Existing Chrome windows were not closed or restarted.
- No Slack dashboard settings were changed.

Durable blocker chain after the second repair attempt:

1. Slack Event Subscriptions still appear not to deliver Events API payloads to Socket Mode.
2. The available Slack tokens cannot repair manifest/event subscriptions through Slack Web API.
3. Codex in-app browser external navigation is blocked by Codex app-server startup failure after Node was fixed.
4. Existing Chrome cannot be automated through remote debugging without restarting or relaunching the browser profile with debugging enabled.

Third repair attempt:

- CEO approved closing and restarting Chrome with remote debugging enabled.
- Chrome was restarted with `--remote-debugging-port=9222` against the existing Chrome user data directory.
- The remote debugging endpoint at `http://127.0.0.1:9222/json/version` was reachable.
- Chrome reported version `147.0.7727.138`.
- Browser automation successfully attached to the remote-debugged Chrome instance.
- All local Chrome profile directories were checked without reading cookies or printing secrets:
  - `Default`
  - `Profile 1`
  - `Profile 2`
  - `Profile 3`
  - `Profile 4`
  - `Profile 5`
  - `Profile 6`
  - `Profile 7`
- Every profile reached `https://api.slack.com/apps` but showed Slack API dashboard signed-out state.
- No existing Chrome profile exposed a signed-in Slack API app dashboard session for the `spectix` workspace.
- Because the Slack API dashboard was not authenticated in any available profile, no Slack App dashboard settings were changed.
- Gateway validation was not rerun because the required Slack App dashboard repair could not be performed.

Updated durable blocker:

The local browser/runtime chain is now working enough to attach to remote-debugged Chrome, but no available Chrome profile is signed in to the Slack API app dashboard. The remaining blocker is authenticated Slack App dashboard access, or a Slack configuration token with manifest-management permissions.

Fourth repair attempt:

- CEO reported that the human owner had manually signed in to `https://api.slack.com/apps` in an already-open Chrome profile for workspace `spectix`.
- The already-open Chrome window was visible on `Slack API: Applications | Slack`.
- The existing Chrome session did not expose a remote debugging endpoint at `http://127.0.0.1:9222/json/version`.
- The visible Chrome process used the normal Chrome executable and default user data directory, with no alternate `--profile-directory` command-line flag.
- Because remote debugging was required to attach automation, Chrome was relaunched with `--remote-debugging-port=9222` against the same default Chrome user data directory and `--profile-directory=Default`.
- The remote debugging endpoint became reachable and reported Chrome `147.0.7727.138`.
- Browser automation attached successfully to the relaunched default Chrome profile.
- `https://api.slack.com/apps` still showed Slack API dashboard signed-out state:
  - `Your Apps`
  - `You'll need to sign in to your Slack account to create an application.`
  - `Don't see an app you're looking for? Sign in to another workspace.`
- No existing Slack App dashboard was accessible.
- No Slack App dashboard settings were changed.
- Gateway validation was not rerun because the dashboard repair could not be performed.

Updated durable blocker after fourth attempt:

The attachable Chrome profile is still not authenticated to the Slack API app dashboard. To continue, the human owner must sign in to `https://api.slack.com/apps` in the Chrome profile that is running with remote debugging enabled, or provide a Slack configuration token with manifest-management permissions.

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

Approve manual Slack App dashboard repair for the existing Spectix Slack app after first signing in to the Slack API dashboard in the active remote-debugged Chrome profile:

1. Sign in to `https://api.slack.com/apps` in the Chrome profile currently running with remote debugging enabled.
2. Open the Slack App dashboard for the existing OpenClaw Spectix Control app.
3. Confirm Socket Mode is enabled.
4. Confirm the app-level token remains valid.
5. Add or confirm the required bot scopes listed above.
6. Enable Event Subscriptions.
7. Add the required bot events listed above.
8. Confirm native slash command `/openclaw` exists if slash command routing is desired.
9. Reinstall the app to workspace `spectix`.
10. Re-invite the bot to channel `C0B19UJLUJF` if Slack requests it.
11. Rerun loopback-only dummy routing.

Alternative if dashboard access is not available:

Provide a Slack app configuration token that can read/update the existing app manifest, or update the Slack App manually from the dashboard and then rerun the loopback validation.

Alternative if browser automation is required:

Sign in to the Slack API app dashboard in one Chrome profile for the existing `spectix` workspace, then approve rerunning the same remote-debugging dashboard repair and loopback validation.

OP dummy routing should not be marked passed until Slack input from the allowed human user reaches OpenClaw, OpenClaw responds in Slack, and at least one safe dispatcher command works.
