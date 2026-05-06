# SPRINT-002B Status

## Sprint

SPRINT-002B - Priority Subtype Extraction Routes

## Goal

Implement seven specialized normalized extraction routes while preserving broad fallback compatibility.

## Final PR State

- PR: #52 - SPRINT-002B Priority Subtype Extraction Routes
- Branch retained for 24h after merge: `sprint/subtype-extraction-routes`
- Smoke-tested SHA: `86bec004dcb02cc830b1c32ff7dfdf7ea4dffee4`
- Merge-candidate SHA: `f2a7fc08f7846ffbfe13ddef9cc2e7bd9adf3085`
- Delta from smoke-tested SHA to merge-candidate SHA: docs-only `docs/TECH_DEBT.md` baseline update
- Merge commit: `754c87fbba2d7dec11364e4ca54d2cf54bc6f86a`
- Status: merged to `main`

## Implemented Scope

- Seven MVP normalized routes:
  - `receipt_general`
  - `police_report`
  - `medical_visit`
  - `hotel_letter`
  - `flight_booking_or_ticket`
  - `boarding_pass`
  - `witness_letter`
- Explicit DB subtype to normalized route mapping, including:
  - `general_receipt -> receipt_general`
  - `flight_booking / flight_ticket -> flight_booking_or_ticket`
  - `witnesses -> witness_letter`
- Non-MVP subtypes preserve `fallback_broad` compatibility through legacy `routeBySubtype`.

## First Smoke Attempt

- Target: `aozbgunwhafabfmuwjol`
- Claim: `SMOKE-002B-20260505052715`
- Claim ID: `3867878a-40b9-42dc-82c7-feb4ccc13833`
- Result: failed
- Product findings:
  - `police_report` fell back to legacy extraction because `report_or_filing_date` was missing.
  - `boarding_pass` failed because `flight_date` was missing.
  - Pass stayed `in_progress` after terminal document failure.

## Codex Fix Summary

- `police_report` prompt/date alias normalization fixed.
- `boarding_pass` prompt/date alias normalization fixed.
- No contract loosening.
- `lib/extraction-contracts.ts` unchanged in the fix.
- Terminal failure/defer race paths now call the SPRINT-001 finalizer.
- Validation passed before smoke retry.
- Fix head: `86bec004dcb02cc830b1c32ff7dfdf7ea4dffee4`

## Smoke Retry Attempts

1. Attempt 1, head `18cabf1a`: reached product code and failed on `police_report`, `boarding_pass`, and pass lifecycle.
2. Attempt 2: stopped at preflight because `supabase/.temp/project-ref` pointed to forbidden production project `fcqporzsihuqtfohqtxs`. No smoke mutation.
3. Attempt 3: stopped before smoke because `claim_form.synthetic.pdf` was missing. CEO later authorized `other_misc.synthetic.pdf` as the broad=other B2 control fixture.
4. Attempt 4, head `86bec004`: created claim `SMOKE-002B-RETRY-20260505200822` and uploaded nine documents, but local Inngest registration failed. `process-document` never ran and all documents stayed `pending`. Root cause was local `INNGEST_BASE_URL` misconfiguration.
5. Attempt 5, head `86bec004`: passed after removing the local-only `INNGEST_BASE_URL` line, verifying `/api/inngest` registration, creating claim `SMOKE-002B-005-20260505185743`, and processing all nine documents.

## SMOKE-002B-RETRY-005 Result

- Claim ID: `9222197e-2760-4c10-8b71-501a2aeb4158`
- Result: pass
- Documents: 9/9 expected outcomes passed
- MVP normalized routes: 7/7 passed
- B1 fallback broad: `pharmacy_receipt -> fallback_broad -> receipt` passed
- B2 skip/defer: `other_misc.synthetic.pdf -> fallback_broad -> skip_other` passed; classifier returned non-MVP subtype `damage_report`, which is acceptable for this broad=other control fixture.
- Pass status: `completed`
- `claims.total_llm_cost_usd`: `0.231822`
- `passes.llm_calls_made`: `23`
- Processing baseline recorded in `docs/TECH_DEBT.md` item 11n: p50=39877ms, p95=49224ms

## Post-Merge Queue

MERGE-PR52-001 must be completed before SPRINT-003A starts:

1. Add ANTI-PATTERN #8.
2. Sync this status file through smoke attempt 5 and merge.
3. Produce the SMOKE-002B-RETRY-005 LLM call breakdown from non-prod audit logs.
4. Investigate whether `INNGEST_BASE_URL` misconfiguration is propagated by onboarding docs/scripts.

## Current Gate

SPRINT-002B is merged. SPRINT-003A is blocked until the post-merge queue above is completed and merged.
