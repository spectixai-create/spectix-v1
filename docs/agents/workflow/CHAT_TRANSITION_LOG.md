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

## Transition Update - 2026-05-07 (post PR #76 demo polish)

### State

- PR #76 (`DEMO: Polish UI-002B manual link sharing and demo script`) merged to
  `main`.
- Merge method: merge commit.
- Merge commit / current main HEAD:
  `4bdaf6dcaac0244ccfd1f0d7258ab7cfc8b5ea8a`.
- PR #75 (`SYNC-009: Record UI-002C deferral`) is also merged at
  `7f2fe87e6e843bf17c276de20c7a941110771c87`.
- UI-002B claimant response core remains the current working product flow.
- Manual magic-link sharing remains the accepted MVP/pilot workflow.
- PR #76 added copy fallback polish so the adjuster link remains visible and
  auto-selectable when browser clipboard permission fails.
- UI-002C is deferred/skipped and must not start automatically.
- Future UI-002C scope is email-only via Resend per D-030. No Twilio, no SMS
  fallback, and no WhatsApp automation are approved for MVP.
- Production Supabase, non-production Supabase mutation, deploy, smoke,
  Resend/DNS/Vercel env changes, OpenClaw/native orchestration, cron, 24/7
  operation, auto-merge, and auto-deploy remain not approved.
- Remaining open PR: #47 (`Record OpenClaw Slack routing blocker`).

### Pending Action Item For New Chat

1. Review SYNC-010 + DEMO-PACK-001 docs-only PR.
2. Do not start UI-002C automatically.
3. Move next to insurer demo execution / customer discovery / LOI track.
4. If the first signed LOI from an Israeli travel insurer is reported, switch
   the next gate to SPRINT-PROD-BLOCK by default.

## Transition Update - 2026-05-07 (post PR #78 UI-002C)

### State

- PR #78 (`UI-002C: claimant email notifications (Resend, email-only)`) merged
  to `main`.
- Merge method: merge commit.
- Merge commit / current main HEAD:
  `b4b6158712a018dda3a99ad9fcf657a901f8a328`.
- UI-002B claimant response core remains complete.
- UI-002C claimant email notifications are complete on `main`.
- Notification scope is email-only via Resend.
- Manual magic-link fallback remains preserved.
- No Twilio, SMS automation, or WhatsApp automation was added.
- Remaining open PR: #47 (`Record OpenClaw Slack routing blocker`).

### Post-Merge Validation

- Vercel status for `b4b6158`: success.
- Staging health: PASS, HTTP 200, `ok:true`.
- Non-production Supabase target: `aozbgunwhafabfmuwjol`.
- Email path: PASS.
- No-email path: PASS.
- Invalid Resend webhook signature: PASS, HTTP 400.
- Manual fallback: PASS.
- Copy-denied fallback: PASS.
- Audit leakage scan: PASS.
- Generated claimant link origin matched `https://staging.spectix.co.il`.

### Safety

- Production touched: no.
- Production Supabase `fcqporzsihuqtfohqtxs` touched: no.
- Secrets printed: no.
- Raw tokens printed: no.
- Full magic links printed: no.
- SMS/WhatsApp used: no.
- OpenClaw used: no.
- PR #47 touched/merged: no.

### Pending Action Item For New Chat

1. Review SYNC-011 docs-only PR.
2. Do not start real-case tuning automatically.
3. After SYNC-011 merge, plan Real-case tuning round 1 / pilot-readiness
   validation.
4. Keep production Supabase, production deploy, production smoke, OpenClaw,
   cron, 24/7 operation, auto-merge, and auto-deploy blocked unless explicitly
   approved.

## Transition Update - 2026-05-07 (insurer discovery execution package)

### State

- PR #81 (`VALIDATION: Real-case tuning round 1 report`) merged to `main`.
- Merge method: merge commit.
- Merge commit / current main HEAD:
  `640f44736eb50bed02f57dec38a99fdbeeb0d4db`.
- Real-case tuning round 1 verdict: READY.
- UI-002 cluster remains complete:
  - UI-002A pre-flight: done.
  - UI-002B claimant response core: done.
  - UI-002C email-only claimant notifications via Resend: done.
- Remaining open PR: #47 (`Record OpenClaw Slack routing blocker`).

### Execution Package Scope

- New docs-only execution package:
  `docs/demo/insurer_discovery_execution_pack_07_05.md`.
- Purpose: prepare manual/operator-led insurer discovery and demo execution.
- Target: 5 Israeli travel-insurance conversations.
- Trigger to SPRINT-PROD-BLOCK: first signed LOI or equivalent written pilot
  intent.
- No customer contact, outreach, Supabase mutation, smoke, deploy, production
  action, or product operation is performed by this PR.

### Safety

- Production touched: no.
- Supabase touched: no.
- Smoke run: no.
- Deploy run: no.
- Outreach sent: no.
- Insurers contacted: no.
- Secrets printed: no.
- Raw tokens printed: no.
- Full magic links printed: no.
- SMS/WhatsApp/Twilio used: no.
- OpenClaw used: no.
- PR #47 touched/merged: no.

### Pending Action Item For New Chat

1. Review the insurer discovery execution-package PR.
2. Do not automate outreach or contact insurers from Codex.
3. After merge, the operator may manually use the package outside repo
   automation.
4. If first signed LOI or written pilot intent arrives, open
   SPRINT-PROD-BLOCK planning by default.

## Transition Update - 2026-05-07 (real-case tuning round 1 planning)

### State

- PR #79 (`SYNC-011: Record UI-002C completion and post-PR78 state`) merged to
  `main`.
- Merge method: merge commit.
- Merge commit / current main HEAD:
  `5f428fe8a9b76b9e6c12e7885263da03bd032a03`.
- UI-002 cluster remains complete:
  - UI-002A pre-flight: done.
  - UI-002B claimant response core: done.
  - UI-002C email-only claimant notifications via Resend: done.
- Remaining open PR: #47 (`Record OpenClaw Slack routing blocker`).

### Planning Scope

- New docs-only planning target:
  `docs/management/plans/real_case_tuning_round_1_07_05.md`.
- Planning objective: prepare a non-production Real-case tuning round 1 /
  pilot-readiness validation.
- The plan defines allowed inputs, case archetypes, success criteria,
  non-secret evidence rules, explicit execution gates, and future report
  format.
- This planning PR does not execute tuning, create fixtures, mutate Supabase,
  run smoke, trigger email sends, deploy, or approve production work.

### Safety

- Production touched: no.
- Supabase touched: no.
- Smoke run: no.
- Deploy run: no.
- Secrets printed: no.
- Raw tokens printed: no.
- Full magic links printed: no.
- SMS/WhatsApp used: no.
- OpenClaw used: no.
- PR #47 touched/merged: no.

### Pending Action Item For New Chat

1. Review the Real-case tuning round 1 planning PR.
2. Do not execute tuning automatically.
3. If approved later, dispatch a separate gated execution using non-production
   only.
4. Keep production Supabase, production deploy, production smoke, OpenClaw,
   cron, 24/7 operation, auto-merge, and auto-deploy blocked unless explicitly
   approved.
