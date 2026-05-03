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
2. Create a local runtime directory at `C:\Users\smart\spectix\.openclaw-local`.
   This directory is ignored by git and may hold `tasks.json`, `state.json`,
   and local dry-run logs.
3. Run `openclaw config validate`. The installed OpenClaw CLI reads
   `~/.openclaw/openclaw.json`; if you copied the repo's JSON5 template,
   adapt it to the active CLI schema before validation. Keep the Spectix
   safety intent unchanged: no channels, no cron, no auto-merge, and no
   auto-deploy.
4. Run the dummy routing test in `/docs/agents/DUMMY_ROUTING_TEST.md`.
5. Verify logs show task ID, status changes, routing decisions, and stop points.
6. Verify OpenClaw refuses to route implementation work before `ceo_dev_approved`.
7. Verify OpenClaw refuses merge/deploy without CEO final approval.
8. Only then enable one non-production chat channel at a time.

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
