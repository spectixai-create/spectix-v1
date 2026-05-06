# SPRINT-002C Pre-Implementation Verification

Date: 2026-05-06
Repo: spectixai-create/spectix-v1
Main HEAD: df5de0c792de641ad3c64d17ac3e9ee6aab04b11
Verification mode: read-only repo inspection, docs-only report

## 1. Q1 Findings - Input Source Structure

- Extracted output is stored on `public.documents.extracted_data jsonb`; the column is created in `supabase/migrations/0001_initial_schema.sql:40-51` and documented in `docs/DB_SCHEMA.md:87-111`.
- The canonical validation input for SPRINT-002C is `documents.extracted_data` where `extracted_data.kind = "normalized_extraction"`. `docs/DB_SCHEMA.md:113-125` states normalized subtype extraction remains in `extracted_data`, uses `kind = normalized_extraction`, and SPRINT-002B writes that kind only for specialized MVP route success.
- At runtime, normalized success writes the normalized envelope back to `documents.extracted_data`; see `inngest/functions/process-document.ts:598-612`. The normalized data object is the extractor envelope plus classifier metadata; see `inngest/functions/process-document.ts:1215-1226`.
- In the normalized envelope, `kind`, `route`, `subtype`, `schema_version`, `source_document_id`, and `warnings` are top-level envelope fields; see `lib/extraction-contracts.ts:85-107`.
- Subtype fields are nested under `documents.extracted_data.normalized_data.fields.*`. Completed payload validation requires `normalized_data`, requires `normalized_data.fields`, and checks each required field at `$.normalized_data.fields.<fieldName>`; see `lib/extraction-contracts.ts:735-776`.
- The SQL JSON path pattern is therefore:
  - kind: `extracted_data->>'kind'`
  - route: `extracted_data->>'route'`
  - subtype: `extracted_data->>'subtype'`
  - normalized subtype: `extracted_data #>> '{normalized_data,subtype}'`
  - field value: `extracted_data #> '{normalized_data,fields,<field>}'`
  - present field scalar value: `extracted_data #>> '{normalized_data,fields,<field>,value}'`

| Route                      | Source file(s)                                                               | Name paths                                                                                                                                     | Date paths                                                                             | Amount paths                                                                                        | Currency paths                            | Notes                                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `receipt_general`          | `lib/extraction-contracts.ts:146-159`, `lib/extraction-contracts.ts:347-354` | Optional `extracted_data.normalized_data.fields.purchaser_name`; merchant identity at required `fields.merchant_name`.                         | Required `fields.transaction_date`.                                                    | Required `fields.total_amount`; optional `fields.tax_amount`; optional `fields.line_items[].total`. | Required `fields.currency`.               | Required fields: merchant, transaction date, total, currency, category, confidence.                                                                          |
| `police_report`            | `lib/extraction-contracts.ts:161-174`, `lib/extraction-contracts.ts:355-363` | Required/conditional `fields.named_claimant_or_persons`; optional `fields.officer_name`; agency at required `fields.police_agency_or_station`. | Required `fields.report_or_filing_date`; conditionally allowed `fields.incident_date`. | Not found.                                                                                          | Not found.                                | Date aliases normalize into `report_or_filing_date`; see `lib/llm/extract/normalized/build-envelope.ts:220-228`.                                             |
| `medical_visit`            | `lib/extraction-contracts.ts:176-189`, `lib/extraction-contracts.ts:364-371` | Conditional `fields.patient_name`; required `fields.provider_name`; optional `fields.doctor_name`.                                             | Required `fields.visit_date`.                                                          | Optional `fields.invoice_amount`.                                                                   | Not found in normalized medical contract. | Broad medical has `totalCost` and `currency`, but normalized medical currently has only optional `invoice_amount`; see broad type at `lib/types.ts:530-539`. |
| `hotel_letter`             | `lib/extraction-contracts.ts:191-203`, `lib/extraction-contracts.ts:372-379` | Conditional `fields.guest_name`; required `fields.hotel_or_property_name`; optional `fields.staff_signer_name_or_title`.                       | Required `fields.stay_dates_or_incident_date`; required `fields.letter_date`.          | Not found.                                                                                          | Not found.                                | Good input for name/date layers, not currency layer.                                                                                                         |
| `flight_booking_or_ticket` | `lib/extraction-contracts.ts:205-220`, `lib/extraction-contracts.ts:380-389` | Required `fields.passenger_name`; carrier at required `fields.airline_or_carrier`; optional `fields.travel_agency`.                            | Required `fields.departure_datetime`; optional `fields.arrival_datetime`.              | Optional `fields.fare_amount`.                                                                      | Optional `fields.currency`.               | DB subtypes `flight_booking` and `flight_ticket` map to this route; see `lib/llm/extract/normalized/route-by-subtype.ts:14-20`.                              |
| `boarding_pass`            | `lib/extraction-contracts.ts:222-236`, `lib/extraction-contracts.ts:390-399` | Required `fields.passenger_name`; carrier at required `fields.airline_or_carrier`.                                                             | Required `fields.flight_date`; conditional `fields.boarding_or_departure_time`.        | Not found.                                                                                          | Not found.                                | Date aliases normalize into `flight_date`; see `lib/llm/extract/normalized/build-envelope.ts:231-241`.                                                       |
| `witness_letter`           | `lib/extraction-contracts.ts:238-249`, `lib/extraction-contracts.ts:400-407` | Conditional `fields.witness_name`; conditional `fields.relationship_to_claimant`; optional `fields.witness_contact_details`.                   | Conditional `fields.letter_date`; conditional `fields.incident_date_or_timeframe`.     | Not found.                                                                                          | Not found.                                | Useful for name/date validation, not currency validation.                                                                                                    |

