# SPRINT-002 - Dedicated Subtype Extraction Normalization

Status: SPRINT-002B IN DEVELOPMENT - PR pending

## Scope Split

SPRINT-002A defines the normalized extraction contract layer that subtype-specific extractors must emit.

SPRINT-002B implements dedicated subtype prompts/routes for the seven MVP normalized routes. It does not implement claim-level synthesis, findings, gaps, adjuster UI, smoke fixtures, migrations, or live Supabase writes.

## Storage Decision

Normalized extraction remains in `documents.extracted_data` JSONB for MVP. No relational extraction tables or Supabase migrations are added in SPRINT-002A.

## Supported MVP Subtypes

SPRINT-002B supports exactly these normalized extraction routes:

- `receipt_general`
- `police_report`
- `medical_visit`
- `hotel_letter`
- `flight_booking_or_ticket`
- `boarding_pass`
- `witness_letter`

The DB subtype values are not assumed to equal normalized route names. SPRINT-002B uses this explicit mapping:

| DB `documents.document_subtype` | Normalized route           |
| ------------------------------- | -------------------------- |
| `general_receipt`               | `receipt_general`          |
| `police_report`                 | `police_report`            |
| `medical_visit`                 | `medical_visit`            |
| `hotel_letter`                  | `hotel_letter`             |
| `flight_booking`                | `flight_booking_or_ticket` |
| `flight_ticket`                 | `flight_booking_or_ticket` |
| `boarding_pass`                 | `boarding_pass`            |
| `witnesses`                     | `witness_letter`           |

All remaining known DB subtype values continue through `fallback_broad`. There are 29 fallback DB subtype values because `flight_booking` and `flight_ticket` are separate DB subtype values but share one normalized route. The product shorthand "30 non-MVP subtypes" refers to normalized-route coverage gap, not distinct DB enum values.

Important behavior change: `flight_booking` and `flight_ticket` now route to the dedicated `flight_booking_or_ticket` normalized extractor instead of the legacy broad `hotel_generic` extractor.

Unsupported or unknown subtypes must not be marked `completed` as normalized extraction. Unknown or impossible broad/subtype pairs are controlled failures or routing errors; valid non-MVP subtypes use `fallback_broad`.

## Normalized Envelope

Every completed normalized extraction payload must include:

- `kind = normalized_extraction`
- `route`
- `subtype`
- `schema_version = sprint-002a.v1`
- `status`
- `normalized_data`
- `confidence`
- `warnings`
- `source_document_id`
- `extraction_completed_at`
- safe `model_metadata` only when useful and non-secret

Allowed statuses:

- `completed`: schema-valid normalized extraction exists.
- `failed`: blocking extraction failure. Failure details must include `blocking = true`.
- `deferred`: extraction did not run, is intentionally unsupported, or is controlled-deferred with a reason.

## Field Presence

Normalized fields use explicit presence markers:

- `present`: the value was found in the source document.
- `not_present`: the field is relevant but absent from the source document.
- `unknown`: the model cannot determine the field from the source document.

Fields described by PM as "if present" or "if available" are still part of the contract, but may use `not_present` instead of forcing an invented value. Required fields without that qualifier must be `present` for a completed payload. If such a field cannot be supplied, the payload must fail validation or be intentionally `deferred` with a controlled reason.

## Failure Semantics

SPRINT-002A aligns with SPRINT-001:

- Malformed model output must not pass validation.
- Missing required fields are blocking by default unless represented as controlled deferred.
- Low confidence alone is non-blocking if the payload is structurally valid and required fields exist.
- Blocking extraction failures use `status = failed`.
- Unsupported subtype uses `status = deferred`.

## Contract Surface

The TypeScript contract and runtime guards live in `lib/extraction-contracts.ts`.

Exported concepts include:

- supported subtype list and union
- normalized extraction status type
- normalized extraction envelope type
- subtype-specific normalized data types
- validation result type
- helper guards for status/subtype support
- contract field-spec helper for prompt generation
- `validateNormalizedExtractionEnvelope`

`lib/types.ts` includes the normalized envelope in the `ExtractedData` union so `documents.extracted_data` can store the contract in SPRINT-002B.

## Subtype Data Contracts

The detailed subtype fields are encoded in `lib/extraction-contracts.ts`. The key rule is that completed envelopes must provide every required field with either `present` data or an allowed explicit `not_present` marker when PM marked the source value as conditional.

## SPRINT-002B Runtime Behavior

After broad and subtype classification, `process-document` calls the normalized subtype router:

- MVP routes call the specialized normalized extractor first.
- Specialized success writes `documents.extracted_data.kind = normalized_extraction`.
- Specialized success validates the `NormalizedExtractionEnvelope` before persistence.
- Specialized failure records normalized failure audit evidence and then attempts legacy broad fallback.
- Legacy fallback success writes the existing old shape with `kind = extraction`.
- `fallback_broad` routes call the existing legacy `routeBySubtype` function.
- Legacy `skip_dedicated` and `skip_other` preserve existing defer behavior.
- If specialized extraction and fallback extraction both fail, the existing blocking extraction failure path is used.

SPRINT-002B does not convert fallback broad output into a normalized envelope.

## Audit Actions

SPRINT-002B adds normalized extraction audit actions:

- `document_normalized_extraction_completed`
- `document_normalized_extraction_failed`
- `document_normalized_extraction_deferred`
- `document_normalized_extraction_fallback_completed`

Audit payloads contain safe operational metadata only: claim/document ids via audit columns, broad document type, DB document subtype, normalized route, status, fallback usage, failure/defer reason, and cost/token counters where available. They must not contain secrets or raw unsafe model output.

## Smoke Gates

Non-production smoke against Supabase project `aozbgunwhafabfmuwjol` is a CEO-approved pre-merge gate and is not executed by the implementation PR without separate approval.

The expected non-production smoke shape is:

- seven documents, one per MVP normalized route;
- no production project touched;
- no deploy;
- no uncontrolled claim/document upload;
- validate `kind = normalized_extraction` for specialized success;
- validate fallback behavior separately with one non-MVP subtype if CEO approves;
- record cost and `processing_time_ms` table.

Production smoke is not PR acceptance. Production smoke is a separate post-merge CEO-approved gate.

## Out Of Scope

- Claim-level synthesis.
- Findings, gaps, contradictions.
- Investigation brief UI or adjuster-ready workflow.
- Relational extraction tables or migrations.
- Smoke fixtures or live Supabase mutation.
