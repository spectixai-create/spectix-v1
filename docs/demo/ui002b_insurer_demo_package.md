# UI-002B Insurer Demo Package

## Purpose

Run a 7-10 minute insurer-facing demo of the Spectix UI-002B manual claimant
response flow.

## Demo Positioning

- Spectix does not decide claims.
- Spectix prepares an adjuster brief and manages the missing-information loop.
- UI-002B shows the claimant response flow without automated notifications.
- Today the adjuster shares the link manually.
- Email automation is a small follow-up sprint and is not required for the
  pilot demo.

## Demo Flow

1. Open the adjuster dashboard.
2. Open a prepared non-production demo claim.
3. Show findings and clarification questions.
4. Dispatch questions.
5. Copy the manual magic link from the visible link field.
6. Open the claimant page at `/c/[claim_id]`.
7. Answer the text, confirmation, and correction questions.
8. Upload one response document.
9. Finalize the claimant responses.
10. Show recycle/pass updates in the adjuster view.
11. Show the audit trail and emphasize privacy-safe event metadata.

## What Not To Show

- Raw tokens.
- Token hashes.
- Secrets.
- Database credentials.
- Production data.
- Browser URL with full token if recording.

## Narrative

Use this framing:

> Today the adjuster shares the link manually. The claimant completes missing
> information in a focused page, uploads a document if needed, and Spectix
> re-runs the brief pipeline so the adjuster sees the updated status.

Use this clarification if notifications come up:

> Email automation is a small follow-up sprint and is not required for the
> pilot demo. The current MVP proves the missing-information loop first.

## Known Limits

- No automated email yet.
- No SMS.
- No WhatsApp automation.
- Synthetic demo data only.
- Post-recycle status may still request follow-up if the fixture intentionally
  leaves gaps.

## Demo Success Criteria

- Prospect understands that Spectix assists adjusters and does not auto-decide
  claims.
- Prospect sees the missing-info loop end to end.
- Prospect confirms whether manual link sharing is acceptable for pilot.
- Prospect identifies current pain around missing documents/clarifications.
- Prospect names the buyer or pilot approver.
- Prospect states what is needed for an LOI or pilot approval.