Broad fallback output:

- Legacy broad fallback success writes `kind = "extraction"`, `route`, `documentType`, `documentSubtype`, and `data` under `documents.extracted_data`; see `inngest/functions/process-document.ts:1229-1265`.
- Broad fallback route mapping remains `receipt`, `police`, `hotel_generic`, `medical`, `skip_dedicated`, or `skip_other`; see `lib/llm/extract/route-by-subtype.ts:7-13`.
- Broad receipt has `storeName`, `receiptDate`, `total`, and `currency`; broad medical has `patientName`, `dateOfTreatment`, `totalCost`, and `currency`; broad generic has `issuer`, `date`, and `summary`; see `lib/types.ts:504-555`.
- Broad fallback outputs are not structurally compatible with the normalized field envelope because they do not use `normalized_data.fields` or presence markers. Recommendation: include broad fallback in SPRINT-002C only through an explicit adapter, and do not let broad fallback rows enter validation as if they were normalized envelopes.

## 2. Q2 Findings - Storage And Migration Context

Claims context:

- Current relevant claim columns include `insured_name`, `claimant_name`, `incident_date`, `amount_claimed`, `currency text default 'ILS'`, `current_pass`, `total_llm_cost_usd`, and brief fields; see `supabase/migrations/0001_initial_schema.sql:14-31`, `supabase/migrations/0002_schema_audit_implementation.sql:63-83`, and `docs/DB_SCHEMA.md:19-43`.
- `lib/types.ts:164-180` mirrors the relevant claim fields, including `amountClaimed` and `currency`.

Passes context:

- `public.passes` has `claim_id`, `pass_number`, `status`, `started_at`, `completed_at`, `risk_band`, `findings_count`, `gaps_count`, `llm_calls_made`, `cost_usd`, and `created_at`; see `supabase/migrations/0002_schema_audit_implementation.sql:89-109` and `docs/DB_SCHEMA.md:54-81`.
- There is no `passes.kind` column in the table definition or `Pass` interface. The `Pass` interface mirrors the table without kind; see `lib/types.ts:202-220`.
- `passes.status` is constrained by `passes_status_valid` to `pending`, `in_progress`, `completed`, `skipped`, and `failed`; see `supabase/migrations/0002_schema_audit_implementation.sql:103-105` and `docs/DB_SCHEMA.md:73-79`.

