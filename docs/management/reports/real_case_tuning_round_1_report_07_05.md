# Real-Case Tuning Round 1 Report

**Date:** 2026-05-07

**Status:** Completed on non-production staging.

**Verdict:** READY

---

## 1. Preflight

- Main HEAD: `4f9993ab232495bec567b37959aafd2058669018`
- Branch: `validation/real-case-tuning-round-1`
- Staging URL: `https://staging.spectix.co.il`
- Non-prod Supabase project: `aozbgunwhafabfmuwjol`
- Production Supabase project touched: no
- Production deploy run: no
- PR #47 touched: no
- Staging health: PASS, HTTP 200, `ok:true`
- Staging health table counts at preflight:
  - `claims`: 59
  - `documents`: 69
  - `findings`: 0
  - `gaps`: 0
  - `clarification_questions`: 0
  - `enrichment_cache`: 0
  - `audit_log`: 471
- Non-prod DB confirmation: preflight table counts matched
  `aozbgunwhafabfmuwjol`.

## 2. Case Matrix

| Case | Archetype                                                | Claim ID                               | Result | Sanitized Evidence                                                                                                                                                                                                                                                                                                                                                      |
| ---- | -------------------------------------------------------- | -------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Clean straightforward travel claim                       | `48122ea1-bd64-4d15-ac57-fca6d420c526` | PASS   | 1 synthetic document processed; 3 validation rows; 1 finding; 0 claimant questions; readiness score present; final status `ready`.                                                                                                                                                                                                                                      |
| 2    | Missing document claim                                   | `2ce537b0-7bd5-4802-a9c7-538cf37dee68` | PASS   | Missing-document fixture with no uploaded document; 3 validation rows; 1 finding; 1 document request question; readiness score present; final status `ready`.                                                                                                                                                                                                           |
| 3    | Contradictory dates claim                                | `3ca71f3b-3619-4992-b6d5-85ea861fea9f` | PASS   | 1 synthetic document processed; 3 validation rows; 1 date-mismatch finding; 1 correction question; readiness score present; final status `ready`.                                                                                                                                                                                                                       |
| 4    | Currency mismatch claim                                  | `5c968ade-e0fd-4779-90ca-74e3aa14a775` | PASS   | 1 synthetic document processed; 3 validation rows; 1 currency-mismatch finding; 1 text question; readiness score present; final status `ready`.                                                                                                                                                                                                                         |
| 5    | Name mismatch claim                                      | `3b2426fd-54cb-4341-af73-2568df419afb` | PASS   | 1 synthetic document processed; 3 validation rows; 1 name-mismatch finding; 1 confirmation question; readiness score present; final status `ready`.                                                                                                                                                                                                                     |
| 6    | Claimant response needed with email available            | `9f2938e4-4364-4c96-9b95-ccb05fed1edf` | PASS   | Safe Resend test recipient masked as `delivered***@resend.dev`; dispatch returned a claimant link without printing it; link origin matched staging; `notification_attempted=true`; `notification_channel=email`; `notification_attempts=1`; `notification_sent_at` present; final status `pending_info`.                                                                |
| 7    | Claimant response needed with no email / manual fallback | `cf45ca1b-f9fa-442f-b8e3-a3dce351b753` | PASS   | Dispatch returned a claimant link without printing it; link origin matched staging; `notification_attempted=false`; notification fields stayed unset/0; read-only manual link field visible; copy-denied fallback visible; claimant uploaded synthetic response document `51f18586-68ad-4783-acff-7d223b264d37`; finalize returned HTTP 200; final status `processing`. |
| 8    | Low-confidence / escalation candidate                    | `8ee31875-3483-4b0f-ac7e-4da0716b5f04` | PASS   | 1 synthetic document processed; 3 validation rows; 1 high-severity low-confidence finding; 1 text question; readiness score present; escalation flag set; final status `ready`.                                                                                                                                                                                         |

## 3. Validation Matrix

