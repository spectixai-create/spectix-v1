# TASK-SPECTIX-001 Retry Plan After Anthropic 401

## Purpose

This document prepares a safe retry plan for the eight TASK-SPECTIX-001
synthetic smoke documents after the first processing attempt failed during
broad classification.

This document does not approve or execute the retry.

## Current Failure Summary

- Smoke claim ID: `443bdef7-1377-4628-9105-c0bed8a55614`
- Non-production Supabase project: `aozbgunwhafabfmuwjol`
- Forbidden production Supabase project: `fcqporzsihuqtfohqtxs`
- Failure category: `llm_call`
- Failure phase: `broad`
- Final document status: all eight documents are `failed`
- Failure reason observed: Anthropic rejected the previous local key with
  `401 invalid x-api-key`
- Production touched: no
- App code changed: no
- DB schema changed: no
- Documents uploaded during retry planning: no
- Processing retried during retry planning: no

## Key Verification Status

The local `.env.local` was checked without printing secret values.

- `NEXT_PUBLIC_SUPABASE_URL` points to `aozbgunwhafabfmuwjol`: yes
- `NEXT_PUBLIC_SUPABASE_URL` contains `fcqporzsihuqtfohqtxs`: no
- `ANTHROPIC_API_KEY` present: yes
- `ANTHROPIC_API_KEY` appears non-placeholder: yes
- Minimal Anthropic auth-only check performed: yes
- Minimal Anthropic auth-only check status: `200`
- Secret value printed: no

The current local Anthropic key is therefore likely usable for a retry.

## Approved Document IDs

Only these eight document IDs may be retried:

| File                                     | Document ID                            |
| ---------------------------------------- | -------------------------------------- |
| `receipt_general.synthetic.pdf`          | `6d7474b5-e8ef-41ec-a7d1-9950273dda76` |
| `police_report.synthetic.pdf`            | `08192a17-9b13-4215-8d2c-043f2579ce2e` |
| `hotel_letter.synthetic.pdf`             | `be331eda-701b-4696-ac9e-233c1d2125fe` |
| `medical_visit.synthetic.pdf`            | `74cba396-4af5-48db-aef6-d58744060d62` |
| `witness_letter.synthetic.pdf`           | `a7cc2c6a-4814-455d-b6c5-cefb7b002fd9` |
| `flight_booking_or_ticket.synthetic.pdf` | `f66adfcf-d0ca-42f8-b79e-084d0cfc07ed` |
| `boarding_pass.synthetic.pdf`            | `df77c95b-8199-4ced-a684-0102c1a83479` |
| `other_misc.synthetic.pdf`               | `25d94dd2-3312-427a-adde-30caee6479f6` |

## Retry Feasibility

Retry is possible, but only after resetting the target documents to
`pending`.

The `process-document` Inngest function begins by updating a document from
`pending` to `processing`:

```ts
.eq('id', documentId)
.eq('processing_status', 'pending')
```

If the same `claim/document.uploaded` event is resent while the documents are
still `failed`, the function skips them as `not_pending`. Therefore, event
resend alone is insufficient.

## Expected Retry Side Effects

The retry should not create new claims or documents. It will mutate the same
eight document rows and may create additional audit/pass evidence.

Expected duplicate or additional rows:

- `document_processing_started`: +8 rows
- `document_processing_completed`: +8 rows if broad classification succeeds
- `document_subtype_classification_completed`: up to +8 rows
- `document_extraction_completed`: rows for extraction routes
- `document_extraction_deferred`: rows for `skip_dedicated` and `skip_other`
- `document_processing_failed`: additional rows only if retry fails again
- `passes`: existing pass row may be incremented; no new pass row is required
  for pass `1`

The previous failure audit rows should remain as historical evidence.

## Required Safety Gates

Do not execute the retry unless all gates are true:

- CEO explicitly approves retry execution.
- `.env.local` points to `aozbgunwhafabfmuwjol`.
- `.env.local` does not point to `fcqporzsihuqtfohqtxs`.
- Anthropic auth-only check returns success.
- All eight approved document IDs still belong to
  `443bdef7-1377-4628-9105-c0bed8a55614`.
- No new files are uploaded.
- No new claim is created.
- Local app runs at `http://localhost:3000`.
- Local Inngest dev runs at `http://localhost:8288`.
- No app code, schema, env, deploy, auth, billing, or pricing changes are
  required.

## Pre-Retry Verification Queries

Run these read-only queries only against project `aozbgunwhafabfmuwjol`.

```sql
select file_name, id, claim_id, processing_status,
       extracted_data->>'failure_category' as failure_category,
       extracted_data->>'failure_phase' as failure_phase
from public.documents
where id in (
  '6d7474b5-e8ef-41ec-a7d1-9950273dda76'::uuid,
  '08192a17-9b13-4215-8d2c-043f2579ce2e'::uuid,
  'be331eda-701b-4696-ac9e-233c1d2125fe'::uuid,
  '74cba396-4af5-48db-aef6-d58744060d62'::uuid,
  'a7cc2c6a-4814-455d-b6c5-cefb7b002fd9'::uuid,
  'f66adfcf-d0ca-42f8-b79e-084d0cfc07ed'::uuid,
  'df77c95b-8199-4ced-a684-0102c1a83479'::uuid,
  '25d94dd2-3312-427a-adde-30caee6479f6'::uuid
)
order by created_at;
```

All rows must have:

- `claim_id = '443bdef7-1377-4628-9105-c0bed8a55614'`
- `processing_status = 'failed'`
- `failure_category = 'llm_call'`
- `failure_phase = 'broad'`

## Approved Reset SQL

Run only after CEO retry approval, and only against project
`aozbgunwhafabfmuwjol`.

This reset clears the previous failure payload from the target document rows
while preserving historical audit evidence.

```sql
begin;

update public.documents
set
  processing_status = 'pending',
  document_type = 'other',
  document_subtype = null,
  extracted_data = null
where claim_id = '443bdef7-1377-4628-9105-c0bed8a55614'::uuid
  and id in (
    '6d7474b5-e8ef-41ec-a7d1-9950273dda76'::uuid,
    '08192a17-9b13-4215-8d2c-043f2579ce2e'::uuid,
    'be331eda-701b-4696-ac9e-233c1d2125fe'::uuid,
    '74cba396-4af5-48db-aef6-d58744060d62'::uuid,
    'a7cc2c6a-4814-455d-b6c5-cefb7b002fd9'::uuid,
    'f66adfcf-d0ca-42f8-b79e-084d0cfc07ed'::uuid,
    'df77c95b-8199-4ced-a684-0102c1a83479'::uuid,
    '25d94dd2-3312-427a-adde-30caee6479f6'::uuid
  )
  and processing_status = 'failed';

-- Must return 8 before commit.
select count(*) as reset_count
from public.documents
where claim_id = '443bdef7-1377-4628-9105-c0bed8a55614'::uuid
  and id in (
    '6d7474b5-e8ef-41ec-a7d1-9950273dda76'::uuid,
    '08192a17-9b13-4215-8d2c-043f2579ce2e'::uuid,
    'be331eda-701b-4696-ac9e-233c1d2125fe'::uuid,
    '74cba396-4af5-48db-aef6-d58744060d62'::uuid,
    'a7cc2c6a-4814-455d-b6c5-cefb7b002fd9'::uuid,
    'f66adfcf-d0ca-42f8-b79e-084d0cfc07ed'::uuid,
    'df77c95b-8199-4ced-a684-0102c1a83479'::uuid,
    '25d94dd2-3312-427a-adde-30caee6479f6'::uuid
  )
  and processing_status = 'pending'
  and extracted_data is null;

commit;
```

Stop and roll back instead of committing if `reset_count` is not exactly `8`.