Migration convention:

- Up migrations live under `supabase/migrations/{NNNN}_{name}.sql`; rollback files live under `supabase/rollbacks/{NNNN}_{name}.down.sql`; see `docs/MIGRATIONS.md:3-16`.
- D-015 requires future migrations to include both up and down SQL; see `docs/DECISIONS.md:70-84`.
- Existing tables use RLS with deny-by-default policies and server-side `service_role`; see `supabase/migrations/0001_initial_schema.sql:165-176` and `docs/DB_SCHEMA.md:278-281`.

Fit for `claim_validations`:

- A new `claim_validations` table is the cleanest fit because current `findings`, `gaps`, and `clarification_questions` are synthesis/investigation outputs, while SPRINT-002C needs per-layer validation state and payloads before synthesis.
- Recommended schema:
  - `id uuid primary key default gen_random_uuid()`
  - `claim_id uuid not null references public.claims(id) on delete cascade`
  - `pass_number int not null default 1`
  - `layer_id text not null`
  - `status text not null default 'pending'`
  - `payload jsonb not null default '{}'::jsonb`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
  - `unique (claim_id, pass_number, layer_id)`
  - CHECK `layer_id in ('name_match', 'date_validation', 'currency_validation')` for SPRINT-002C scope, or a broader versioned registry if CEO wants extensibility for 11.4/11.5.
  - CHECK `status in ('pending', 'running', 'completed', 'failed', 'skipped')`
  - indexes on `(claim_id)`, `(claim_id, pass_number)`, `(layer_id)`, and `(status)`.
- Add RLS enabled with no policies to match the current server-only pattern.
- Include a paired down migration under `supabase/rollbacks/` if SPRINT-002C implements this table.

## 3. Q3 Findings - Pass And Event Semantics

- `claim/extraction.completed` was not found in the current event union or implementation.
- Current event types include `claim/document.uploaded`, `claim/document.processed`, `claim/document.process_failed`, `claim/document.subtype_classified`, `claim/document.extracted`, `claim/document.extraction_failed`, `claim/document.extraction_deferred`, `claim/pass.start`, and `claim/pass.completed`; see `lib/types.ts:641-734`.
- The pass-1 finalizer is `public.finalize_pass_after_document_processing`; it returns `emit_completed_event` and transitions pass 1 to `completed` when all claim documents are terminal without blocking failures; see `supabase/migrations/20260504111946_pass_lifecycle_completion.sql:173-182` and `supabase/migrations/20260504111946_pass_lifecycle_completion.sql:250-347`.
- Runtime code calls the finalizer through `finalizePassAfterDocumentTerminalState`; see `inngest/functions/process-document.ts:1155-1195`.
- When the finalizer returns `status = completed` and `emit_completed_event = true`, runtime emits `claim/pass.completed`; see `inngest/functions/process-document.ts:1186-1191`.
- Inngest function registration is under `app/api/inngest/route.ts:1-10`, with the function array in `inngest/functions/index.ts:1-13` and the client in `inngest/client.ts:24-27`.

Pass kind recommendation:

- Do not add `passes.kind = validation` for SPRINT-002C v2.0 unless CEO explicitly wants a broader pass model migration. Current `passes` is claim/pass-number state plus cost accounting, not a typed stage registry.
- Preferred implementation path: trigger SPRINT-002C validation from existing `claim/pass.completed` or add a new typed event after the same finalizer point if CEO wants explicit extraction-complete naming.
- If adding `claim/extraction.completed`, add it to `lib/types.ts` event union and emit it at the same point as `claim/pass.completed` after `emit_completed_event = true`. This is a product-code change for implementation, not this verification task.
- Keep validation results in `claim_validations` and reference `pass_number = 1` unless the SPRINT-002C spec defines multi-pass validation behavior.

## 4. Q4 Findings - Audit Constraint State

