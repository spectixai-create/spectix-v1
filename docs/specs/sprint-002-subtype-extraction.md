# SPRINT-002 - Dedicated Subtype Extraction Normalization

Status: SPRINT-002A LOCALLY VALIDATED - pending CEO review

## Scope Split

SPRINT-002A defines the normalized extraction contract layer that future subtype-specific extractors must emit. It does not implement dedicated prompts, route selection changes, claim-level synthesis, findings, gaps, adjuster UI, smoke fixtures, or live Supabase writes.

SPRINT-002B will implement dedicated subtype prompts/routes that produce these contracts.

## Storage Decision

Normalized extraction remains in `documents.extracted_data` JSONB for MVP. No relational extraction tables or Supabase migrations are added in SPRINT-002A.

## Supported MVP Subtypes

SPRINT-002A supports exactly these normalized extraction subtypes:

- `receipt_general`
- `police_report`
- `medical_visit`
- `hotel_letter`
- `flight_booking_or_ticket`
- `boarding_pass`
- `witness_letter`

Unsupported subtypes must be represented with `status = deferred` and a `deferred_reason`. Unsupported subtypes must not be marked `completed`.

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
- `validateNormalizedExtractionEnvelope`

`lib/types.ts` includes the normalized envelope in the `ExtractedData` union so `documents.extracted_data` can store the contract in SPRINT-002B.

## Subtype Data Contracts

The detailed subtype fields are encoded in `lib/extraction-contracts.ts`. The key rule is that completed envelopes must provide every required field with either `present` data or an allowed explicit `not_present` marker when PM marked the source value as conditional.

## Out Of Scope

- Dedicated subtype LLM prompts.
- Route selection changes for the seven MVP subtypes.
- Claim-level synthesis.
- Findings, gaps, contradictions.
- Investigation brief UI or adjuster-ready workflow.
- Smoke fixtures or live Supabase mutation.
