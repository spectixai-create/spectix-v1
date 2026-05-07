# Chat Transition Log

## Transition 1 - 2026-05-05

### State At Transition

- main HEAD: `754b39af67f86295ddbc0cefd5fead218c3f7675` before project-knowledge consolidation.
- Active product PR: #52, SPRINT-002B priority subtype extraction routes.
- PR #52 head: `86bec004dcb02cc830b1c32ff7dfdf7ea4dffee4`.
- Active blocker: local Inngest function registration failure during non-production smoke retry attempt 4.
- Native OpenClaw Slack remains blocked in PR #47.

### Pending Action Item For New Chat

1. Read `docs/project/INDEX.md`.
2. Read `docs/project/POST_V30_HISTORY.md`.
3. Read `docs/project/ANTI_PATTERNS.md`.
4. Diagnose local Inngest registration failure.
5. After environment fix and explicit CEO approval, rerun PR #52 non-production smoke on head `86bec004`.

## Migration Note (added by PR #55)

Project Knowledge has been migrated to `docs/project/` as of this PR. New chats should read from there. External upload is not required.

## Transition Update - 2026-05-06 (post PR #52 merge)

### State

- PR #52 merged to `main` at `754c87fbba2d7dec11364e4ca54d2cf54bc6f86a`.
- SMOKE-002B-RETRY-005 passed on non-production project `aozbgunwhafabfmuwjol`.
- Smoke claim: `SMOKE-002B-005-20260505185743` / `9222197e-2760-4c10-8b71-501a2aeb4158`.
- Active blocker: MERGE-PR52-001 post-merge queue must be completed before SPRINT-003A starts.

### Pending Action Item For New Chat

1. Read `docs/project/INDEX.md`.
2. Read `docs/agents/workflow/SPRINT-002B_STATUS.md`.
3. Read `docs/agents/workflow/ACTIVE_GATES.md`.
4. Confirm MERGE-PR52-001 is complete before starting SPRINT-003A.

## Transition Update - 2026-05-06 (post PR #68 merge)

### State

- PR #68 (`SPRINT-UI-001: Adjuster brief view MVP`) merged to `main`.
- Merge method: squash.
- Merge commit / current main HEAD:
  `51d6dee22ffdd614f224582fe86b707ca6c8b345`.
- PR head before merge: `0420a1efec0b2a6f394fbfc337960f1343244eb2`.
- Branch retained: `sprint/ui-001-adjuster-brief-view`.
- Non-production UI smoke passed after fix-forward.
- Smoke scenarios 1-10 passed.
- Fix-forward root cause: dispatched question checkbox was disabled.
- Fix-forward result: dispatched questions can be selected and re-dispatched;
  `question_dispatches` preserves one row per `(claim_id, question_id)`,
  preserves `first_dispatched_at`, and updates `last_dispatched_at`.
- Production project `fcqporzsihuqtfohqtxs` was not touched.
- Remaining open PR: #47 (`Record OpenClaw Slack routing blocker`).

### Pending Action Item For New Chat

1. Review and merge SYNC-006 after docs-only diff verification.
2. Do not start SPRINT-UI-002 implementation.
3. Prepare SPRINT-UI-002 planning / pre-flight only after:
   - user decisions on claimant notification channel, claimant auth method, and
     re-cycle trigger;
   - Codex pre-flight on email/SMS infrastructure in current `main`;
   - CEO GPT gate approval.
4. If the first signed LOI from an Israeli travel insurer is reported, switch
   the next gate to SPRINT-PROD-BLOCK.

## Transition Update - 2026-05-07 (post PR #72 merge)

### State

- PR #72 (`UI-002B: claimant responses core flow`) merged to `main`.
- Merge method: squash.
- Merge commit / current main HEAD:
  `ebdb75c71ff340a3e5366672521bb74b83263d59`.
