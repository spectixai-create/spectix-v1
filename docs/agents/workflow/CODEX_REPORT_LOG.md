# Codex Report Log

This file captures concise report snapshots, not full transcripts.

## 1. PR #52 Implementation Report

- Branch: `sprint/subtype-extraction-routes`
- Initial PR head SHA: `18cabf1a231934b9adaf12aceea9421b268f7525`
- Summary: implemented specialized normalized extractors, explicit DB subtype -> normalized route mapping, broad fallback behavior, process-document integration, tests, and docs.
- Validations passed before initial PR update.
- No smoke run during implementation.

## 2. First Non-Prod Smoke Report

- Target project: `aozbgunwhafabfmuwjol`
- Fresh claim: `SMOKE-002B-20260505052715`
- Claim ID: `3867878a-40b9-42dc-82c7-feb4ccc13833`
- 9-document result: failed.
- 5/7 MVP normalized routes passed.
- `police_report` failed normalized extraction and fell back to legacy `police`.
- `boarding_pass` failed.
- Pass stayed `in_progress`.
- TECH_DEBT 11n was not updated.
- Production was not touched.

## 3. Schema Readiness / Migration Blocker Report

- Initial blocker: non-prod project was missing `finalize_pass_after_document_processing`.
- CEO clarified that DML inside `CREATE OR REPLACE FUNCTION ... AS $$ ... $$` bodies is allowed because it defines RPC behavior and does not execute data mutation during migration apply.
- Non-prod schema readiness later passed after approved readiness work.

## 4. PR #52 Fix Report

- Old head: `18cabf1a231934b9adaf12aceea9421b268f7525`
- New head: `86bec004dcb02cc830b1c32ff7dfdf7ea4dffee4`
- Summary of fixes:
  - `police_report` prompt/date alias normalization fixed.
  - `boarding_pass` prompt/date alias normalization fixed.
  - Terminal failure/defer race paths now call the SPRINT-001 finalizer.
- Contract unchanged: `lib/extraction-contracts.ts` was not modified.
- Fixture inspection:
  - `police_report.synthetic.pdf` had incident date evidence.
  - `boarding_pass.synthetic.pdf` lacked date evidence and was unrealistic for a required `flight_date`.
- Validation passed:
  - `pnpm typecheck`
  - `pnpm lint`
  - `pnpm format:check`
  - `pnpm build`
  - `pnpm test`
- Smoke was not rerun.
- Ready for CEO approval of fresh non-prod smoke retry.

## 5. Attempt 4 Smoke Retry - Local Runtime Failure

- HEAD: `86bec004dcb02cc830b1c32ff7dfdf7ea4dffee4` (correct).
- CLI target: `aozbgunwhafabfmuwjol` (correct).
- Claim created: `SMOKE-002B-RETRY-20260505200822`.
- Claim ID: `5f4da76d-a78b-4883-8157-df9738f4ca9a`.
- 9 documents uploaded and 9 `claim/document.uploaded` events fired.
- Inngest function registration failed: `PUT /api/inngest 500`, `POST /fn/register 404`.
- `process-document` never ran.
- All 9 documents remained `pending`.
- Pass remained `in_progress` because no terminal document state was reached.
- Production was untouched.
