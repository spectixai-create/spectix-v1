# TASK-SPECTIX-001 Execution Approval Template

Use this template only when CEO is ready to approve or deny the broad extraction
smoke execution. Completing this template does not change app code, DB schema,
secrets, env, deployment settings, auth, billing, pricing, OpenClaw cron/24-7,
or production data by itself.

## 1. Smoke Task ID

`TASK-SPECTIX-001`

## 2. Required CEO Approval Fields

Approved:

```text
approved: yes/no
```

Approved smoke claim:

```text
SMOKE_CLAIM_ID:
```

Approved document files:

```text
- receipt_general.synthetic.pdf:
- police_report.synthetic.pdf:
- hotel_letter.synthetic.pdf:
- medical_visit.synthetic.pdf:
- witness_letter.synthetic.pdf:
- flight_booking_or_ticket.synthetic.pdf:
- boarding_pass.synthetic.pdf:
- other_misc.synthetic.pdf:
```

## 3. Explicit Restrictions

- No app code changes.
- No DB schema changes.
- No secrets/env/deploy/auth/billing/pricing changes.
- No unrelated production data mutation.
- Use only the approved smoke claim and approved synthetic files.
- Stop on any missing claim/document/upload permission.
- No OpenClaw cron/24-7.
- No merge or deploy.
- No real customer, personal, medical, travel, passport, bank, or payment data.

## 4. Claim Creation Approval

Approved host:

```text
APPROVED_HOST:
```

Environment type:

```text
ENVIRONMENT_TYPE: production / preview / staging / local
```

Supabase target confirmed:

```text
SUPABASE_PROJECT_CONFIRMED: yes/no
```

Production data mutation approved:

```text
DATA_MUTATION_APPROVED: yes/no
```

Claim creation payload:

```json
{
  "claimantName": "TASK-SPECTIX-001 Smoke Tester",
  "insuredName": "TASK-SPECTIX-001 Smoke Tester",
  "claimantEmail": "task-spectix-001-smoke@example.test",
  "claimantPhone": "0500000000",
  "policyNumber": "SMOKE-TASK-SPECTIX-001",
  "claimType": "theft",
  "incidentDate": "2026-05-01",
  "incidentLocation": "Synthetic Smoke Test Location",
  "amountClaimed": 5000,
  "currency": "ILS",
  "summary": "Synthetic broad extraction smoke claim for TASK-SPECTIX-001. No real customer data.",
  "metadata": {
    "tripPurpose": "tourism",
    "country": "Synthetic Country",
    "city": "Synthetic City"
  }
}
```

Expected created records:

- One `claims` row.
- One `audit_log` row with `action = 'claim_created'`.

Important implementation note:

- `POST /api/claims` currently has no idempotency key and no rate limiting.
  Re-running claim creation can create duplicate smoke claims. Stop after the
  first successful claim response and record `response.data.claim.id` as
  `SMOKE_CLAIM_ID`.

## 5. Execution Command Block Placeholder

Do not run until CEO fills this section.

```text
Execution approval:
approved: yes/no
APPROVED_HOST:
ENVIRONMENT_TYPE:
SUPABASE_PROJECT_CONFIRMED: yes/no
DATA_MUTATION_APPROVED: yes/no
SMOKE_CLAIM_ID:
approved files:
  receipt_general:
  police_report:
  hotel_letter:
  medical_visit:
  witness_letter:
  flight_booking_or_ticket:
  boarding_pass:
  other_misc:
execution notes:
```

## 6. Post-Run Report Requirements

After a separately approved execution task, Codex must report:

- Route-by-route pass/fail.
- Claim ID.
- Document IDs.
- `extracted_data` findings.
- Audit/event findings.
- Stuck/failed documents.
- Safety deviations.
- Confirmation that no app code, DB schema, secrets/env/deploy/auth/billing,
  pricing, OpenClaw cron/24-7, unrelated production data, merge, or deploy
  action was touched.
