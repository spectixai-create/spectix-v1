# TASK-SPECTIX-001 Smoke Readiness Packet

## 1. Purpose

This packet prepares the broad extraction smoke execution path for
`TASK-SPECTIX-001`. It does not approve execution, create a claim, upload
documents, mutate production data, or run the smoke.

The packet combines the claim creation method, synthetic document manifest,
execution stages, verification queries, safety gates, rollback notes, and a
Codex prompt that must not be run until CEO fills every required approval field.

## 2. Environment Gate

CEO must explicitly fill:

```text
APPROVED_HOST:
ENVIRONMENT_TYPE: production / preview / staging / local
SUPABASE_PROJECT_CONFIRMED: yes/no
DATA_MUTATION_APPROVED: yes/no
```

If `ENVIRONMENT_TYPE` is `production`, or if the Supabase target behind
`APPROVED_HOST` is production, this is production mutation. Claim creation will
insert a `claims` row and a `claim_created` audit row. Document upload will
create Storage objects, `documents` rows, audit rows, and Inngest events.

Execution is blocked unless `SUPABASE_PROJECT_CONFIRMED=yes` and
`DATA_MUTATION_APPROVED=yes`.

## 3. Claim Creation Method

Supported method:

```text
POST <APPROVED_HOST>/api/claims
```

Payload:

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

Record after successful response:

```text
SMOKE_CLAIM_ID = response.data.claim.id
```

If the actual client/tool returns a wrapped object, inspect the response and
record the equivalent path to the claim UUID. Do not continue unless the claim
UUID is present and belongs to the approved environment.

## 4. Synthetic Documents Manifest

Approved local synthetic files:

| Slot                       | File                                     | Expected broad + subtype                           | Expected route   |
| -------------------------- | ---------------------------------------- | -------------------------------------------------- | ---------------- |
| `receipt_general`          | `receipt_general.synthetic.pdf`          | `receipt` + `general_receipt`                      | `receipt`        |
| `police_report`            | `police_report.synthetic.pdf`            | `police_report` + `police_report`                  | `police`         |
| `hotel_letter`             | `hotel_letter.synthetic.pdf`             | `hotel_letter` + `hotel_letter`                    | `hotel_generic`  |
| `medical_visit`            | `medical_visit.synthetic.pdf`            | `medical_report` + `medical_visit`                 | `medical`        |
| `witness_letter`           | `witness_letter.synthetic.pdf`           | `witness_letter` + `witnesses`                     | `hotel_generic`  |
| `flight_booking_or_ticket` | `flight_booking_or_ticket.synthetic.pdf` | `flight_doc` + `flight_booking` or `flight_ticket` | `hotel_generic`  |
| `boarding_pass`            | `boarding_pass.synthetic.pdf`            | `flight_doc` + `boarding_pass`                     | `skip_dedicated` |
| `other_misc`               | `other_misc.synthetic.pdf`               | `other` + nullable subtype                         | `skip_other`     |

Local root:

```text
.openclaw-local/smoke-inputs/TASK-SPECTIX-001/files/
```

The synthetic files are local-only fixtures and must not be committed.

## 5. Execution Stages

Stage A: create smoke claim only.

- Use `POST <APPROVED_HOST>/api/claims`.
- Record `SMOKE_CLAIM_ID = response.data.claim.id`.
- Stop if the claim ID is missing, malformed, or not from the approved target.

Stage B: upload synthetic documents to the smoke claim only.

- Upload only the CEO-approved files from the manifest.
- Use only `SMOKE_CLAIM_ID`.
- Stop on any missing file, upload rejection, claim permission issue, or
  unexpected target.

Stage C: wait for Inngest processing.

- Wait for the existing pipeline to process documents.
- Do not alter Inngest config, cron, 24/7 mode, channels, or deployment
  settings.

Stage D: run verification SQL queries only against `SMOKE_CLAIM_ID`.

- Replace `<SMOKE_CLAIM_ID>` in the approved queries.
- Do not query or mutate unrelated claims except for read-only context needed to
  confirm the approved target.

Stage E: report route-by-route pass/fail.

- Include claim ID, document IDs, routes, `extracted_data`, audit/event
  evidence, stuck/failed documents, and safety deviations.

## 6. Safety Gates

Block execution if any item is missing or false:

- CEO explicit execution approval.
- `APPROVED_HOST`.
- `ENVIRONMENT_TYPE`.
- `SUPABASE_PROJECT_CONFIRMED=yes`.
- `DATA_MUTATION_APPROVED=yes`.
- All 8 synthetic files exist.
- No real customer data.
- No schema/secret/deploy/auth/billing/pricing change required.

## 7. Must-Not-Touch List

- App source code.
- `supabase/migrations`.
- Schema, RLS, or Storage policy changes.
- Secrets/env.
- Deployment settings.
- Auth/billing/pricing.
- OpenClaw cron/24-7.
- Unrelated production records.
- Any claim other than the approved `SMOKE_CLAIM_ID`.

## 8. Verification Queries

Documents and extraction state:

```sql
select
  id,
  file_name,
  document_type,
  document_subtype,
  processing_status,
  extracted_data->>'kind' as extracted_kind,
  extracted_data->>'route' as extraction_route,
  extracted_data ? 'extraction_error' as has_extraction_error
from documents
where claim_id = '<SMOKE_CLAIM_ID>'
order by created_at asc;
```

Route payload guard:

```sql
select id, document_type, document_subtype, extracted_data
from documents
where claim_id = '<SMOKE_CLAIM_ID>'
  and extracted_data->>'kind' = 'extraction'
  and (
    (extracted_data->>'route' = 'receipt' and extracted_data->'data' ? 'items' = false)
    or (extracted_data->>'route' = 'police' and extracted_data->'data' ? 'formatAnalysis' = false)
    or (extracted_data->>'route' = 'hotel_generic' and extracted_data->'data' ? 'redFlags' = false)
    or (extracted_data->>'route' = 'medical' and extracted_data->'data' ? 'anomalies' = false)
  );
```

Audit trail:

```sql
select action, actor_type, actor_id, target_id, details, created_at
from audit_log
where claim_id = '<SMOKE_CLAIM_ID>'
  and action in (
    'claim_created',
    'document_uploaded',
    'document_processing_started',
    'document_processing_completed',
    'document_subtype_classification_completed',
    'document_extraction_completed',
    'document_extraction_deferred',
    'document_extraction_failed'
  )
order by created_at asc;
```

Cost accounting sanity:

```sql
select id, current_pass, total_llm_cost_usd
from claims
where id = '<SMOKE_CLAIM_ID>';
```

Document count sanity:

```sql
select count(*) as smoke_document_count
from documents
where claim_id = '<SMOKE_CLAIM_ID>';
```

## 9. Rollback/Cleanup Note

Do not delete production rows automatically.

If cleanup is needed, first capture smoke evidence, then prepare a separate
CEO-approved cleanup task that names the exact claim, document IDs, Storage
paths, audit rows, and risk. Cleanup must not be bundled into smoke execution.

## 10. Execution Prompt

DO NOT RUN UNTIL CEO FILLS ALL FIELDS.

Required CEO-filled fields:

```text
APPROVED_HOST:
ENVIRONMENT_TYPE:
SUPABASE_PROJECT_CONFIRMED: yes/no
DATA_MUTATION_APPROVED: yes/no
approved: yes/no
approved synthetic files: yes/no
```

Codex execution instructions after approval:

1. Confirm all required CEO fields are present and safe.
2. Confirm all 8 synthetic PDFs exist locally under
   `.openclaw-local/smoke-inputs/TASK-SPECTIX-001/files/`.
3. Create the smoke claim with `POST <APPROVED_HOST>/api/claims` and the
   approved payload.
4. Record `SMOKE_CLAIM_ID = response.data.claim.id`.
5. Stop if claim creation fails, returns no UUID, or targets the wrong
   environment.
6. Upload only the approved synthetic documents to `SMOKE_CLAIM_ID`.
7. Wait for processing through the existing Inngest pipeline.
8. Run the verification SQL queries using only `SMOKE_CLAIM_ID`.
9. Report route-by-route pass/fail, claim ID, document IDs, `extracted_data`
   findings, audit/event findings, stuck/failed documents, and safety
   deviations.
10. Stop immediately on any safety deviation, missing permission, unexpected
    claim, unexpected file, schema/secret/deploy/auth/billing/pricing need, or
    unrelated production mutation.
