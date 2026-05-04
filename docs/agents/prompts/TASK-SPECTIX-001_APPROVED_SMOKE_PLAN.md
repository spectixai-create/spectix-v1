# TASK-SPECTIX-001 Approved Smoke Plan

Status: CEO-approved planning package. Smoke execution is not approved in this
task.

## 1. Smoke Objective

Verify that the merged PR #18 broad extraction flow can process controlled
synthetic documents through broad classification, subtype classification,
route-specific extraction, `documents.extracted_data` persistence, audit logging,
and Inngest event emission without changing schema, secrets, deployment
settings, or production configuration.

## 2. Required Synthetic Test Documents

Use only CEO-approved synthetic files in a later execution task:

- Receipt document: a simple travel-related receipt with line items, total,
  currency, date, and payment method.
- Police report document: a synthetic theft/loss report with report number,
  station, reporter, incident date, and item list.
- Service-provider or hotel letter document: a synthetic provider letter with
  letterhead, guest/customer name, date, incident description, signature, and
  red-flag-free wording.
- Medical visit document: a synthetic brief treatment/visit summary with
  patient name, date, facility, short diagnosis summary, cost, currency, and
  clinician.
- Optional deferred-route control: a synthetic policy, passport/ID, or boarding
  pass style document to confirm extraction deferral without calling a dedicated
  extractor.

No real claimant, medical, passport, payment, or policy data may be used.

## 3. Routes To Cover

Minimum route coverage for later execution:

| Broad type       | Example subtype   | Expected extraction route |
| ---------------- | ----------------- | ------------------------- |
| `receipt`        | `general_receipt` | `receipt`                 |
| `police_report`  | `police_report`   | `police`                  |
| `hotel_letter`   | `hotel_letter`    | `hotel_generic`           |
| `medical_report` | `medical_visit`   | `medical`                 |

Optional deferral coverage:

| Broad type | Example subtype       | Expected route   |
| ---------- | --------------------- | ---------------- |
| `other`    | `policy`              | `skip_dedicated` |
| `other`    | `null` subtype result | `skip_other`     |

Do not broaden the route set during execution without a new PM/CEO approval.

## 4. Expected Audit Events

For each successful extraction document:

- `document_processing_started`
- `document_processing_completed`
- `document_subtype_classification_completed` when subtype classification runs
  or is deterministically skipped.
- `document_extraction_completed`

For deferred-route control documents, if included:

- `document_processing_started`
- `document_processing_completed`
- `document_extraction_deferred`

For extraction failure observation only, if a failure occurs naturally:

- `document_extraction_failed`

Do not manufacture failures in production smoke unless a later task explicitly
approves a failure-path smoke.

## 5. Expected Inngest Events

For each uploaded synthetic document:

- Initial trigger: `claim/document.uploaded`
- Classification completion: `claim/document.processed`
- Subtype completion: `claim/document.subtype_classified`
- Successful extraction: `claim/document.extracted`

For deferred-route control documents, if included:

- `claim/document.extraction_deferred`

For extraction failures, if they occur naturally:

- `claim/document.extraction_failed`

## 6. Expected `extracted_data` Shape

Successful extraction must persist route-scoped data:

```json
{
  "kind": "extraction",
  "route": "receipt | police | hotel_generic | medical",
  "documentType": "<broad document type>",
  "documentSubtype": "<document subtype or null>",
  "data": {},
  "classifier": {},
  "subtype_classifier": {},
  "subtype": {},
  "processing_time_ms": 0,
  "metadata": {
    "classifier": {},
    "subtype_classifier": {},
    "subtype": {},
    "processing_time_ms": 0,
    "extraction": {
      "route": "receipt | police | hotel_generic | medical",
      "modelId": "<model id>",
      "inputTokens": 0,
      "outputTokens": 0,
      "costUsd": 0
    }
  }
}
```

Route payload checks:

- `receipt`: `data.items` exists and `data.total` exists.
- `police`: `data.formatAnalysis` exists and `data.itemsReported` exists.
- `hotel_generic`: `data.hotelName` exists and `data.redFlags` exists.
- `medical`: `data.diagnosisBrief` exists and `data.anomalies` exists.

Deferred extraction should leave classification/subtype metadata intact and
emit the deferred audit/event path. Extraction failure should preserve
classification data and add `extraction_error` with `route` and `error`.

## 7. Safety Constraints

- Planning package only in this task.
- No production smoke execution.
- No document upload.
- No production data mutation.
- No app runtime code change.
- No DB schema change or migration.
- No secrets, env, auth, billing, pricing, or deployment setting changes.
- No OpenClaw cron, 24/7 mode, external routing, auto-merge, or auto-deploy.
- Later execution must use only CEO-approved synthetic files and an approved
  `SMOKE_CLAIM_ID`.

## 8. Supabase Verification Queries

Replace `<SMOKE_CLAIM_ID>` only after CEO approves smoke execution.

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

## 9. Must-Not-Touch List

- App product code.
- Database schema and migrations.
- Supabase secrets, env vars, RLS, auth, billing, pricing, and deployment
  settings.
- OpenClaw channels, cron, 24/7 mode, auto-merge, and auto-deploy.
- Real customer documents or personally identifiable data.
- Any claim ID other than the later CEO-approved `<SMOKE_CLAIM_ID>`.

## 10. Pass/Fail Criteria

Pass when all are true:

- Each approved synthetic document reaches `processing_status = 'processed'`.
- The four required extraction routes are represented by at least one document
  each, unless CEO approves a smaller smoke set later.
- Successful extraction rows use `kind = 'extraction'` and the expected route.
- Route payload guard query returns zero rows.
- Expected audit events exist for each document.
- Expected Inngest events are visible in available Inngest logs or delivery
  records.
- No unapproved files, schema, secrets, deployment settings, or production
  configuration were changed.

Fail if any are true:

- Any approved synthetic document remains stuck, fails unexpectedly, or mutates
  an unapproved claim.
- `extracted_data.route` mismatches the expected broad/subtype route.
- Route payload guard query returns one or more rows.
- Required audit/event records are absent.
- Any real user data, schema, secret, env, deployment, auth, billing, pricing,
  cron, 24/7, merge, or deploy setting is touched.

## 11. Codex Execution Prompt For Later

Use [TASK-SPECTIX-001_CODEX_EXECUTION_PROMPT.md](TASK-SPECTIX-001_CODEX_EXECUTION_PROMPT.md)
only after CEO provides the approved `SMOKE_CLAIM_ID`, approved synthetic file
paths, and explicit execution approval.
