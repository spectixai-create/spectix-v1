# Current State

Updated by Codex after PR #73 / SYNC-007 post-PR72 state sync merge.

## Version

Spectix post PR #73 / SYNC-007 • 2026-05-07

## Current Phase

The non-production MVP pipeline now covers intake, document upload,
classification, normalized extraction, validation, deterministic synthesis, the
adjuster-facing brief view, and the core claimant response flow without
external notifications.

Current `main` HEAD is
`1252ade89ddc7124d0745d2bc97f3e599ae16855`, the squash merge commit for PR
#73 (`SYNC-007: Record post-PR72 UI-002B state`).

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
- SPRINT-UI-002A - Claimant responses pre-flight in PR #70.
- SPRINT-UI-002B - Claimant responses core flow in PR #72.
- SYNC-007 - Post-PR72 UI-002B state sync in PR #73.

## Current Sprint Status

**SYNC-007 - Post-PR72 UI-002B State Sync** - DONE

- Merged: PR #73 -> `main`
- Merge method: squash
- Merge commit / current main HEAD:
  `1252ade89ddc7124d0745d2bc97f3e599ae16855`
- Scope: docs-only post-PR72 state sync
- Production Supabase touched: no
- Deploy run by Codex: no
- Smoke run by Codex: no
- UI-002C started: no

**SPRINT-UI-002B - Claimant Responses Core Flow** - DONE

- Merged: PR #72 -> `main`
- Merge method: squash
- Merge commit / current main HEAD:
  `ebdb75c71ff340a3e5366672521bb74b83263d59`
- PR head before merge: `07d02725da51f586e6e10fb685f5b5b5a2b72bbd`
- Base before merge: `62f6b05453ab9a8cb1b2dc533f21f09355eaa6c6`
- Final-head validation: PASS
- Tests: PASS, 23 files / 356 tests
- Non-production final-head verification: PASS on `aozbgunwhafabfmuwjol`
  only
- Production Supabase touched: no
- Deploy run by Codex: no
- Notifications sent: no
- Resend/Twilio added: no
- UI-002C started: no

Scope shipped:

- Claimant magic links.
- Draft responses and finalized question responses.
- Document-to-question linking via `documents.response_to_question_id`.
- Claimant public RTL page at `/c/[claim_id]`.
- Claimant draft, upload, and finalize APIs.
- Adjuster dispatch and regenerate-link endpoints returning a manual-share URL.
- Dispatch badges, copy-link support, and no-contact manual-share state.
- Claimant response recycle Path A: no documents -> validation requested.
- Claimant response recycle Path B: documents present -> document fan-out,
  extraction, validation, synthesis.
- D-029 registered in [DECISIONS.md](DECISIONS.md).

Final-head fix-forward recorded:

- `finalize_question_responses` now requires `claims.status = pending_info`
  before inserting responses, deleting drafts, marking tokens used, auditing
  submission, or allowing recycle event emission.
- Claimant link opens audit `claimant_link_opened`.
- Rejected claimant token RPC attempts audit `claimant_token_invalid`.
- Audit details are privacy-safe and do not include tokens, magic links, answer
  text, file contents, or response payloads.

**SPRINT-UI-002C - Notifications** - NOT APPROVED FOR IMPLEMENTATION

UI-002C is the next candidate sprint but remains gated for planning/dispatch
readiness only. Notifications are still not implemented, and UI-002C
implementation is not approved.

## Active Gates

See [ACTIVE_GATES.md](agents/workflow/ACTIVE_GATES.md).

Immediate next gate after SYNC-008 remains UI-002C notification sprint
planning/dispatch readiness only, not automatic implementation. UI-002C may
proceed only after:

1. vov confirms non-production Resend account readiness.
2. vov confirms Twilio Israel number readiness.
3. Notification environment readiness is confirmed for non-production.
4. CEO GPT approves UI-002C dispatch.

If the user reports the first signed LOI from an Israeli travel insurer, the
next gate becomes SPRINT-PROD-BLOCK rather than UI-002C by default.

## Customer Discovery Track

- Target: 5 conversations with Israeli travel insurers.
- Trigger to SPRINT-PROD-BLOCK: first signed LOI.
- Production Supabase remains forbidden unless SPRINT-PROD-BLOCK is explicitly
  approved.

## Recent Merges

| PR  | Title                                      | Merge SHA  | Date       | Notes                             |
| --- | ------------------------------------------ | ---------- | ---------- | --------------------------------- |
| #73 | SYNC-007: Record post-PR72 UI-002B state   | `1252ade…` | 2026-05-07 | Docs/state sync                   |
| #72 | UI-002B: claimant responses core flow      | `ebdb75c…` | 2026-05-07 | Final-head verified + merged      |
| #71 | DOCS: Add UI-002B core implementation spec | `62f6b05…` | 2026-05-07 | Docs/spec ingestion               |
| #70 | UI-002A: claimant responses pre-flight     | `760e97d…` | 2026-05-07 | Docs + checks only                |
| #69 | SYNC-006: Record post-PR68 UI state        | `004ff93…` | 2026-05-06 | Docs/state sync                   |
| #68 | SPRINT-UI-001: Adjuster brief view MVP     | `51d6dee…` | 2026-05-06 | Smoked + merged after fix-forward |
| #67 | SYNC-005: UI design artifacts              | `21b63dc…` | 2026-05-06 | Docs/design sync                  |
| #66 | SPRINT-003A: Synthesis MVP                 | `d830e6e…` | 2026-05-06 | Smoked + merged                   |
| #65 | SPRINT-002D: errored + soft cost cap       | `bf02185…` | 2026-05-06 | Smoked + merged                   |
| #63 | SYNC-001: post PR #60 docs sync            | `e6048db…` | 2026-05-06 | Docs sync                         |
| #62 | AUDIT-001: PR #60 vs design001.6 findings  | `9bae49f…` | 2026-05-06 | Audit report                      |
| #61 | SYNC-002: docs management folder           | `683c8b8…` | 2026-05-06 | Planning artifacts                |
| #60 | SPRINT-002C: validation layers 11.1-11.3   | `828e16e…` | 2026-05-06 | Smoked + merged                   |

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
