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
