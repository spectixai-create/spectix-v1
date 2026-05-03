# Spectix - Agent Instructions

## Project

Spectix is an AI-powered investigation system for travel insurance claims in the Israeli market. Adjusters receive a one-page Investigation Brief per claim covering coverage, fraud signals, claimant readiness, and recommendations.

Branding: "Spectix" is the product name. "Claim Investigator POC" appears in some legacy docs and refers to the same project.

## Codex's role

Implement features per spec files in [docs/specs](docs/specs/). Read this file and [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) at the start of every session.

## Spectix agent workflow

The intended multi-agent workflow is:

Human Owner -> CEO GPT -> Architect GPT -> PM GPT -> CEO approval -> Codex -> QA GPT -> CEO final approval -> merge/deploy.

OpenClaw may act only as router/dispatcher between those agents. OpenClaw does not make product, architecture, implementation, merge, or deployment decisions. See [docs/agents/OPENCLAW_ROUTER_RULES.md](docs/agents/OPENCLAW_ROUTER_RULES.md) and [docs/agents/OPENCLAW_SETUP.md](docs/agents/OPENCLAW_SETUP.md).

## Task statuses

Use these statuses exactly when work is routed through OpenClaw or the agent workflow:

- `idea`
- `ceo_intent_ready`
- `architect_review`
- `pm_spec_ready`
- `ceo_dev_approved`
- `in_dev`
- `dev_done`
- `qa_review`
- `qa_failed`
- `qa_approved`
- `code_review`
- `ceo_final_review`
- `ready_to_merge`
- `done`
- `blocked`

Codex must not receive implementation work until the task status is `ceo_dev_approved`. Merge/deploy work requires CEO final approval and status `ready_to_merge`.

## Approval gates

- Product intent: CEO GPT or human owner.
- Architecture direction: Architect GPT recommendation plus CEO decision when trade-offs matter.
- Development start: CEO GPT or human owner must set `ceo_dev_approved`.
- QA pass: QA GPT may recommend `qa_approved`.
- Merge/deploy: CEO final approval is required. OpenClaw cannot infer this.
- DB/auth/billing/pricing/secrets/production-setting changes require explicit CEO approval.

## Core rules

- Read [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) at the start of every session.
- Read the assigned spike spec under [docs/specs](docs/specs/).
- For OpenClaw-routed work, read [docs/agents/CODEX_AGENT_RULES.md](docs/agents/CODEX_AGENT_RULES.md).
- Update [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) atomically with spike work.
- Update [lib/version.ts](lib/version.ts) at the end of each spike. Format per D-013: `Spike #N • YYYY-MM-DD`.
- Follow [docs/CONVENTIONS.md](docs/CONVENTIONS.md).
- Do not modify [supabase/migrations](supabase/migrations/) unless the spec explicitly owns a migration.
- Do not bypass typecheck, lint, build, or test verification.
- Preserve RTL/Hebrew UI behavior.
- All UI pages need `VersionFooter` per D-013.
- On migration changes: update [docs/DB_SCHEMA.md](docs/DB_SCHEMA.md) and [lib/types.ts](lib/types.ts) in the same PR.

## Architecture quick reference

- Pipeline: 3-pass iterative enrichment. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- Rules R01-R09. See [docs/RULES.md](docs/RULES.md).
- 7 DB tables. See [docs/DB_SCHEMA.md](docs/DB_SCHEMA.md).
- Routing and auth boundaries. See [docs/ROUTING.md](docs/ROUTING.md).
- Tech stack: Next.js 14, Tailwind + shadcn/ui RTL, Supabase Frankfurt, Claude API direct, Inngest, Vercel.

## Required commands before commit

- `pnpm typecheck`
- `pnpm lint`
- `pnpm format:check`
- `pnpm build`
- `pnpm test`
- `pnpm test:e2e` when UI/auth behavior changes

## What done means

- Required commands pass.
- PR description includes evidence per D-012.
- Lighthouse a11y is at least 90 on UI changes.
- VersionFooter appears on new UI pages.
- [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) is updated.
- PR template checklist is satisfied.

## What not to do

- Do not start implementation from a vague chat instruction; convert it to a task with ID, status, scope, owner, and acceptance criteria first.
- Do not work directly on `main` except pulling latest main.
- Do not improve code outside the current task scope.
- Do not refactor unrelated files.
- Do not change public API contracts without explicit instruction.
- Do not commit secrets, `.env` files, or credentials.
- Do not change DB schema, auth, billing, pricing, secrets, production settings, or deployment credentials without explicit CEO approval.
- Do not bypass middleware for auth.
- Do not modify route group structure without a spec.
- Do not delete or mass-modify files without explicit CEO instruction.
- Do not merge or deploy without CEO final approval.

## Branch rules

- Pull latest `main` before branching.
- Use a task-specific branch.
- Keep documentation-only workflow changes separate from app-code changes.
- Do not force-push shared branches unless explicitly approved.
- Do not leave broken typecheck in a PR unless the PR is clearly marked draft/WIP and the blocker is documented.

## Required Codex final response format

For implementation or PR work, Codex final response should include:

- Task ID or PR number.
- Branch.
- PR URL, if opened.
- Summary of changes.
- Validation commands and results.
- Secrets/env/deployment settings touched: yes/no.
- Deviations or blockers.
- Next recommended route.

## Workspace requirements on Windows

Use an ASCII-only workspace path. CJK characters break Node, pnpm, and git on Windows. If the repo is under `OneDrive\文档` or similar, mirror it to an ASCII path before running `pnpm install`.

## Escalation

If a blocker appears mid-spike:

1. Open a draft PR, or push the branch if PR creation is blocked.
2. Update [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) with `Spike #XX BLOCKED on Y`.
3. Do not proceed with risky assumptions.
4. Never force-push `main`.

## Agent territories

Originally Backend (Claude Code) and Frontend (Codex) had separate territories. Codex currently handles both; Spike #00a was the first cross-boundary backend contract spike. If Claude Code returns, re-establish the original boundaries. Until then, Codex is sole implementation agent.

See [docs/PROCESS.md](docs/PROCESS.md) for the human + agent workflow.
