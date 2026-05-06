# UI-002A Pre-Flight Decision Report

Date: 2026-05-06

Branch: `sprint/ui-002a-claimant-responses-preflight`

Mode: docs-only plus read-only checks

Production project touched: no

## Executive Verdict

SPLIT

## Findings by Check

### Check A - Contact Columns

Artifact:

- `docs/management/verifications/preflight_a_contact_columns.md`

Result: FAIL

Findings:

- `claimant_email`, `claimant_phone`, `claimant_name`, and `claim_number` columns exist on `public.claims`.
- 25 of 28 non-prod claims have missing email.
- 25 of 28 non-prod claims have missing phone.
- 25 of 28 non-prod claims have both email and phone missing.

Impact:

- Notification dispatch cannot assume historical claims have usable contact details.
- UI-002B must include contact eligibility checks and empty-string normalization.

### Check B - Empty-String Sweep

Artifact:

- `docs/management/verifications/preflight_b_empty_string_sweep.md`

Result: POLISH-ONLY

Findings:

- No existing dispatch logic reads `claimant_email` or `claimant_phone`.
- Existing reads are schema/type or display/API mapping reads.
- Intake phone accepts empty string and inserts it directly.

Impact:

- UI-002B can define the dispatch-safe normalization pattern without conflicting with an existing dispatch path.
- Intake normalization can be a follow-up polish patch unless UI-002B relies on intake writes directly for notification eligibility.

### Check C - Extraction Handler Subset Capability

Artifact:

- `docs/management/verifications/preflight_c_extraction_handler.md`

Result: needs-patch

Findings:

- `process-document` processes a single `documentId` from the event payload.
- It does not accept `document_ids: uuid[]`.
- It does not process all pending documents for a claim.

Impact:

- If claimant responses must re-trigger extraction for selected replacement documents, UI-002B needs a small event fan-out patch around the existing single-document handler.
- Estimated patch size: 1-2 engineering days including tests and smoke.

### Check D - Pass Lifecycle Documentation

Artifact:

- `docs/architecture/passes_lifecycle.md`

Result: PASS

Findings:

- `reopen_pass_for_document_processing` is documented.
- It reopens non-skipped passes to `in_progress`.
- It preserves existing pass accounting columns.
- It is idempotent for repeated in-progress calls.

Impact:

- UI-002B should reuse this RPC for document re-cycle behavior rather than creating a new pass lifecycle path.
- No exact matching `TECH_DEBT 11S` pass-lifecycle entry was found in current `docs/TECH_DEBT.md`; the existing lowercase `11s` entry refers to broad fallback validation, so it was not modified.

### Check E - Notification Infrastructure

Artifact:

- `docs/management/verifications/preflight_e_notification_infra.md`

Result: vov-action-required

Findings:

- No Resend/Twilio env variable names are present in repo templates or docs.
- Vercel read-only inspection was inaccessible from this environment (`403 Forbidden`).
- No secrets were requested or printed.

Impact:

- Notification dispatch should not proceed until vov confirms non-prod notification env readiness.
- If infra is unavailable, UI-002B should ship core response storage without notification sending.

## Recommended Next Step

Approve UI-002B only as a split sprint:

1. Build core claimant response storage and adjuster request tracking without external email/SMS dispatch.
2. Include contact normalization and no-contact eligibility handling.
3. Include the extraction event fan-out patch only if the approved UI-002B scope requires selected-document re-cycle.
4. Gate actual notification sending behind confirmed non-prod Resend/Twilio infrastructure.

## Estimate Impact

Original `sprint_ui002.1` estimate: 19 days

Updated estimate after pre-flight:

- Core response storage without notifications: 10-12 days.
- Extraction subset/event fan-out patch: +1-2 days if included.
- Notification delivery after infra confirmation: +4-5 days.
- Full original scope with extraction patch and notification infra validation: 21-23 days.

Delta justification:

- Contact columns exist, but data completeness is low.
- Notification infrastructure is not repo-verifiable and requires vov action.
- The extraction handler is single-document capable but not batch/subset-array capable.

## UI-002B Scope Recommendation

core without notifications

If CEO Claude and CEO GPT require end-to-end notification delivery in UI-002B, use:

full sprint_ui002.1 + extraction patch

only after vov confirms notification infrastructure readiness.

## Required Decisions Before UI-002B Implementation

- Decision 1: notification channel.
- Decision 2: claimant auth method.
- Decision 8: re-cycle trigger.
- Infra decision: whether vov confirms non-prod Resend/Twilio readiness before UI-002B starts.
