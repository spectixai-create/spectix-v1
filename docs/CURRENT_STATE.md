# Current State

Updated by Codex after PR #68 / SPRINT-UI-001 merge.

## Version

Spectix post SPRINT-UI-001 • 2026-05-06

## Current Phase

The core non-production MVP pipeline now covers intake, document upload,
classification, normalized extraction, validation, deterministic synthesis, and
the first adjuster-facing brief view.

Current `main` HEAD is
`51d6dee22ffdd614f224582fe86b707ca6c8b345`, the squash merge commit for PR
#68 (`SPRINT-UI-001: Adjuster brief view MVP`).

## Completed Spikes And Sprints

- #00 - Backend foundation: schema, Supabase, Inngest scaffolding.
- #00b - Frontend foundation: Tailwind, shadcn/ui, RTL, tokens.
- #00c - UI component library expansion.
- #00d - Investigation Brief View skeleton.
- #00e - Adjuster Dashboard skeleton.
- #02 - Claim Intake Form skeleton.
- #02a - Login UI, 404, VersionFooter.
- #02b - Clarification Questions Queue skeleton.
- #00a - Backend types contract in [lib/types.ts](../lib/types.ts).
- #01 - Supabase Auth wiring.
- #00z-A - Documentation infrastructure.
- #02c-1 - Schema Gap Audit in [SCHEMA_AUDIT.md](SCHEMA_AUDIT.md).
- #migration-0002 - Schema audit implementation in
  [0002_schema_audit_implementation.sql](../supabase/migrations/0002_schema_audit_implementation.sql).
- #02c-2 - Public claim intake API and form wiring.
- #03a - File upload and Storage foundation.
- #03b - Inngest document processing state machine.
- #03g - Claude document classifier, pass accounting, and status polling.
- #03ד-1a - Document subtype classification foundation.
- #03ד-1b - Broad extraction prompts and `documents.extracted_data` wiring.
- SPRINT-001 - Pass lifecycle completion after claim-level document processing.
- SPRINT-002A - Extraction schema contracts in PR #50.
- SPRINT-002B - Priority subtype extraction routes in PR #52.
- SPRINT-002C - Cross-document validation layers 11.1-11.3 in PR #60.
- SPRINT-002D - `errored` recovery and soft cost cap in PR #65.
- SPRINT-003A - Deterministic synthesis MVP in PR #66.
- SPRINT-UI-001 - Adjuster brief view MVP in PR #68.

## Current Sprint Status

**SPRINT-UI-001 - Adjuster Brief View MVP** - DONE

- Merged: PR #68 -> `main`
- Merge commit / current main HEAD:
  `51d6dee22ffdd614f224582fe86b707ca6c8b345`
- PR head before merge: `0420a1efec0b2a6f394fbfc337960f1343244eb2`
- Base before merge: `21b63dc97f622fff7489c9f2228bb84956b1d1f6`
- Non-production UI smoke: PASS after fix-forward
- Smoke scenarios 1-10: PASS
- Production Supabase touched: no
- Deploy run by Codex: no

Scope shipped:

- `/dashboard` claims list.
- `/claim/[id]` adjuster brief view.
- Findings, documents, validation, and audit tabs.
- Approve, reject, request-info, escalate, and unescalate adjuster actions.
- `question_dispatches` support.
- `claims.escalated_to_investigator` support.
- Hebrew RTL adjuster UI.

Fix-forward recorded:

- Root cause: already-dispatched question checkboxes were visually shown but
  disabled, blocking required re-dispatch.
- Result: dispatched questions remain visually marked as previously dispatched
  but can be selected and re-dispatched.
- DB behavior verified: one row is preserved per `(claim_id, question_id)`,
  `first_dispatched_at` is preserved, and `last_dispatched_at` is updated.

**SPRINT-UI-002** - NOT APPROVED FOR IMPLEMENTATION

SPRINT-UI-002 may proceed only after planning and pre-flight gates are complete.
It is not active implementation work.

## Active Gates

See [ACTIVE_GATES.md](agents/workflow/ACTIVE_GATES.md).

Immediate next gate after SYNC-006 is SPRINT-UI-002 planning / pre-flight, not
implementation. Required inputs before implementation:

1. User decisions on claimant response design:
   - Decision 1: notification channel.
   - Decision 2: claimant auth method.
   - Decision 8: re-cycle trigger.
2. Codex pre-flight on email/SMS infrastructure in current `main`.
3. CEO GPT gate approval.

If the user reports the first signed LOI from an Israeli travel insurer, the
next gate becomes SPRINT-PROD-BLOCK rather than UI-002 by default.

## Customer Discovery Track

- Target: 5 conversations with Israeli travel insurers.
- Trigger to SPRINT-PROD-BLOCK: first signed LOI.
- Production Supabase remains forbidden unless SPRINT-PROD-BLOCK is explicitly
  approved.

## External / Pending Context

- `design004.1_claimant_responses_06_05.md` exists outside the repo as a CEO
  Claude skeleton for SPRINT-UI-002 iteration 1.
- It is not yet committed to the repo.
- It requires user decisions and implementation pre-flight before any UI-002
  implementation handoff.

## Recent Merges

| PR  | Title                                     | Merge SHA  | Date       | Notes                             |
| --- | ----------------------------------------- | ---------- | ---------- | --------------------------------- |
| #68 | SPRINT-UI-001: Adjuster brief view MVP    | `51d6dee…` | 2026-05-06 | Smoked + merged after fix-forward |
| #67 | SYNC-005: UI design artifacts             | `21b63dc…` | 2026-05-06 | Docs/design sync                  |
| #66 | SPRINT-003A: Synthesis MVP                | `d830e6e…` | 2026-05-06 | Smoked + merged                   |
| #65 | SPRINT-002D: errored + soft cost cap      | `bf02185…` | 2026-05-06 | Smoked + merged                   |
| #63 | SYNC-001: post PR #60 docs sync           | `e6048db…` | 2026-05-06 | Docs sync                         |
| #62 | AUDIT-001: PR #60 vs design001.6 findings | `9bae49f…` | 2026-05-06 | Audit report                      |
| #61 | SYNC-002: docs management folder          | `683c8b8…` | 2026-05-06 | Planning artifacts                |
| #60 | SPRINT-002C: validation layers 11.1-11.3  | `828e16e…` | 2026-05-06 | Smoked + merged                   |

## Open PRs

- #47 - Record OpenClaw Slack routing blocker (informational, no code).

## Environment Gates

- Non-production project: `aozbgunwhafabfmuwjol`.
- Production project: `fcqporzsihuqtfohqtxs` remains forbidden unless explicitly
  approved under SPRINT-PROD-BLOCK.
- Deploy remains not approved unless explicitly approved.
- OpenClaw/native orchestration remains not approved.
- Cron, 24/7 operation, auto-merge, and auto-deploy remain not approved.

## Known Tech Debt

See [TECH_DEBT.md](TECH_DEBT.md).
