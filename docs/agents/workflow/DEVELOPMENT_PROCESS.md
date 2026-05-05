# Spectix Development Process

## Current Process

1. Codex executes task and returns report.
2. CEO GPT analyzes and creates a plan.
3. User sends plan to Claude.
4. Claude reviews for blockers, anti-patterns, missing scope, and edge cases.
5. User sends Claude review back to CEO GPT.
6. CEO GPT writes final Codex prompt.
7. Codex executes.
8. Repeat.

## Why

Full OP/OpenClaw automation is frozen. Separate ChatGPT agent chats are not reliable as an orchestration layer. Repo docs and PRs are the source of truth.

## Roles

- User / Owner: final product, business, and risk decisions.
- CEO GPT: planning, gate control, final prompts.
- Claude: review, anti-pattern detection, architectural/product critique.
- Codex: implementation, validation, PR updates.
- PM: spec/acceptance review when used.
- QA: optional; currently often skipped by owner preference.
- OpenClaw/native Slack: blocked/deferred.

## Gates That Require Explicit CEO/User Approval

- Implementation start.
- Non-prod smoke.
- Production smoke.
- Supabase mutation.
- Claim creation.
- Document upload.
- Migration apply.
- Merge.
- Deploy.
- Cron / 24/7.
- Auto-merge / auto-deploy.
- Native OpenClaw work.
- Secrets / dashboard access.

## What Can Happen Without Owner Interruption

- Docs-only planning package.
- Local validation.
- PR inspection.
- Prompt drafting.
- Claude review routing by the user.
- Codex code changes only after explicit CEO dev prompt.
