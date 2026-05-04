# OpenClaw Real Agent Routing Plan

## Purpose

This plan moves Spectix OpenClaw planning away from manual ChatGPT chats as the
target operating model. It records what the installed OpenClaw runtime supports
and proposes the safest practical channel path for real CEO / Architect / PM /
QA / Codex-style routing.

This document does not activate channels, start 24/7 mode, expose a public
webhook, run smoke, mutate data, merge, deploy, or store credentials.

## Current Limitation

OpenClaw does not open ChatGPT UI chats directly.

The supported mechanism is OpenClaw-native agent execution through the Gateway,
channel integrations, bindings, sessions, and provider-backed agent runs. The
CLI exposes:

```powershell
openclaw agent --agent <id> --message "<text>"
openclaw agent --agent <id> --message "<text>" --local --json
openclaw agent --agent <id> --message "<text>" --deliver --reply-channel slack --reply-to "#channel"
```

Those commands route to OpenClaw agents. They are not browser automation against
ChatGPT.

## Investigation Evidence

Installed runtime:

```text
OpenClaw 2026.5.2 (8b2a6e5)
```

Gateway support:

- `openclaw gateway run` supports `--bind loopback`, `--auth`, `--port`, and
  `--ws-log`.
- Current config reports `gateway.mode = local`, `gateway.bind = loopback`,
  `gateway.port = 18789`.
- `openclaw gateway status` reports the service is not installed and runtime is
  stopped, which is expected for non-24/7 local operation.

Agent support:

- `openclaw agents list --json` reports these configured agents:
  `main`, `ceo`, `pm`, `qa`, `codex`, `architect`.
- All agents point at `C:\Users\smart\spectix`.
- Current bindings: `0` for every agent.
- `openclaw agents bind --agent <id> --bind <channel[:accountId]>` is
  supported.

Channel state:

- `openclaw config get channels` returns `{}`.
- `openclaw config get cron` returns `enabled = false`.
- `openclaw config validate` passes.

Unsupported channel evidence:

```powershell
openclaw channels capabilities --channel github --json
```

Result:

```text
Unknown channel "github".
```

```powershell
openclaw channels capabilities --channel hooks --json
openclaw channels capabilities --channel local --json
```

Result:

```text
Unknown channel "hooks".
Unknown channel "local".
```

Discord evidence:

```powershell
openclaw channels capabilities --channel discord --json
```

The installed CLI prompted to install the Discord plugin from npm. It is not
currently usable without explicit plugin installation approval.

## Supported Channels Found

| Path             | Current support in this install        | Relevant capabilities                                             | Credentials needed                                        | Notes                                                                 |
| ---------------- | -------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| Slack            | Supported, plugin present              | direct, channel, thread, reactions, media, native commands        | Slack bot token, Slack app token, optional signing secret | Best fit. Socket Mode can avoid public webhooks.                      |
| Telegram         | Supported, plugin present              | direct, group, channel, thread, reactions, media, polls, commands | Telegram bot token, allowlisted user/chat IDs             | Simpler setup, weaker enterprise audit/control-plane fit than Slack.  |
| Discord          | Not installed                          | CLI lists Discord as possible, but plugin install prompt appeared | Discord bot token and plugin installation                 | Blocked until CEO approves plugin install and server setup.           |
| Hooks            | CLI group exists, not a channel        | internal hook management only                                     | none identified for routing channel                       | `hooks` is not accepted by `channels capabilities` or agent bindings. |
| Local filesystem | Not an OpenClaw channel provider       | current repo dispatcher works outside OpenClaw channel bindings   | none                                                      | Useful bridge, but not native OpenClaw routing.                       |
| Local agent CLI  | Supported via `openclaw agent`         | direct agent runs via Gateway or `--local` embedded mode          | model provider keys in shell/local config                 | Good fallback for dispatcher-to-agent bridge.                         |
| GitHub comments  | Not supported                          | none in this install                                              | none                                                      | Previously tested; `github` is unknown as a channel.                  |
| Local webhooks   | No generic local JSON webhook observed | `webhooks` group only shows Gmail Pub/Sub helpers                 | n/a                                                       | Not suitable as the first routing path.                               |

## Recommended Path

Recommended path: **Slack private channel control plane using Socket Mode**.

Reasons:

- Slack is supported in the installed OpenClaw runtime.
- Slack supports channels and threads, which map cleanly to task/control
  threads.
- Socket Mode avoids exposing a public webhook.
- A private workspace/channel can be restricted to approved operators.
- OpenClaw can bind agents to the Slack channel/account.
- Gateway can remain loopback-only.
- Cron and 24/7 can remain disabled during dummy validation.

Fallback path if Slack credentials are not available:

1. Use Telegram bot with strict allowlist for a single human operator.
2. Use local dispatcher bridge to call `openclaw agent --agent <id> --local`
   for one-shot agent turns.
3. Keep manual Codex Desktop as implementation fallback until an OpenClaw-native
   implementer is configured and validated.

## Exact Setup Steps

Do not run these until CEO approves Slack setup and provides credentials outside
git.

### 1. Local Config Path

Use only local OpenClaw config:

```text
C:\Users\smart\.openclaw\openclaw.json
```

Do not commit this file.

### 2. Channel Config Needed

Create a Slack app with Socket Mode enabled.

Required local credential names:

- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`
- optional `SLACK_SIGNING_SECRET`

Use environment-backed or local secret-backed references only. Do not paste real
tokens into repo files.

### 3. Agents List Config

Keep existing agents:

- `ceo`
- `architect`
- `pm`
- `qa`
- `codex`

Each should keep workspace:

```text
C:\Users\smart\spectix
```

### 4. Bindings Config

After Slack channel config exists and validates, bind agents to the Slack
control channel/account:

```powershell
openclaw agents bind --agent ceo --bind slack:default --json
openclaw agents bind --agent architect --bind slack:default --json
openclaw agents bind --agent pm --bind slack:default --json
openclaw agents bind --agent qa --bind slack:default --json
openclaw agents bind --agent codex --bind slack:default --json
openclaw agents bindings --json
```

Use channel/thread allowlists in local config so only the approved private
control plane can route work.

### 5. Gateway Command

Foreground smoke only:

```powershell
openclaw gateway run --bind loopback --auth none --ws-log compact
```

Token auth can be introduced after dummy routing:

```powershell
openclaw gateway run --bind loopback --auth token --token <local-only-token> --ws-log compact
```

Do not use `--bind lan`, `--bind custom`, Tailscale Funnel, or public webhook
exposure for the first route.

### 6. Test Command

Before enabling channel delivery, test a single local agent turn:

```powershell
openclaw agent --agent pm --message "Read TASK-060 dummy context and reply with status only. Do not edit files." --local --json
```

After Slack is configured and bound, test channel delivery only with a dummy
control message:

```powershell
openclaw agent --agent pm --message "DUMMY-OPENCLAW-001 status check only. Do not edit files." --deliver --reply-channel slack --reply-to "#spectix-openclaw-control" --json
```

### 7. Dummy Task Flow

Use only a dummy route until Slack routing passes:

1. CEO posts `/oc status` in the private Slack control channel.
2. PM agent replies with read-only task status.
3. CEO posts `/oc dry-run DUMMY-OPENCLAW-001`.
4. PM produces dummy spec.
5. CEO approves dummy docs-only execution.
6. Codex implementer receives only the dummy docs task.
7. QA reviews dummy output.
8. CEO final approves the dummy result.

No merge, deploy, production data, DB schema, app code, secrets, or smoke
execution is allowed in dummy routing.

## Security Gates

- Gateway loopback only.
- Slack Socket Mode only; no public webhook for first activation.
- No cron or 24/7 until dummy routing passes and CEO explicitly approves.
- No auto-merge.
- No auto-deploy.
- No production commands.
- No production Supabase credentials in OpenClaw.
- Credentials must remain outside git.
- Codex/implementer agent must default to dry-run/docs-only until separate CEO
  approval.
- Slack channel membership must be restricted to approved operators.
- Agent bindings must be reviewed with `openclaw agents bindings --json`.

## Agent Model

| Agent             | Intended role                          | OpenClaw-native now? | Notes                                                                 |
| ----------------- | -------------------------------------- | -------------------- | --------------------------------------------------------------------- |
| `ceo`             | approvals, final decisions, gates      | yes                  | Existing local OpenClaw agent; not the human CEO.                     |
| `architect`       | architecture/risk review               | yes                  | Existing local OpenClaw agent.                                        |
| `pm`              | requirements, acceptance, scope review | yes                  | Existing local OpenClaw agent.                                        |
| `qa`              | validation and regression review       | yes                  | Existing local OpenClaw agent.                                        |
| `codex`           | Codex-style implementation routing     | partially            | Existing OpenClaw agent can receive tasks, but must remain gated.     |
| Codex Desktop app | implementation fallback                | external/manual      | Still needed until OpenClaw-native implementer behavior is validated. |

## Local Dispatcher Bridge

The current local dispatcher cannot use `local` or `hooks` as OpenClaw channel
bindings because those are not channel providers in this install.

The practical bridge is command-driven:

```powershell
node scripts/openclaw-local-dispatcher.mjs next
openclaw agent --agent pm --message "<prompt from .openclaw-local/outbox/...>" --local --json
```

This can replace manual ChatGPT chats for PM/QA/Architect-style turns if model
provider credentials are available locally. It does not yet provide a durable
OpenClaw TaskFlow import path.

## OpenAI API / Codex Alternative

If OpenClaw cannot control ChatGPT UI, the non-UI alternative is API-backed
agents. OpenClaw already exposes provider-backed agent turns and `--local`
embedded mode. A separate custom API-based orchestrator would be out of scope
for this repo unless CEO approves a new operations-tooling implementation task.

For now:

- Prefer OpenClaw-native Slack routing.
- Use `openclaw agent --local --json` as a local bridge if Slack is blocked.
- Keep Codex Desktop as manual fallback for implementation until the
  OpenClaw-native `codex` agent proves it can obey repository gates.

## What Remains Manual

- CEO approval decisions.
- Merge approval with exact PR/head SHA.
- Production smoke/data mutation approval.
- Secret provisioning.
- Slack app creation and token rotation.
- Deployment approval.
- First activation of cron/24/7, if ever approved.

## CEO Decision Needed

Choose one:

1. **Approve Slack private channel control plane.**
   - Provide a private Slack workspace/channel.
   - Provide or authorize creation of a Slack app.
   - Provide local-only `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN`.
   - Approve loopback gateway foreground dummy test only.

2. **Approve Telegram allowlisted bot fallback.**
   - Provide Telegram bot token and approved sender/chat IDs.
   - Accept weaker project-ops controls than Slack.

3. **Approve local OpenClaw agent bridge only.**
   - Provide local model provider credentials if missing.
   - Keep all external channels disabled.

Recommended CEO decision: approve option 1, Slack private channel control plane,
with cron/24-7, public webhooks, auto-merge, and auto-deploy still disabled.
