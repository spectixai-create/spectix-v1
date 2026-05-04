# OpenClaw Next Actions

## Current Fact

OpenClaw cannot open ChatGPT UI chats directly.

The supported automation path is OpenClaw-native routing through Gateway,
agents, channel integrations, bindings, sessions, and local/provider-backed
agent turns.

## Best Automation Path

Use a private Slack channel as the OpenClaw control plane.

Slack is recommended because the installed OpenClaw runtime supports Slack
Socket Mode, channel/thread routing, reactions, and native commands. Socket Mode
avoids a public webhook for first activation.

## Required Slack Credentials

Names only:

- Slack bot token
- Slack app token
- optional Slack signing secret
- private channel ID
- allowed user IDs

Do not commit or paste token values into repo docs, chat, `.env.local`, or
Slack messages.

## Local OpenClaw Config Steps

Do not run until CEO explicitly approves credential entry.

1. Open local config only:

   ```text
   C:\Users\smart\.openclaw\openclaw.json
   ```

2. Add Slack channel config using token references only.

3. Keep:

   ```text
   gateway.bind = loopback
   cron.enabled = false
   autoMerge = false
   autoDeploy = false
   ```

4. Add or verify agent list:

   ```text
   ceo
   architect
   pm
   qa
   codex or codex_ops
   ```

5. Bind agents after Slack validates:

   ```powershell
   openclaw agents bind --agent ceo --bind slack:default --json
   openclaw agents bind --agent architect --bind slack:default --json
   openclaw agents bind --agent pm --bind slack:default --json
   openclaw agents bind --agent qa --bind slack:default --json
   openclaw agents bind --agent codex --bind slack:default --json
   openclaw agents bindings --json
   ```

6. Validate config:

   ```powershell
   openclaw config validate
   ```

## Dummy Routing Test

Do not enable 24/7. Use foreground loopback only.

Start:

```powershell
openclaw gateway run --bind loopback --auth none --ws-log compact
```

In the private Slack control channel, test:

```text
/oc status
/oc next
/oc handoff TASK-SPECTIX-001 --role pm
```

Expected:

- Replies stay in the private Slack channel/thread.
- No app code changes.
- No DB mutation.
- No production touch.
- No secrets printed.
- No merge/deploy.
- No cron/24/7.

Stop the gateway after the dummy test.

## Gate

Do not enable 24/7 until Slack dummy routing passes and CEO explicitly approves
persistent operation.

Do not enable public webhooks for first activation.

Do not allow OpenClaw to merge, deploy, mutate production, run smoke, create
claims, upload documents, or change secrets/env/deploy settings.

## Fallback

If Slack setup is blocked:

1. Continue using local dispatcher handoffs.
2. Paste role-specific final handoff files into manual role chats.
3. Use `openclaw agent --agent <id> --local --json` only after local model
   credentials are confirmed and CEO approves.
