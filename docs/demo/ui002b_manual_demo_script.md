# UI-002B Manual Claimant Flow Demo Script

## Purpose

Use this script for an insurer-facing walkthrough of the UI-002B manual
claimant response flow. UI-002C notifications are deferred: there is no email,
SMS, WhatsApp, Resend, or Twilio automation in this demo.

Manual link sharing is the intentional MVP workflow. The adjuster receives the
claimant magic link from Spectix and shares it outside the system.

## Operator Flow

1. Open the adjuster dashboard and choose the prepared demo claim.
2. Open the claim detail page and review the generated clarification questions.
3. Select the relevant questions and dispatch them.
4. Copy the generated magic link from the read-only field. If browser clipboard
   permission fails, select the visible link field and copy it manually.
5. Open the claimant link in a claimant-facing browser tab at `/c/[claim_id]`.
6. Complete the claimant form:
   - answer one text question;
   - confirm one yes/no question;
   - correct one detail;
   - upload one response document.
7. Submit/finalize the responses.
8. Return to the adjuster claim page after recycle completes and review the
   updated claim, response count, document processing result, and follow-up
   status.

## Demo Notes

- No email automation is active.
- No SMS automation is active.
- Manual link sharing is expected and should be presented as the current MVP
  operating model.
- Do not show raw tokens, full magic links, browser address bars containing
  tokens, terminal logs, or database rows containing token hashes in screenshots
  or recordings.
- Use a private/incognito claimant tab if the audience needs to see a clean
  claimant session.

## Ideal Fixture Characteristics

- One text question.
- One confirmation question.
- One correction question.
- One document question.
- The uploaded document should be small and non-sensitive.
- Post-recycle should produce a clean or easily explainable status. Avoid demo
  fixtures that repeatedly generate confusing follow-up loops unless the loop is
  the product behavior being demonstrated.

## Safety Boundaries

- Do not create production data.
- Do not mutate Supabase during demo preparation unless a later gate explicitly
  approves non-production fixture setup.
- Do not deploy during the demo.
- Do not configure Resend, Twilio, DNS, or Vercel environment variables.