- `audit_log.action` is free text in the initial schema: `action text not null`; see `supabase/migrations/0001_initial_schema.sql:132-141`.
- No `audit_log.action` CHECK constraint was found in current migrations or `docs/DB_SCHEMA.md`.
- `docs/TECH_DEBT.md:14` states audit action strings are open-ended and lack a central registry.
- Therefore, new validation audit actions do not require a DB migration for `audit_log.action`.
- Existing audit style requires safe metadata only. Normalized extraction docs state audit payloads contain route/status/fallback/cost metadata and no secrets or raw unsafe model output; see `docs/specs/sprint-002-subtype-extraction.md:128-133` and `docs/CONVENTIONS.md:129-134`.

Recommended SPRINT-002C audit actions:

- `claim_validation_layer_started`
- `claim_validation_layer_completed`
- `claim_validation_layer_failed`
- `claim_validation_layer_skipped`

Recommended audit details:

- Safe metadata only: `layer_id`, `pass_number`, validation status, counts of source documents inspected, normalized route counts, failure/defer reason, cost/tokens if an LLM is used, and no raw model output or secrets.

## 5. Q5 Findings - Existing Utilities Inventory

| Utility area                           | Found?  | Filepath / symbol                                                                        | Summary                                                                                                                                    | Recommendation                                                                                           |
| -------------------------------------- | ------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `lib/validation/`                      | No      | not found                                                                                | No directory found.                                                                                                                        | Create new validation-layer module structure in implementation.                                          |
| `lib/cross-document/`                  | No      | not found                                                                                | No directory found.                                                                                                                        | Do not assume existing cross-document engine.                                                            |
| `lib/layers/`                          | No      | not found                                                                                | No directory found.                                                                                                                        | Not available.                                                                                           |
| Hebrew-English transliteration utility | No      | not found                                                                                | No transliteration helper found.                                                                                                           | Implement only if SPRINT-002C spec requires it; otherwise use conservative normalized string comparison. |
| Fuzzy string match utility             | No      | not found                                                                                | No fuzzy matcher found.                                                                                                                    | Implement a small internal utility with tests; do not add dependencies unless separately approved.       |
| Levenshtein/similarity utility         | No      | not found                                                                                | No Levenshtein/similarity helper found.                                                                                                    | Implement deterministic local helper if needed; no new npm dependency.                                   |
| Date normalization utility             | Partial | `normalizeDateLikeValue` in `lib/llm/extract/normalized/build-envelope.ts:285-319`       | Internal helper normalizes ISO-like and day-first date strings, but it is not exported and is currently scoped to extractor alias cleanup. | Reuse logic conceptually, but extract/export intentionally during implementation if needed.              |
| Currency parsing utility               | No      | not found                                                                                | No standalone parser found.                                                                                                                | Implement SPRINT-002C-specific parser with tests if needed.                                              |
| Money/amount utility                   | Partial | `lib/intake/build-payload.ts:47-59`, `lib/schemas/claim.ts:58-59`                        | Intake parses `amountClaimed` and hardcodes `currency: 'ILS'`; Zod schema defaults currency to `ILS`.                                      | Not enough for validation-layer currency logic. Use only as claim-input context.                         |
| Nullable extraction helpers            | Yes     | `nullableString`, `nullableNumber`, `stringArray` in `lib/llm/extract/common.ts:135-150` | Mapper helpers for broad extractor outputs.                                                                                                | Reuse for broad fallback adapter if broad fallback is included.                                          |

## 6. Q6 Findings - Settlement Currency Field

- The current settlement/claim currency field is `claims.currency text default 'ILS'`; see `supabase/migrations/0001_initial_schema.sql:25-27` and `docs/DB_SCHEMA.md:32-33`.
- In TypeScript, `Claim.currency` is a non-null `string`; see `lib/types.ts:164-180`.
- Create-claim request also requires `currency: string`; see `lib/types.ts:590-600`.
- Current intake code sets `currency: 'ILS'` explicitly; see `lib/intake/build-payload.ts:47-59`.
- Current claim Zod schema defaults `currency` to `ILS`; see `lib/schemas/claim.ts:58-59`.

Recommendation:

