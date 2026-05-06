# Active Gates

Updated after PR #68 / SPRINT-UI-001 merge.

## Current Main

- Repo: `spectixai-create/spectix-v1`
- Current main HEAD:
  `51d6dee22ffdd614f224582fe86b707ca6c8b345`
- Latest merge: PR #68, `SPRINT-UI-001: Adjuster brief view MVP`
- PR #68 branch retained: yes

## Open PRs

- #47 - Record OpenClaw Slack routing blocker

## Recently Merged

- #68 - SPRINT-UI-001 Adjuster brief view MVP, merge commit
  `51d6dee22ffdd614f224582fe86b707ca6c8b345`
- #67 - SYNC-005 UI design artifacts, merge commit
  `21b63dc97f622fff7489c9f2228bb84956b1d1f6`
- #66 - SPRINT-003A Synthesis MVP, merge commit
  `d830e6e0ef56cce7be38d0d65c2aa3b4d1e02fbe`
- #65 - SPRINT-002D errored recovery and soft cost cap, merge commit
  `bf02185db596c33c078f38937334106d9794ea38`

## Current Approved / Not Approved

Approved:

- SYNC-006 post-PR68 documentation/state sync only.

Not approved:

- SPRINT-UI-002 implementation.
- Production Supabase.
- Production smoke.
- Deploy.
- OpenClaw/native orchestration.
- Cron.
- 24/7 operation.
- Auto-merge.
- Auto-deploy.

## SPRINT-UI-001 State

- Status: complete and merged.
- PR #68 is no longer active.
- Non-production UI smoke: PASS after fix-forward.
- Fix-forward root cause: dispatched question checkbox was disabled.
- Verified fix: dispatched questions can be selected and re-dispatched; one
  `question_dispatches` row remains per `(claim_id, question_id)`;
  `first_dispatched_at` is preserved; `last_dispatched_at` is updated.

## SPRINT-UI-002 Gate

SPRINT-UI-002 is not approved for implementation.

It may proceed only after:

1. User decisions on claimant response design:
   - Decision 1: notification channel.
   - Decision 2: claimant auth method.
   - Decision 8: re-cycle trigger.
2. Codex pre-flight on email/SMS infrastructure in current `main`.
3. CEO GPT gate approval.

`design004.1_claimant_responses_06_05.md` exists outside the repo as a CEO
Claude skeleton for SPRINT-UI-002 iteration 1. It is not yet repo-canonical.

## SPRINT-PROD-BLOCK Gate

If the user reports the first signed LOI from an Israeli travel insurer, the
next gate becomes SPRINT-PROD-BLOCK by default rather than UI-002.

Customer discovery parallel track:

- Target: 5 conversations with Israeli travel insurers.
- Trigger to PROD-BLOCK: first signed LOI.

## Supabase Gate

Allowed non-production target:

`aozbgunwhafabfmuwjol`

Forbidden production project:

`fcqporzsihuqtfohqtxs`

Production Supabase remains forbidden unless SPRINT-PROD-BLOCK is explicitly
approved.

## Deployment Gate

Deploy remains not approved unless explicitly approved.

## Merge Rule

Docs-only PRs can be merged after:

1. Docs-only diff is verified.
2. Validation passes.
3. No runtime, migration, Supabase mutation, smoke, claim creation, upload,
   deploy, or production action occurred.
4. CEO explicitly approves merge.
