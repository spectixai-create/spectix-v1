# OpenClaw Setup For Spectix

## Purpose

OpenClaw is the router/dispatcher for the Spectix multi-agent workflow. It coordinates messages between CEO, Architect, PM, Codex, and QA chats. It does not make product, architecture, implementation, merge, or deployment decisions.

## Local Setup Checklist

1. Confirm the repo is cloned to an ASCII path, for example `C:\Users\smart\spectix`.
2. Confirm GitHub CLI works: `gh auth status`.
3. Confirm local validation tools already installed by the repo work: `pnpm --version`.
4. Create local OpenClaw config directory: `~/.openclaw`.
5. Copy `/docs/agents/openclaw.config.template.json5` to `~/.openclaw/openclaw.json`.
6. Fill only local channel/model placeholders that the human owner approved.
7. Keep cron, auto-merge, auto-deploy, and all channels disabled for first run.

## Required Installed Tools

- Git
- GitHub CLI (`gh`)
- Node.js and pnpm matching the repo
- OpenClaw runtime installed outside this repo
- Optional: a local log viewer for OpenClaw routing logs

## Required Manual Secrets

OpenClaw may need local API tokens for chat connectors or GitHub metadata. These must be added manually to `~/.openclaw/openclaw.json` or the host secret store. Do not commit them to Spectix. Do not store production DB credentials in OpenClaw config.

## Recommended Config Location

Use:

```text
~/.openclaw/openclaw.json
```

Copy template:

```powershell
New-Item -ItemType Directory -Force ~/.openclaw
Copy-Item C:\Users\smart\spectix\docs\agents\openclaw.config.template.json5 ~/.openclaw/openclaw.json
```

## Safe First-Run Process

1. Start with all channels disabled.
2. Run the dummy routing test in `/docs/agents/DUMMY_ROUTING_TEST.md`.
3. Verify logs show task ID, status changes, routing decisions, and stop points.
4. Verify OpenClaw refuses to route implementation work before `ceo_dev_approved`.
5. Verify OpenClaw refuses merge/deploy without CEO final approval.
6. Only then enable one non-production chat channel at a time.

## Local Gateway Routing Skeleton

TASK-013 configured the local OpenClaw skeleton on this workstation only. The
active config path is:

```text
C:\Users\smart\.openclaw\openclaw.json
```

The local config has explicit gateway settings:

- `gateway.mode`: `local`
- `gateway.bind`: `loopback`
- `gateway.port`: `18789`
- `cron.enabled`: `false`
- `channels`: `{}`

The local multi-agent skeleton is loaded with these agents, all pointed at
`C:\Users\smart\spectix`:

- `main`
- `ceo`
- `pm`
- `architect`
- `codex`
- `qa`

Gateway smoke test command:

```powershell
openclaw gateway run --bind loopback --auth none --ws-log compact
```

The command started a loopback listener on `127.0.0.1:18789` during the
foreground smoke test. It was stopped after validation and was not installed as
a service. Post-test `openclaw gateway status` reported the gateway stopped and
the service unit missing, which is expected because persistent service mode is
not enabled.

Route bindings are not configured yet. `openclaw agents bind` requires a known
channel binding, and a placeholder `local-skeleton` channel was rejected with
`Unknown channel "local-skeleton"`. External channels remain disabled, so the
dummy routing flow still cannot run end-to-end.

Post-test checks:

```powershell
openclaw config validate
openclaw gateway status
openclaw channels list --json
openclaw tasks flow list --json
openclaw tasks audit --json
```

Current dummy-routing blocker: there are no channel-backed bindings and no
registered durable TaskFlow for `DUMMY-OPENCLAW-001`.

Next exact activation step: choose a safe local or non-production channel
identifier supported by OpenClaw, configure it without secrets in the repo, add
route bindings for `ceo`, `pm`, `architect`, `codex`, and `qa`, then register
the dummy TaskFlow for `DUMMY-OPENCLAW-001` with cron, auto-merge, and
auto-deploy still disabled.

## Command Channel Investigation

TASK-016 investigated GitHub issue/PR comments as the preferred command channel
because they are auditable and safer than browser-chat automation. The installed
OpenClaw CLI version is `2026.5.2`.

Result: GitHub issue/PR comments are not currently supported as an OpenClaw
channel in this local install.

Evidence:

```powershell
openclaw channels capabilities --help
```

The supported channel list includes chat providers such as Telegram, Discord,
Slack, Matrix, and related systems, but not `github`.

```powershell
openclaw channels capabilities --channel github --json
```

Result:

```text
Unknown channel "github".
```

```powershell
openclaw agents bind --agent ceo --bind github-spectix-control:ceo --json
```

Result:

```text
Unknown channel "github-spectix-control".
```

```powershell
openclaw config get github
```

Result:

```text
Config path not found: github
```

The repo template still contains a disabled placeholder `github` section, but
the live OpenClaw config/schema used by this workstation does not expose GitHub
issue or pull-request comments as a channel or binding target. The schema hits
for GitHub refer to GitHub Copilot model-provider configuration, not issue/PR
comment routing.

Chosen fallback: local manual task files plus OpenClaw CLI inspection. Keep
`channels` empty, keep `cron.enabled=false`, do not configure a public webhook,
and do not bind Codex to automatic app-code execution. Operators may prepare
dummy task records locally under ignored OpenClaw state and inspect them with
OpenClaw CLI commands until a supported local channel or TaskFlow registration
path is available.

Next exact activation step: define a local filesystem task queue format for
`DUMMY-OPENCLAW-001`, document the expected status transitions, and identify the
OpenClaw command that registers or imports that local task as a durable TaskFlow.
Only after that succeeds should route bindings be revisited.

## Current Activation Path: Local Dispatcher First

TASK-018 adds a local filesystem dispatcher as the immediate activation path for
Spectix agent workflow testing. Use it before any external channel, cron loop,
24/7 service, merge automation, or deployment automation.

Read:

- [LOCAL_DISPATCHER.md](LOCAL_DISPATCHER.md)
- [local-task-queue-spec.md](local-task-queue-spec.md)

GitHub issue and PR comments remain unsupported as an OpenClaw channel in this
install. The local dispatcher keeps runtime files under ignored
`.openclaw-local/`, enforces the CEO/PM/Codex/QA gates locally, and supports
only the docs-only dummy route for Codex simulation.

## Dummy Routing Test

Use `/docs/agents/DUMMY_ROUTING_TEST.md`. It is docs-only and writes only `/docs/agents/dummy-output.md`. No app code, DB, auth, billing, secrets, or deployment settings are touched.

## Rollback / Disable Procedure

1. Stop the OpenClaw process.
2. Disable all channels in `~/.openclaw/openclaw.json`.
3. Move config aside: `Rename-Item ~/.openclaw/openclaw.json openclaw.disabled.json`.
4. Remove any scheduled task or service that starts OpenClaw.
5. Leave repository files intact; they are documentation only.

## Security Notes

- Never commit real tokens.
- Never give OpenClaw production DB credentials.
- Keep automatic merge and automatic deploy disabled.
- Treat DB/auth/billing/pricing/secrets/production-setting changes as high risk.
- Log routing metadata, not secrets or claim PII.

## What Not To Automate Yet

- Merge decisions.
- Deployments.
- Production Supabase writes.
- Secret rotation.
- Billing/pricing changes.
- Auth policy changes.
- Schema migrations.
- CEO final approval.

## Turning On 24/7 Mode

Turn on 24/7 mode only after the dummy routing test passes and the human owner approves persistent operation. Start with read-only routing, cron disabled, and no automatic GitHub write actions.
