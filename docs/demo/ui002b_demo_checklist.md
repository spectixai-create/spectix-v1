# UI-002B Demo Checklist

## Pre-Demo Setup

- Confirm demo uses non-production only.
- Confirm no real claimant data appears in the fixture.
- Confirm the prepared claim has:
  - one text question;
  - one confirmation question;
  - one correction question;
  - one document question.
- Confirm the demo document is small, non-sensitive, and safe to show.
- Confirm browser tabs are ready:
  - adjuster dashboard;
  - claimant page in a separate tab or profile.
- Confirm raw tokens are not visible in recording layouts.
- Confirm no terminal window with secrets or tokens is visible.
- Confirm no deploy or smoke is planned during the demo.

## During-Demo Checklist

- Open adjuster dashboard.
- Open the prepared claim.
- Show findings/questions and explain that Spectix assists the adjuster.
- Dispatch questions.
- Copy the manual magic link.
- If clipboard permission fails, click the link field and copy it manually.
- Open the claimant page.
- Answer the text, confirmation, and correction questions.
- Upload one document.
- Finalize claimant responses.
- Return to adjuster view.
- Show recycle/pass updates.
- Show audit trail with privacy-safe metadata.
- State clearly that automated email/SMS/WhatsApp notifications are not active.

## Post-Demo Notes

- Record who attended.
- Record their monthly travel claim volume.
- Record whether the ₪5,000–₪15,000 range is relevant.
- Record current missing-information workflow.
- Record whether manual link sharing is acceptable for pilot.
- Record required security/procurement steps.
- Record who approves pilot or LOI.
- Record objections and required follow-up.

## Safety Checklist

- Non-prod only.
- No production.
- No secrets.
- No raw token exposure.
- No token hashes.
- No deploy.
- No real claimant data.
- No Supabase mutation unless separately approved.
- No Resend/DNS/Vercel env changes.
- No Twilio, SMS automation, or WhatsApp automation.

## Decision After Demo

- Continue discovery if pain is real but buyer/process is unclear.
- Ask for LOI if pain, buyer, volume, and next step are clear.
- Trigger SPRINT-PROD-BLOCK if LOI is signed.
- Defer if there is no pain, no buyer, or no meaningful claim volume.