- PR head before merge: `07d02725da51f586e6e10fb685f5b5b5a2b72bbd`.
- Branch retained: `sprint/ui-002b-claimant-responses-core`.
- Final-head validation passed:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm format:check`
  - `pnpm test` with 23 files / 356 tests
  - `pnpm build`
  - `git diff --check`
  - claimant security and recycle Playwright checks
- Final-head non-production verification passed on
  `aozbgunwhafabfmuwjol` only.
- Verified claimant response core:
  - magic links;
  - draft and finalized responses;
  - document-to-question linking;
  - claimant public RTL page `/c/[claim_id]`;
  - draft/upload/finalize APIs;
  - adjuster dispatch/regenerate-link endpoints returning manual-share URL;
  - response recycle Path A and Path B.
- Verified fix-forward safety:
  - non-`pending_info` finalize returns 409;
  - no responses inserted on invalid state;
  - draft preserved;
  - token remains unused;
  - no recycle event emitted on invalid state;
  - `claimant_link_opened` and `claimant_token_invalid` audits write
    privacy-safe metadata only.
- Production project `fcqporzsihuqtfohqtxs` was not touched.
- Deploy was not run.
- Notifications were not sent.
- Resend/Twilio were not added.
- UI-002C was not started.
- Remaining open PR: #47 (`Record OpenClaw Slack routing blocker`).

### Pending Action Item For New Chat

1. Review and merge SYNC-007 after docs-only diff verification.
2. Do not start UI-002C automatically.
3. Prepare UI-002C notification sprint planning/dispatch only after:
   - vov confirms non-production Resend account readiness;
   - vov confirms Twilio Israel number readiness;
   - required notification environment variables are available or declared for
     non-production;
   - CEO GPT approves UI-002C dispatch.
4. If the first signed LOI from an Israeli travel insurer is reported, switch
   the next gate to SPRINT-PROD-BLOCK.

## Transition Update - 2026-05-07 (post PR #73 reconcile)

### State

- PR #73 (`SYNC-007: Record post-PR72 UI-002B state`) merged to `main`.
- Merge method: squash.
- Merge commit / current main HEAD:
  `1252ade89ddc7124d0745d2bc97f3e599ae16855`.
- PR #72 (`UI-002B: claimant responses core flow`) remains complete and merged.
- SYNC-008 corrected stale post-PR72 wording in the CEO handoff and current
  state docs to the post-PR73 repo state.
- Production project `fcqporzsihuqtfohqtxs` remains forbidden.
- Non-production project remains `aozbgunwhafabfmuwjol`; no Supabase mutation
  is approved by this reconcile.
- Deploy, smoke, OpenClaw/native orchestration, cron, 24/7 operation,
  auto-merge, and auto-deploy remain not approved.
- Remaining open PR: #47 (`Record OpenClaw Slack routing blocker`).

### Pending Action Item For New Chat

1. Review SYNC-008 docs-only PR.
2. Do not start UI-002C implementation automatically.
3. Consider UI-002C notification sprint planning/dispatch readiness only after:
   - vov confirms non-production Resend account readiness;
   - vov confirms Twilio Israel number readiness;
   - notification environment readiness is confirmed for non-production;
   - CEO GPT approves UI-002C dispatch.
4. If the first signed LOI from an Israeli travel insurer is reported, switch
   the next gate to SPRINT-PROD-BLOCK by default rather than UI-002C.

## Transition Update - 2026-05-07 (UI-002C deferred)

### State

- PR #74 (`SYNC-008: Reconcile handoff and current state after PR73`) merged to
  `main`.
- Merge method: squash.
- Merge commit / current main HEAD:
  `4c03f9f7b63fdffab140968151a385231a6fda42`.
- UI-002B claimant response core remains the current working product flow.
- UI-002C email automation is skipped/deferred for now because Codex does not
  have safe browser/account access to complete Resend/DNS setup.
- Public DNS for `spectix.co.il` currently returns NXDOMAIN.
- Vercel env read access exists, but notification env vars are not configured.
- Notifications remain unimplemented.
- Manual magic-link sharing remains the accepted MVP/pilot workflow.
- Production Supabase, non-production Supabase mutation, deploy, smoke,
  OpenClaw/native orchestration, cron, 24/7 operation, auto-merge, and
  auto-deploy remain not approved.

### Pending Action Item For New Chat

1. Review SYNC-009 docs-only PR.
2. Do not start UI-002C automatically.
3. Move next to manual UI-002B end-to-end demo-readiness validation /
   operational QA, or customer discovery/LOI track work.
4. If the first signed LOI from an Israeli travel insurer is reported, switch
   the next gate to SPRINT-PROD-BLOCK by default.
