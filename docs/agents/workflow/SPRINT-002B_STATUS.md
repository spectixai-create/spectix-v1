# SPRINT-002B Status

## Sprint

SPRINT-002B - Priority Subtype Extraction Routes

## Goal

Implement seven specialized normalized extraction routes while preserving broad fallback compatibility.

## PR

- PR #52
- Branch: `sprint/subtype-extraction-routes`
- Latest known head SHA: `86bec004dcb02cc830b1c32ff7dfdf7ea4dffee4`
- Old failed smoke head: `18cabf1a231934b9adaf12aceea9421b268f7525`
- Latest fix head from Codex report: `86bec004dcb02cc830b1c32ff7dfdf7ea4dffee4`
- Current note: latest fix head is still current as of this handoff package.

## First Smoke Attempt

Target:

`aozbgunwhafabfmuwjol`

Fresh claim:

`SMOKE-002B-20260505052715`

Claim ID:

`3867878a-40b9-42dc-82c7-feb4ccc13833`

Result:

failed

Passed:

- `receipt_general`
- `medical_visit`
- `hotel_letter`
- `flight_booking_or_ticket`
- `witness_letter`
- B1 fallback broad
- B2 skip/defer

Failed:

1. `police_report`
   - Expected normalized `police_report`.
   - Actual fallback legacy extraction / `police`.
   - Cause: missing `report_or_filing_date`.
2. `boarding_pass`
   - Expected normalized `boarding_pass`.
   - Actual document failed.
   - Cause: missing `flight_date`.
3. Pass lifecycle
   - Pass stayed `in_progress` even though one document failed.
   - Suspected missing finalizer call in terminal failure path.

## Codex Fix Summary

Recorded from latest Codex report:

- `police_report` prompt/date alias normalization fixed.
- `boarding_pass` prompt/date alias normalization fixed.
- No contract loosening.
- `lib/extraction-contracts.ts` unchanged.
- Terminal failure/defer race paths now call SPRINT-001 finalizer.
- Tests updated.
- Validation passed.
- No smoke rerun.
- New head SHA: `86bec004dcb02cc830b1c32ff7dfdf7ea4dffee4`

## Current Required Next Step

CEO must decide whether to approve a fresh non-prod smoke retry on the updated PR #52 head.

## Current Smoke Retry Requirements

- Fresh claim required.
- 9 documents:
  - 7 MVP normalized routes.
  - 1 B1 fallback broad extractor.
  - 1 B2 skip/defer fallback.
- Target only: `aozbgunwhafabfmuwjol`
- Production forbidden: `fcqporzsihuqtfohqtxs`
- Update TECH_DEBT 11n only if smoke passes.
- Do not merge after smoke; return report for CEO merge decision.

## Do Not Do

- Do not rerun smoke on old head.
- Do not merge.
- Do not touch production.
- Do not weaken contracts.
- Do not update TECH_DEBT baseline after failed smoke.
- Do not delete smoke evidence.