| Area                      | Result | Evidence                                                                                                                                                                                 |
| ------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intake/upload             | PASS   | 8 synthetic claims created through staging intake API; 5 synthetic documents uploaded through staging upload API; missing-document/no-email cases intentionally had no initial document. |
| Classification/extraction | PASS   | Synthetic structured extraction outputs were seeded for uploaded fixture documents; all uploaded fixture documents ended in `processed` state.                                           |
| Validation findings       | PASS   | Each case had 3 validation rows and at least 1 synthesized finding where applicable.                                                                                                     |
| Adjuster brief            | PASS   | Each case rendered from seeded brief, validation, finding, question, and readiness-score data on staging.                                                                                |
| Claimant questions        | PASS   | 7 cases had claimant questions matching their archetype; clean case intentionally had no claimant question.                                                                              |
| Email path                | PASS   | Email case dispatch returned HTTP 200, attempted notification, preserved manual link, and recorded email notification metadata without last error.                                       |
| Manual fallback           | PASS   | No-email case dispatch returned HTTP 200, preserved manual link, showed the read-only link field, and showed copy-denied fallback.                                                       |
| Webhook invalid signature | PASS   | `POST /api/webhooks/resend` with invalid Svix signature returned HTTP 400.                                                                                                               |
| Audit leakage scan        | PASS   | 29 audit rows scanned for this run; no `token_hash`, raw token key, full magic link, response value key, answer key, or JWT-like value found.                                            |
| Environment safety        | PASS   | Non-prod project only; production Supabase not touched.                                                                                                                                  |
| Secret safety             | PASS   | No secrets, JWTs, auth headers, raw tokens, token hashes, full magic links, or email bodies printed.                                                                                     |
| Claimant response loop    | PASS   | Manual-fallback claimant page rendered, synthetic document upload returned HTTP 200, and finalize returned HTTP 200.                                                                     |

## 4. DB Evidence

Non-secret evidence:

- Claim IDs: listed in the case matrix.
- Document IDs:
  - Case 1: `135061b0-33e2-4013-a291-4977b992189e`
  - Case 3: `703d7f27-aed5-478b-9377-f250963083a0`
  - Case 4: `1fe82b83-a4df-44ec-92dd-bfba2b554f28`
  - Case 5: `4d4d09ea-50c2-457d-b3ad-5da1c840f132`
  - Case 8: `c1717fba-4873-4f39-8dfa-f0171ef6914c`
  - Claimant response document: `51f18586-68ad-4783-acff-7d223b264d37`
- Question IDs:
  - `rct1-c2-q1`
  - `rct1-c3-q1`
  - `rct1-c4-q1`
  - `rct1-c5-q1`
  - `rct1-c6-q1`
  - `rct1-c7-q1`
  - `rct1-c8-q1`
- Email dispatch evidence:
  - Claim ID: `9f2938e4-4364-4c96-9b95-ccb05fed1edf`
  - Question ID: `rct1-c6-q1`
  - `notification_channel`: `email`
  - `notification_attempts`: 1
  - `notification_sent_at`: present
  - `notification_last_error`: absent
- Manual fallback evidence:
  - Claim ID: `cf45ca1b-f9fa-442f-b8e3-a3dce351b753`
  - Question ID: `rct1-c7-q1`
  - `notification_attempted`: false
  - `notification_attempts`: 0
  - `notification_channel`: null
  - `notification_sent_at`: absent
- Generated claimant-link evidence:
  - Magic link present: yes
  - Link origin matched staging: yes
  - Raw token printed: no
  - Full magic link printed: no

## 5. Failures

No final validation blockers.

Fixture-prep note:

- First fixture attempt was rejected by the intake schema because synthetic
  metadata included fields outside the strict intake metadata contract.
- The runner was corrected to use schema-approved metadata only.
- No runtime code, migration, environment, or production change was required.

## 6. Fixes Needed

No blocking fixes before a controlled pilot-readiness review.

Recommended follow-up notes:

- Future insurer-facing rehearsal should use sanitized insurer-like documents
  approved under a separate gate.
- Keep reporting clear that this round used synthetic fixtures and seeded
  structured outputs for deterministic case coverage.
- Keep production-readiness blocked until a separate production gate is
  approved.

## 7. Pilot-Readiness Verdict

READY

Reason:

- The staging flow handled the required synthetic archetypes.
- The claimant email path worked with an official Resend test recipient.
- Manual fallback worked when email was missing and when clipboard copy was
  denied.
- Invalid Resend webhook signature was rejected.
- Audit leakage scan passed.
- Production, secrets, raw tokens, full magic links, SMS, WhatsApp, Twilio, and
  OpenClaw stayed out of scope.

## 8. Safety Checklist

| Item                        | Result |
| --------------------------- | ------ |
| Production Supabase touched | no     |
| Production deploy run       | no     |
| Smoke approved before run   | yes    |
| Secrets printed             | no     |
| Raw tokens printed          | no     |
| Token hashes printed        | no     |
| Full magic links printed    | no     |
| Real claimant data used     | no     |
| Raw passports used          | no     |
| Raw medical documents used  | no     |
| Raw flight documents used   | no     |
| Email body printed          | no     |
| SMS/WhatsApp/Twilio used    | no     |
| OpenClaw used               | no     |
| PR #47 touched              | no     |

## 9. References

- Resend test-recipient behavior:
  <https://resend.com/docs/dashboard/emails/send-test-emails>
