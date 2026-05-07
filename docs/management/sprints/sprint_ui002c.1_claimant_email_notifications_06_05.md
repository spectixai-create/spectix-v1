# SPRINT-UI-002C — Claimant Email Notifications (Email-only, gated)

Date: 06/05/2026
Identifier: sprint_ui002c.1
Status: Spec ready. Implementation paused/deferred.
Predecessor: SPRINT-UI-002B claimant responses core flow.

## Status

UI-002C must not start automatically.

This sprint is a future notification sprint for claimant response links. It is
deferred until the readiness gate below is complete and CEO GPT explicitly
approves dispatch.

The current MVP flow remains manual fallback: the adjuster copies the
`magic_link_url` from the UI-002B dispatch/regenerate-link response and shares
it manually with the claimant outside the system.

## Decision

UI-002C is email-only via Resend.

Out of MVP scope:

- Twilio.
- SMS fallback.
- WhatsApp automation.
- Multi-provider fallback.
- Late bounce SMS retry.

## Readiness Gate

UI-002C is not dispatched until all items are complete:

1. Resend account exists.
2. `spectix.co.il` domain is registered.
3. DKIM/SPF/DMARC are configured and Resend domain verification passes.
4. Resend webhook secret is generated and configured.
5. Vercel non-production env readiness is verified for:
   - `RESEND_API_KEY`
   - `RESEND_WEBHOOK_SECRET`
   - `APP_BASE_URL`
6. CEO GPT approves UI-002C dispatch.

Readiness verification must not print secrets.

## Scope In (Gated)

These files and behaviors are implementation scope only after the readiness gate
is complete:

- `lib/claimant/notifications.ts` - Resend client wrapper and Hebrew RTL email
  template.
- `app/api/webhooks/resend/route.ts` - Resend webhook endpoint with signature
  verification and notification metadata update.
- `inngest/functions/claimant-notify.ts` - email-only notification function.
- Dispatch endpoint fires an Inngest event only when `claimant_email` exists.
- `question_dispatches.notification_*` columns are populated for email send,
  delivery, bounce, and complaint status.
- `instrumentation.ts` validates Resend envs in production.
- Email-only tests cover send path, no-email path, webhook signature failure,
  bounce/complaint handling, and no SMS fallback.

## Scope Out

- Twilio.
- SMS.
- WhatsApp.
- Multi-provider failover.
- Late bounce SMS retry.
- Production deployment.
- Production Supabase.
- Any notification provider send before explicit UI-002C approval.

## Implementation Notes

- Dispatch response still returns `magic_link_url`; manual fallback remains
  available even after email automation exists.
- If `claimant_email` is missing, no notification event is fired and the
  adjuster shares the link manually.
- Email template must be Hebrew and RTL.
- Resend tags should include correlation metadata sufficient for webhook
  handling without exposing raw tokens or magic links.
- Webhook/audit updates must not store email body, claimant answers, raw token,
  token hash, or full magic link.

## Estimate

Approximately 3 days after readiness is complete.

## Done Criteria

- Readiness checklist is complete.
- CEO GPT approval is recorded before dispatch.
- D-030 remains the governing notification decision.
- Email send path works for claims with `claimant_email`.
- No-email claims stay on manual link sharing.
- Webhook signature verification rejects invalid requests.
- Bounce/complaint webhook updates notification error metadata.
- Production boot fails if required Resend envs are missing.
- Production boot fails if notification-skip bypass is configured contrary to
  production safety policy.
- Tests pass for email-only behavior.
- No Twilio, SMS, WhatsApp, or multi-provider fallback code is added.
- Manual UI-002B copy-link flow remains available.

## Next

Do not start UI-002C automatically. Continue insurer demo/customer discovery
unless a future gate explicitly approves readiness completion and dispatch.
