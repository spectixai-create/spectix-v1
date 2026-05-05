# Claude Review Log

This file captures concise review snapshots, not full transcripts.

## 1. OpenClaw / OP Assessment

- Native OpenClaw Slack remains blocked.
- Temporary bridge is useful but is not full automation.
- Repo memory is required because chat memory is not a durable source of truth.

## 2. SPRINT-002B Prompt Review

- Critical `DocumentSubtype` -> normalized route mismatch was identified.
- Required explicit mapping:
  - `general_receipt` -> `receipt_general`
  - `flight_booking` / `flight_ticket` -> `flight_booking_or_ticket`
  - `witnesses` -> `witness_letter`
- `fallback_broad` semantics were clarified.
- Defensive taxonomy checks were required.
- `assertAllNormalizedSubtypesMapped` was required.
- Audit, cost, and prompt-builder improvements were recommended.

## 3. Non-Prod Smoke Prompt Review

- Fresh claim required.
- 9 documents required, not 8.
- B1 fallback broad and B2 skip/defer required.
- Schema readiness required.
- TECH_DEBT 11n baseline update only after successful smoke.
- No manual stuck document transitions.

## 4. Failed Smoke Analysis

- `police_report` should fix extractor/prompt or fixture after inspecting PDF.
- `boarding_pass` should fix extractor/prompt or fixture after inspecting PDF.
- Do not loosen contracts.
- Fallback success for an MVP route is still smoke failure.
- Pass staying `in_progress` after terminal failure likely indicates a `process-document` failure-path bug.
- Required test: terminal failure finalization.

## 5. Current Recommendation

- Fix PR #52 code.
- Do not rerun smoke until head changes.
- After fix, fresh non-prod smoke retry requires CEO approval.
