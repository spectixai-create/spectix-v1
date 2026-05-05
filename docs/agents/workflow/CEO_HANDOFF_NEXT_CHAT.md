# CEO Handoff - Next Chat

## Current Date And Repo State

- Date: 2026-05-05 18:49:43 +03:00
- Repo: `spectixai-create/spectix-v1`
- Local path: `C:\Users\smart\spectix`
- main HEAD: `754b39af67f86295ddbc0cefd5fead218c3f7675`
- Active PR: #52
- Active branch: `sprint/subtype-extraction-routes`

## Active Sprint

SPRINT-002B - Priority Subtype Extraction Routes (7 MVP routes)

## Current PR #52 State

- PR URL: <https://github.com/spectixai-create/spectix-v1/pull/52>
- Branch: `sprint/subtype-extraction-routes`
- Current head SHA: `86bec004dcb02cc830b1c32ff7dfdf7ea4dffee4`
- State: open
- Mergeable: `MERGEABLE`
- Draft: false
- Status: smoke failed on old head, Codex fix pushed, waiting for CEO approval for fresh non-prod smoke retry.
- Do not merge yet.
- Do not rerun smoke unless CEO explicitly approves.

## Recent Completed Work

- SPRINT-001 merged.
- SPRINT-002A merged.
- PR #51 state sync merged.
- SPRINT-002B implementation opened as PR #52.
- First non-prod smoke failed.
- Fix commit pushed after failure.

## Current Blocker / Next Gate

- Smoke retry attempt 4 failed at local Inngest registration, not PR #52 code.
- Pending: local dev environment debugging for Inngest registration.
- PR #52 code is believed correct per Claude Code QA audit and needs runtime confirmation only.
- Target project for any future smoke retry: `aozbgunwhafabfmuwjol`
- Forbidden production project: `fcqporzsihuqtfohqtxs`
- Production smoke is not approved.
- PR merge is not approved.

## Current Workflow

Codex report -> CEO GPT plan -> Claude review -> CEO GPT final prompt -> Codex execution

This is not autonomous orchestration. ChatGPT chats are not the source of truth. Repo docs and PRs are the source of truth.

## Hard Prohibitions

- No production Supabase.
- No production smoke.
- No merge without CEO approval.
- No deploy.
- No `.env.local` edits.
- No secrets.
- No native OpenClaw.
- No cron.
- No 24/7.
- No auto-merge.
- No auto-deploy.

## First Action For New CEO Chat

Read:

1. `docs/agents/workflow/CEO_HANDOFF_NEXT_CHAT.md`
2. `docs/agents/workflow/SPRINT-002B_STATUS.md`
3. `docs/agents/workflow/ACTIVE_GATES.md`

Then ask for latest Codex/Claude update before issuing the next prompt.
