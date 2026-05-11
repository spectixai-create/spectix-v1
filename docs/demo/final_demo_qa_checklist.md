# Final Demo QA Checklist

## Scope

- Use staging/non-production only.
- Use synthetic claimant data only.
- Use demo policy number `16165132165` or another approved synthetic policy
  number.
- Do not start outreach, contact, production smoke, deploy, or production
  Supabase work without separate approval.

## Pre-Demo Checks

- `/new` creates a synthetic theft claim with theft details and stolen items.
- Uploaded demo document is safe, generated, and non-sensitive.
- Policy-derived findings appear for the synthetic policy scenario.
- Claim header shows `סטטוס כיסוי ראשוני`.
- Findings show structured evidence, not raw JSON.
- `בדיקות תיק` and `היסטוריית פעולות` are business-readable by default.
- Processing timeline keeps cost, token, and LLM-call details out of the normal
  view.

## During-Demo Checks

- Explain Spectix as triage and evidence preparation, not an automatic decision
  engine.
- Use only these positioning terms: `סטטוס כיסוי ראשוני`, `דגלי בדיקה`,
  `דורש בדיקת חריגים`, `חוסר מידע`, and `החלטת מומחה`.
- Do not use fraud/automatic-decision language.
- Do not print or display raw tokens, full magic links, cookies, auth headers,
  secrets, or real personal data.

## Stop Conditions

- Any production target appears.
- Any real claimant data appears.
- Any secret, token, or full magic link appears.
- Any automatic approval/rejection language appears.
- Any unexpected email, outreach, or contact action would be triggered.