## Local Services for Retry

Start local Inngest dev:

```powershell
pnpm inngest:dev
```

Start local app with a process-only Inngest base URL override so Inngest
registration and event sends target the local dev server:

```powershell
$env:INNGEST_BASE_URL = 'http://localhost:8288'
pnpm dev
```

Do not commit or persist this override into `.env.local`.

Confirm safe GET checks:

```powershell
Invoke-WebRequest -Uri 'http://localhost:3000' -Method GET -UseBasicParsing
Invoke-WebRequest -Uri 'http://localhost:3000/api/inngest' -Method GET -UseBasicParsing
Invoke-WebRequest -Uri 'http://localhost:8288' -Method GET -UseBasicParsing
```

Expected status for each: `200`.

## Approved Event Resend Commands

Send only the same event that the upload route sends:

- Event name: `claim/document.uploaded`
- Payload: `{ claimId, documentId }`
- Local endpoint: `http://localhost:8288/e/local-dev-event-key`

PowerShell event resend:

```powershell
$claimId = '443bdef7-1377-4628-9105-c0bed8a55614'
$documentIds = @(
  '6d7474b5-e8ef-41ec-a7d1-9950273dda76',
  '08192a17-9b13-4215-8d2c-043f2579ce2e',
  'be331eda-701b-4696-ac9e-233c1d2125fe',
  '74cba396-4af5-48db-aef6-d58744060d62',
  'a7cc2c6a-4814-455d-b6c5-cefb7b002fd9',
  'f66adfcf-d0ca-42f8-b79e-084d0cfc07ed',
  'df77c95b-8199-4ced-a684-0102c1a83479',
  '25d94dd2-3312-427a-adde-30caee6479f6'
)

foreach ($documentId in $documentIds) {
  $body = @{
    name = 'claim/document.uploaded'
    data = @{
      claimId = $claimId
      documentId = $documentId
    }
  } | ConvertTo-Json -Depth 5 -Compress

  Invoke-WebRequest `
    -Uri 'http://localhost:8288/e/local-dev-event-key' `
    -Method POST `
    -ContentType 'application/json' `
    -Body $body `
    -UseBasicParsing
}
```

## Post-Retry Verification Queries

Run only against project `aozbgunwhafabfmuwjol`.

```sql
select file_name, id, document_type, document_subtype, processing_status,
       extracted_data->>'kind' as extracted_kind,
       extracted_data->>'route' as extracted_route
from public.documents
where claim_id = '443bdef7-1377-4628-9105-c0bed8a55614'::uuid
order by created_at;

select action, count(*)::int as row_count
from public.audit_log
where claim_id = '443bdef7-1377-4628-9105-c0bed8a55614'::uuid
group by action
order by action;

select pass_number, status, llm_calls_made, cost_usd
from public.passes
where claim_id = '443bdef7-1377-4628-9105-c0bed8a55614'::uuid
order by pass_number;
```

## Pass/Fail Criteria

The retry passes only if:

- all eight documents reach `processed`
- no new claim is created
- no new documents are uploaded
- document types and subtypes match the approved expected routes
- successful extraction routes produce `extracted_data.kind = 'extraction'`
- extraction route names match the expected route
- deferred routes produce `document_extraction_deferred` audit rows
- no production project or production data is touched

The retry fails if:

- any document returns to `failed`
- any document remains stuck in `pending` or `processing`
- any event targets a document outside the approved list
- any mutation touches a different claim
- any production target is used

## Rollback And Cleanup

Do not delete rows automatically.

If the retry fails again, preserve the audit trail and create a separate
CEO-approved cleanup or retry task. Do not remove documents, audit rows, pass
rows, or storage objects without explicit approval.

## Next Required Approval

CEO must explicitly approve:

1. resetting the same eight failed document rows to `pending`,
2. resending the same eight local Inngest events,
3. running the verification queries after processing completes.