- SPRINT-002C may treat claim settlement currency as `claims.currency`, with `ILS` as the current repo-backed default.
- The spec should state that `ILS` is existing repo behavior, not a newly invented SPRINT-002C business decision.
- If future settlement currency differs from claim intake currency, that needs a separate schema decision; no separate `settlement_currency` field exists now.

## 7. Q7 Findings - Currency Conversion Utility State

- No existing currency exchange utility or exchange-rate API source was found in `lib/`, `app/`, `tests/`, or `scripts/`.
- `enrichment_cache` exists and is documented as caching external enrichment responses such as places and currency; see `docs/DB_SCHEMA.md:239-247`.
- Existing amount/currency types are claim-level `amountClaimed`/`currency`, broad receipt `total`/`currency`, broad medical `totalCost`/`currency`, normalized receipt `total_amount`/`currency`, normalized flight optional `fare_amount`/`currency`, and normalized medical optional `invoice_amount`; see `lib/types.ts:590-600`, `lib/types.ts:504-539`, and `lib/extraction-contracts.ts:146-220`.

Recommendation:

- If SPRINT-002C implements currency normalization beyond same-currency comparison, introduce:
  - `ExchangeRateProvider` interface
  - default fetch implementation
  - test fake provider
  - per-run cache, optionally backed later by `enrichment_cache`
  - no new npm dependencies
  - graceful `rate_failure` behavior that records failed/skipped validation rather than blocking the whole claim pipeline.

## 8. Recommended Spec Adjustments

Required corrections for SPRINT-002C v2.0:

1. Replace every reference to `documents.normalized_data` with the verified source: `documents.extracted_data` where `extracted_data.kind = "normalized_extraction"`.
2. Define normalized field reads under `documents.extracted_data.normalized_data.fields.<field>`, with scalar values under `.value` and presence under `.presence`.
3. Explicitly decide broad fallback handling. Recommendation: skip broad fallback by default for SPRINT-002C v2.0, or include it only through an adapter from `kind = "extraction"` route-specific data into a validation input shape.
4. Use `claim_validations` as the storage decision and specify schema, RLS, indexes, unique key, status values, and paired down migration.
5. Do not assume `passes.kind`; it does not exist. Use `claim_validations.layer_id` and `pass_number`, and keep `passes` for pass state/cost accounting.
6. Decide whether SPRINT-002C listens to existing `claim/pass.completed` or adds a new `claim/extraction.completed` event emitted from the same finalizer path.
7. Treat audit actions as free text; no `audit_log.action` migration is required, but add the four validation action names to conventions/docs and keep details safe.
8. Utility decisions: create new validation utilities for name/date/currency; only reuse existing date normalization logic after extracting/exporting it intentionally.
9. Currency provider decision: no existing provider exists; add an interface/fake/cache design if conversion is in scope, with graceful `rate_failure`.
10. Settlement currency: use existing `claims.currency`, defaulting to current repo behavior of `ILS`, unless CEO approves a new settlement-currency field.

## 9. Implementation Readiness Verdict

GO WITH ADJUSTMENTS

Reasoning:

- Repo schema and JSON paths are sufficiently clear for implementation planning.
- The CEO correction is confirmed: normalized extraction source is `documents.extracted_data`, not a `documents.normalized_data` column.
- Storage needs a migration if `claim_validations` is implemented, and D-015 requires a paired rollback.
- Current pass/event semantics are usable, but the spec must decide between consuming `claim/pass.completed` and adding `claim/extraction.completed`.
- Utilities for SPRINT-002C mostly do not exist and must be implemented deliberately without new dependencies.

Mandatory adjustments before implementation:

- Correct the input-source paths.
- Add `claim_validations` migration and rollback design.
- Decide the event trigger.
- Specify broad fallback policy.
- Specify validation utility design and currency provider behavior.

## 10. Safety Confirmation

- Product code changed: no
- Runtime code changed: no
- Migrations created: no
- Dependencies changed: no
- Supabase touched: no
- Smoke run: no
- Deploy: no
- Secrets printed: no
- SPRINT-003A started: no
