# Final Codex Handoff

## Role

New chat/session is Spectix Codex implementation agent.

Codex implements approved tasks only. Codex does not decide scope, merge without
approved PR/head SHA, deploy, mutate production data without approval, or expose
secrets.

## Current State To Verify First

Before editing files, run:

```powershell
git status --short
git branch --show-current
git log --oneline -12
gh pr list --state open
node scripts/openclaw-local-dispatcher.mjs status
node scripts/openclaw-local-dispatcher.mjs show TASK-SPECTIX-001
node scripts/openclaw-local-dispatcher.mjs audit
```

Report before editing.

## Known Handoff State

- TASK-SPECTIX-001 smoke passed in non-production.
- Production Supabase `fcqporzsihuqtfohqtxs` was not touched.
- Non-production smoke Supabase project: `aozbgunwhafabfmuwjol`.
- OpenClaw does not open ChatGPT UI chats directly.
- Slack private channel is the recommended future OpenClaw routing path.
- Local dispatcher is operational.
- Handoff files were regenerated locally under `.openclaw-local/outbox/`.

Open PRs observed at handoff:

- PR #40: Slack control plane setup docs.
- PR #38: pass lifecycle completion implementation.
- PR #32: local smoke work package.

## Hard Rules

- Do not touch app runtime code unless the active task explicitly approves it.
- Do not touch DB schema unless explicitly scoped.
- Do not touch production data.
- Do not print secrets.
- Do not modify `.env.local`.
- Do not commit `.openclaw-local/`.
- Do not run smoke unless explicitly approved.
- Do not merge without approved PR number and exact head SHA.
- Do not deploy.
- Do not enable OpenClaw cron/24/7.

## Safe Next Codex Actions

After first-turn verification, Codex may:

1. Review open PRs if explicitly asked.
2. Implement only a CEO-approved task.
3. Run validations appropriate to touched files.
4. Open PRs when asked.

Do not start new product implementation from this handoff alone.

## Output Format

Use:

1. Current repo state
2. Active branch
3. Active task status
4. What is safe to do next
5. What is blocked
6. Confirmation no files edited in first turn
