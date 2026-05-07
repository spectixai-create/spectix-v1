# Real-Case Tuning Round 1 / Pilot-Readiness Validation Plan

**Date:** 2026-05-07

**Status:** Planning only. Execution is not approved by this document.

**Applies after:** UI-002 cluster completion.

**Environment:** non-production only.

---

## Objective

Prepare Spectix for the first real-case / pilot-readiness validation round after
UI-002 completion.

This round should validate practical case handling, the claimant response loop,
the Resend email path, manual magic-link fallback, evidence quality, and demo
readiness using non-production only.

No production use is approved.

## Inputs Allowed

Allowed inputs:

- Synthetic travel insurance claims.
- Sanitized real-like claims.
- Real insurer examples only if stripped of PII and explicitly approved later.

Forbidden inputs for docs, logs, screenshots, reports, or chat:

- Raw passports.
- Raw medical documents.
- Raw flight documents.
- Claimant emails, except masked safe test-recipient evidence.
- Full magic links.
- Raw tokens.
- Token hashes.
- Secrets or credentials.
- Document contents containing PII.

## Case Archetypes

Prepare 5-8 non-production cases from these archetypes:

| #   | Archetype                                     | Purpose                                                                 |
| --- | --------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | Clean straightforward travel claim            | Establish baseline happy path from intake to brief.                     |
| 2   | Missing document claim                        | Validate missing-info findings and claimant question relevance.         |
| 3   | Contradictory dates claim                     | Validate cross-document date mismatch detection.                        |
| 4   | Currency mismatch claim                       | Validate currency normalization and understandable findings.            |
| 5   | Name mismatch claim                           | Validate claimant/document identity mismatch handling.                  |
| 6   | Claimant response needed with email available | Validate Resend email path plus preserved manual fallback.              |
| 7   | Claimant response needed with no email        | Validate manual fallback when automation cannot run.                    |
| 8   | Low-confidence / escalation candidate         | Validate escalation-oriented brief language and pilot readiness limits. |

## Success Criteria

Each execution report should mark these criteria PASS, FAIL, or NOT RUN:

| Area               | Criteria                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| Intake             | Intake and upload flow is stable for the prepared cases.                                       |
| Extraction         | Classification and extraction produce usable structured output.                                |
| Validation         | Validation findings are understandable to an adjuster.                                         |
| Brief              | Adjuster brief is readable, concise, and actionable.                                           |
| Questions          | Claimant questions are relevant to the missing or contradictory information.                   |
| Email path         | Email notification path works when claimant email exists.                                      |
| Manual fallback    | Manual fallback works when email is missing or clipboard copy is blocked.                      |
| Webhook security   | Resend invalid webhook signature still rejects with HTTP 400.                                  |
| Audit safety       | Audit does not leak `token_hash`, raw token, full magic link, answer text, or response values. |
| Environment safety | Production Supabase is not touched.                                                            |
| Secret safety      | Secrets are not printed.                                                                       |

## Evidence To Collect

Collect non-secret evidence only:

- Claim IDs.
- Question IDs.
- Document IDs.
- Counts.
- PASS/FAIL tables.
- Processing pass statuses.
- Notification status facts.
- Masked safe test-recipient email only when needed.
- Sanitized error categories.

Do not collect or print:

- Full magic links.
- Raw tokens.
- Token hashes.
- Secrets.
- JWTs.
- Auth headers.
- Claimant answer content.
- Email body content.
- Document contents containing PII.

## Explicit Execution Gates

Future CEO approval is required before any of the following:

- Creating non-production fixtures.
- Running smoke.
- Sending a test email.
- Using any real or sanitized insurer file.
- Mutating Supabase.
- Changing Vercel environment variables.
- Deploying.
- Production use.

This planning PR does not approve any of those actions.

## Future Execution Report Format

The future execution report should include:

```markdown
# Real-Case Tuning Round 1 Report

## 1. Preflight

- Main HEAD:
- Environment:
- Non-prod Supabase project:
- Production touched:

## 2. Case Matrix

| Case | Archetype | Claim ID | Result | Evidence |
| ---- | --------- | -------- | ------ | -------- |

## 3. Validation Matrix

| Area                      | Result            | Evidence |
| ------------------------- | ----------------- | -------- |
| Intake/upload             | PASS/FAIL/NOT RUN | ...      |
| Classification/extraction | PASS/FAIL/NOT RUN | ...      |
| Validation findings       | PASS/FAIL/NOT RUN | ...      |
| Adjuster brief            | PASS/FAIL/NOT RUN | ...      |
| Claimant questions        | PASS/FAIL/NOT RUN | ...      |
| Email path                | PASS/FAIL/NOT RUN | ...      |
| Manual fallback           | PASS/FAIL/NOT RUN | ...      |
| Webhook invalid signature | PASS/FAIL/NOT RUN | ...      |
| Audit leakage scan        | PASS/FAIL/NOT RUN | ...      |

## 4. Failures

- ...

## 5. Fixes Needed

- ...

## 6. Pilot-Readiness Verdict

READY / READY WITH NOTES / NOT READY

## 7. Safety Checklist

- Production Supabase touched:
- Production deploy run:
- Smoke approved before run:
- Secrets printed:
- Raw tokens printed:
- Full magic links printed:
- Real claimant data used:
```

## Current Boundaries

- Production Supabase `fcqporzsihuqtfohqtxs` remains forbidden.
- Non-production Supabase `aozbgunwhafabfmuwjol` may be used only after a
  future explicit execution gate.
- SMS, WhatsApp, Twilio, and OpenClaw are not approved current scope.
- Real-case tuning execution is not started by this planning document.

## Next Step

CEO GPT should review this plan and decide whether to approve a separate
execution gate for Real-case tuning round 1.
