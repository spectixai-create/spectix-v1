# CEO Handoff - Next Chat

## Bootstrap Reading Order

For new CEO chats, read in this order:

1. `docs/project/INDEX.md` (master index)
2. `docs/project/project_status_03_05_v3_0.md`
3. `docs/project/POST_V30_HISTORY.md`
4. `docs/project/ANTI_PATTERNS.md`
5. `docs/agents/workflow/SPRINT-002B_STATUS.md`
6. `docs/agents/workflow/ACTIVE_GATES.md`
7. `docs/agents/workflow/CHAT_TRANSITION_LOG.md` (this directory, most recent transition)

External Project Knowledge upload is no longer required.

## Current Date And Repo State

- Date: 2026-05-05 18:49:43 +03:00
- Repo: `spectixai-create/spectix-v1`
- Local path: `C:\Users\smart\spectix`
- main HEAD: `07d055825e97c2b0f1ac4e568ba6cef4966eadf2`
- Active PR: #52
- Active branch: `sprint/subtype-extraction-routes`

## Active Sprint

SPRINT-002B - Priority Subtype Extraction Routes (7 MVP routes)

## SPRINT-002B / PR #52 Final State

- PR URL: <https://github.com/spectixai-create/spectix-v1/pull/52>
- Branch retained for 24h after merge: `sprint/subtype-extraction-routes`
- Smoke-tested SHA: `86bec004dcb02cc830b1c32ff7dfdf7ea4dffee4`
- Merged PR head: `f2a7fc08f7846ffbfe13ddef9cc2e7bd9adf3085`
- Merge commit: `754c87fbba2d7dec11364e4ca54d2cf54bc6f86a`
- Status: merged to `main`
- Smoke: SMOKE-002B-RETRY-005 passed in non-production on claim `9222197e-2760-4c10-8b71-501a2aeb4158`.
- SPRINT-003A must not start until MERGE-PR52-001 post-merge queue is completed.

## Recent Completed Work

- SPRINT-001 merged.
- SPRINT-002A merged.
- PR #51 state sync merged.
- SPRINT-002B implementation merged as PR #52.
- First non-prod smoke failed and was fixed without contract loosening.
- SMOKE-002B-RETRY-005 passed after local Inngest env correction.
- TECH_DEBT 11n baseline recorded.

## Current Blocker / Next Gate

- Complete MERGE-PR52-001 post-merge queue.
- SPRINT-003A is not approved until this queue is completed and merged.
- Production smoke remains not approved.
- Production Supabase remains forbidden.
- Deploy remains not approved.

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
