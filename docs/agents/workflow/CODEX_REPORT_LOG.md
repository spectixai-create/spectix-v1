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

## 5. SMOKE-002B-RETRY-005 And PR #52 Merge

- Starting smoke SHA: `86bec004dcb02cc830b1c32ff7dfdf7ea4dffee4`
- Smoke claim: `SMOKE-002B-005-20260505185743`
- Claim ID: `9222197e-2760-4c10-8b71-501a2aeb4158`
- Result: pass, 9/9 documents reached expected terminal outcomes.
- Pass lifecycle: pass 1 completed; no pass remained `in_progress`.
- Cost: `claims.total_llm_cost_usd = 0.231822`; `passes.llm_calls_made = 23`.
- Processing baseline: p50=39877ms, p95=49224ms.
- TECH_DEBT 11n baseline commit: `f2a7fc08f7846ffbfe13ddef9cc2e7bd9adf3085`.
- PR #52 merge commit: `754c87fbba2d7dec11364e4ca54d2cf54bc6f86a`.
- Production untouched; no deploy; no auto-merge/auto-deploy.
