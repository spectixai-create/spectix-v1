# Spectix Agent Chat Bootstrap Index

## Purpose

This index lists the copy-paste-ready first messages for bootstrapping Spectix agent chats under the temporary OP bridge.

The temporary OP bridge uses the official OpenAI/Codex Slack connector plus the local OpenClaw dispatcher. Native OpenClaw Slack Socket Mode remains blocked and documented in PR #47.

## Current State

- Project: Spectix Claim Investigator POC
- Repo: `spectixai-create/spectix-v1`
- Local path: `C:\Users\smart\spectix`
- Current main: `94a78e4`, merge of PR #48 temporary OP bridge
- Product state: `TASK-SPECTIX-001` broad extraction smoke passed in non-production
- Production Supabase touched: no
- Current product follow-up: pass row remained `in_progress` after all TASK-SPECTIX-001 documents completed document-level processing
- Next product work: SPRINT-001 — Pass lifecycle + claim-level processing completion

## Files

- `docs/agents/prompts/ARCHITECT_AGENT_FIRST_MESSAGE.md`
- `docs/agents/prompts/PM_AGENT_FIRST_MESSAGE.md`
- `docs/agents/prompts/QA_AGENT_FIRST_MESSAGE.md`
- `docs/agents/prompts/CODEX_OPS_AGENT_FIRST_MESSAGE.md`

## Agent Bootstrap Order

1. Spectix Architect Agent
2. Spectix PM Agent
3. Spectix QA Agent
4. Spectix Codex/Ops Agent, if needed

## First Assignments

- Architect: review SPRINT-001 / PR #38 Option A vs Option B.
- PM: stand by until Architect recommendation.
- QA: stand by until Codex implementation exists and CEO routes QA.
- Codex/Ops: stand by; only execute CEO-approved local dispatcher, docs-only, or PR-triage tasks.

## Strict Gates

- No production mutation without explicit CEO approval.
- No non-production mutation without explicit CEO approval.
- No smoke execution without explicit CEO approval.
- No claim creation.
- No document upload.
- No `.env.local` edits.
- No secrets in chat or repo.
- No merge without verified PR/head SHA and CEO final approval.
- No product implementation before CEO dev approval.
- No OpenClaw 24/7.
- No cron.
- No auto-merge.
- No auto-deploy.
- No native gateway.

## Browser/Chat Creation Status

The bootstrap files are the durable setup package. If actual ChatGPT agent chat creation is unavailable through the current logged-in browser/profile, use these files manually as the first messages in the corresponding new chats.
