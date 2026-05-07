# Database Schema

Canonical sources:

- [supabase/migrations/0001_initial_schema.sql](../supabase/migrations/0001_initial_schema.sql)
- [supabase/migrations/0002_schema_audit_implementation.sql](../supabase/migrations/0002_schema_audit_implementation.sql)
- [supabase/migrations/0003_storage_mime_types.sql](../supabase/migrations/0003_storage_mime_types.sql)
- [supabase/migrations/0004_classifier_prep.sql](../supabase/migrations/0004_classifier_prep.sql)
- [supabase/migrations/0005_document_subtype.sql](../supabase/migrations/0005_document_subtype.sql)
- [supabase/migrations/0006_errored_state_and_cost_cap.sql](../supabase/migrations/0006_errored_state_and_cost_cap.sql)
- [supabase/migrations/20260506091500_claim_validations.sql](../supabase/migrations/20260506091500_claim_validations.sql)
- [supabase/migrations/20260506131500_synthesis_results.sql](../supabase/migrations/20260506131500_synthesis_results.sql)
- [supabase/migrations/20260506160000_ui_support.sql](../supabase/migrations/20260506160000_ui_support.sql)
- [supabase/migrations/20260506210000_claimant_responses.sql](../supabase/migrations/20260506210000_claimant_responses.sql)

This document mirrors the repository schema through SPRINT-UI-002B claimant
response core support. On future migration changes, update this file and
[lib/types.ts](../lib/types.ts) in the same PR.

## claims

Purpose: top-level claim record and denormalized current pipeline state.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `claim_number text unique not null`
- `status text not null default 'intake'`
- `risk_band text null`
- `risk_score numeric null`
- `claim_type text null`
- `insured_name text null`
- `claimant_name text null`
- `claimant_email text null` (migration #0002)
- `claimant_phone text null` (migration #0002)
- `policy_number text null` (migration #0002)
- `incident_date date null`
- `incident_location text null`
- `amount_claimed numeric null`
- `currency text default 'ILS'`
- `summary text null`
- `metadata jsonb null`
- `current_pass int default 0` (migration #0002)
- `total_llm_cost_usd numeric default 0` (migration #0002)
- `brief_text text null` (migration #0002)
- `brief_pass_number int null` (migration #0002)
- `brief_recommendation text null` (migration #0002)
- `brief_generated_at timestamptz null` (migration #0002)
- `escalated_to_investigator boolean not null default false` (SPRINT-UI-001)
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes: `claims_status_idx`, `claims_risk_band_idx`, `claims_created_at_idx`, `claims_policy_number_idx`.

CHECK constraints:

- `claims_status_valid`: `intake`, `processing`, `pending_info`, `ready`, `reviewed`, `rejected_no_coverage`, `cost_capped`, `errored`.
- `claims_brief_recommendation_valid`: nullable; `approve`, `request_info`, `deep_investigation`, `reject_no_coverage`.

JSONB: `metadata` maps to `ClaimMetadata` in [lib/types.ts](../lib/types.ts).

## passes

Purpose: normalized pipeline pass state. Replaces earlier `passes_history` JSONB idea.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `claim_id uuid not null references claims(id) on delete cascade`
- `pass_number int not null`
- `status text not null default 'pending'`
- `started_at timestamptz null`
- `completed_at timestamptz null`
- `risk_band text null`
- `findings_count int default 0`
- `gaps_count int default 0`
- `llm_calls_made int default 0`
- `cost_usd numeric default 0`
- `created_at timestamptz not null default now()`

Indexes and constraints:

- `UNIQUE (claim_id, pass_number)`
- `passes_claim_id_idx`
- `passes_status_idx`
- `passes_status_valid`: `pending`, `in_progress`, `completed`, `skipped`, `failed`
- `passes_risk_band_valid`: nullable; `green`, `yellow`, `orange`, `red`

RLS: enabled with no policies. Server code uses `service_role`, matching the existing deny-by-default pattern.

## claim_validations

Purpose: deterministic claim-level validation layer results for SPRINT-002C
layers 11.1 name match, 11.2 date validation, and 11.3 currency validation.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `claim_id uuid not null references claims(id) on delete cascade`
- `pass_number int not null`
- `layer_id text not null`
- `status text not null`
- `payload jsonb not null`
- `created_at timestamptz not null default now()`

Indexes and constraints:

- `UNIQUE (claim_id, pass_number, layer_id)`
- `idx_claim_validations_claim`
- `idx_claim_validations_pass`
- `claim_validations_layer_id_valid`: `11.1`, `11.2`, `11.3`
- `claim_validations_status_valid`: `completed`, `failed`, `skipped`

RLS: enabled with no policies. Server code uses `service_role`, matching the
existing deny-by-default pattern.

JSONB: `payload` maps to validation payload contracts in
[lib/validation/types.ts](../lib/validation/types.ts). Payloads must store safe
metadata and evidence references only. They must not store raw OCR text, raw
model output, raw file content, or secrets.

## synthesis_results

Purpose: deterministic SPRINT-003A synthesis output derived from
`claim_validations` without LLM calls.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `claim_id uuid not null references claims(id) on delete cascade`
- `pass_number int not null`
- `kind text not null`
- `payload jsonb not null`
- `created_at timestamptz not null default now()`

Indexes and constraints:

- `idx_synthesis_results_claim`
- `idx_synthesis_results_claim_pass`
- `synthesis_results_kind_valid`: `finding`, `question`, `readiness_score`

RLS: enabled with no policies. Server code uses `service_role`, matching the
existing deny-by-default pattern.

JSONB: `payload` maps to synthesis contracts in
[lib/synthesis/types.ts](../lib/synthesis/types.ts). Findings/questions must use
safe validation evidence references and must not store raw OCR text, raw model
output, raw file content, or secrets.

## question_dispatches

Purpose: adjuster-visible record of synthesis clarification questions selected
for claimant follow-up. SPRINT-UI-001 records dispatch intent only; it does not
send email/SMS.

Columns:

- `question_id text not null`
- `claim_id uuid not null references claims(id) on delete cascade`
- `first_dispatched_at timestamptz not null`
- `last_dispatched_at timestamptz not null`
- `dispatched_by uuid not null`
- `last_dispatched_by uuid not null`
- `edited_text text null`
- `notification_sent_at timestamptz null`
- `notification_attempts int not null default 0`
- `notification_last_error text null`
- `notification_channel text null`

Indexes and constraints:

- `PRIMARY KEY (claim_id, question_id)`
- `idx_question_dispatches_claim`
- `question_dispatches_notification_channel_check`: nullable; if set, one of
  `email`, `sms`, `both`. UI-002B leaves these fields unused until UI-002C.

RLS: enabled with no policies. Server code uses `service_role`, matching the
existing deny-by-default pattern.

Important: `dispatched_by` and `last_dispatched_by` intentionally do not have
DB-level FKs to `auth.users`; the current project schema has no safe public
table FK convention for Supabase auth users. Route handlers validate the
authenticated user before writing these fields.

## question_response_drafts

Purpose: claimant autosave state for dispatched clarification questions.

Columns:

- `question_id text not null`
- `claim_id uuid not null references claims(id) on delete cascade`
- `response_value jsonb not null`
- `saved_at timestamptz not null default now()`

Constraints: `PRIMARY KEY (claim_id, question_id)`.

RLS: enabled with no client policies. Server routes and SECURITY DEFINER RPCs
mediate access.

## question_responses

Purpose: finalized claimant responses. UI-002B overwrites the current response
per question and keeps privacy-preserving submission timestamps/counts in
`audit_log`.

Columns:

- `question_id text not null`
- `claim_id uuid not null references claims(id) on delete cascade`
- `response_value jsonb not null`
- `responded_at timestamptz not null default now()`

Indexes and constraints:

- `PRIMARY KEY (claim_id, question_id)`
- `idx_question_responses_claim`

RLS: enabled with no client policies. Server routes and SECURITY DEFINER RPCs
mediate access.

## claimant_magic_links

Purpose: one-time claimant portal access links for dispatched questions.

Columns:

- `token_hash text primary key`
- `claim_id uuid not null references claims(id) on delete cascade`
- `expires_at timestamptz not null`
- `used_at timestamptz null`
- `revoked_at timestamptz null`
- `created_at timestamptz not null default now()`
- `created_by uuid not null references auth.users(id)`

Indexes: `idx_claimant_magic_links_active` on `claim_id` for unused and
unrevoked links.

RLS: enabled with no client policies. Public claimant routes never receive raw
token hashes.

## documents

Purpose: uploaded files and extracted document data.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `claim_id uuid not null references claims(id) on delete cascade`
- `document_type text not null`
- `document_subtype text null` (migration #0005)
- `file_path text not null`
- `file_name text not null`
- `file_size bigint null`
- `mime_type text null`
- `ocr_text text null`
- `extracted_data jsonb null`
- `processing_status text default 'pending'` (migration #0002)
- `uploaded_by uuid null`
- `created_at timestamptz not null default now()`
- `response_to_question_id text null`

Indexes: `documents_claim_id_idx`, `documents_document_type_idx`,
`documents_document_subtype_idx` (partial: `WHERE document_subtype IS NOT
NULL`), `idx_documents_response_question` (partial: `WHERE
response_to_question_id IS NOT NULL`).

CHECK constraints:

- `documents_processing_status_valid`: `pending`, `processing`, `processed`, `failed`.
- `documents_document_type_check`: `police_report`, `hotel_letter`, `receipt`, `medical_report`, `witness_letter`, `flight_doc`, `photo`, `other`.
- `documents_document_subtype_check`: nullable; if not null, must be one of the 37 values matching `DocumentSubtype` in [lib/types.ts](../lib/types.ts).

JSONB: `extracted_data` maps to `ExtractedData` in [lib/types.ts](../lib/types.ts).

SPRINT-002A normalized extraction envelope:

- Normalized subtype extraction remains in this JSONB column for MVP; no relational extraction tables exist yet.
- Versioned normalized payloads use `kind = normalized_extraction` and `schema_version = sprint-002a.v1`.
- `status = completed` means schema-valid normalized extraction exists.
- `status = failed` means a blocking extraction failure and includes blocking failure details.
- `status = deferred` means extraction did not run or was intentionally unsupported/deferred with a reason.
- Unsupported subtype extraction must be deferred, not completed.
- Malformed model output must fail validation.
- Low-confidence structurally valid extraction is represented as a warning and is non-blocking.
- SPRINT-002B writes `kind = normalized_extraction` only for specialized MVP route success. Legacy broad fallback success continues to write the existing `kind = extraction` shape.
- SPRINT-002B maps DB subtype names explicitly: `general_receipt` -> `receipt_general`, `flight_booking` and `flight_ticket` -> `flight_booking_or_ticket`, and `witnesses` -> `witness_letter`.
- Non-MVP subtype values continue through broad fallback or existing skip/defer behavior. No relational extraction tables or migrations are added in SPRINT-002B.

Processing lifecycle semantics:

- `pending` and `processing` are non-terminal document-processing states.
- `processed` is written only after classification, extraction/defer handling, audit persistence, and cost persistence for that document are complete.
- `failed` is a terminal document-processing failure.
- If `extracted_data.extraction_error` exists on a `processed` document, it is blocking unless `extracted_data.extraction_error.blocking` is explicitly `false`.
- `extracted_data.document_processing.terminal = false` is treated as non-terminal by the pass lifecycle helper even if a row was prematurely marked `processed`.

## RPC helpers

- `public.upsert_pass_increment(p_claim_id uuid, p_pass_number int, p_calls_increment int, p_cost_increment numeric)`: claim-level cumulative pass accounting. Inserts or updates the `(claim_id, pass_number)` row and increments `llm_calls_made` and `cost_usd`. The migration #0002 `passes_update_claim_state` trigger fires on `UPDATE OF cost_usd` and keeps `claims.total_llm_cost_usd` synchronized.
- `public.reopen_pass_for_document_processing(p_claim_id uuid, p_pass_number int default 1, p_reason text default 'document_uploaded', p_document_id uuid default null)`: reopens pass 1 to `in_progress` when a new document or retry makes document processing non-terminal again. Preserves pass cost counters and clears `completed_at`.
- `public.retry_document_processing(p_document_id uuid, p_reason text default 'manual_retry', p_actor_type text default 'system', p_actor_id text default null)`: resets the same document row to `pending` for MVP retry, writes the previous failure state to `audit_log`, and reopens pass 1.
- `public.finalize_pass_after_document_processing(p_claim_id uuid, p_pass_number int default 1)`: serializes finalizers per claim/pass, keeps pass 1 `in_progress` while any document is non-terminal, moves it to `completed` when all documents are terminal without blocking failures, or `failed` when all documents are terminal and at least one has a blocking failure. It returns `emit_completed_event = true` only for a real transition into `completed`.
- `public.replace_synthesis_results(p_claim_id uuid, p_pass_number int, p_results jsonb)`: atomically replaces synthesis rows for one claim/pass using DELETE + INSERT in one database transaction. Used by SPRINT-003A; synthesis code must not UPSERT `synthesis_results`.
- `public.validate_claimant_magic_link(p_token_hash text, p_claim_id uuid)`: validates a one-time claimant magic link and returns the link row or typed `P000x` errors.
- `public.save_draft(p_token_hash text, p_claim_id uuid, p_question_id text, p_response_value jsonb)`: validates the link, sets local `lock_timeout = '5s'`, and upserts one draft response.
- `public.link_document_to_question(p_token_hash text, p_claim_id uuid, p_document_id uuid, p_question_id text)`: validates the link and marks a document as the response for a dispatched question.
- `public.finalize_question_responses(p_token_hash text, p_claim_id uuid)`: validates the link, locks the claim row, requires `claims.status = 'pending_info'`, requires drafts for all dispatched questions, upserts finalized responses, marks the link used, moves the claim to `processing`, inserts a privacy-preserving claimant audit row, and returns pending response document IDs for recycle. Non-`pending_info` claims raise `claim_not_pending_info` / `P0009` before responses, draft deletion, token use, audit, or recycle event side effects.

## Storage

Bucket `claim-documents` remains private with 32 MB bucket limit. Migration
#0004 restricts new uploads to `application/pdf`, `image/jpeg`, and
`image/png`. The API endpoint enforces a stricter 4 MB limit.

## findings

Purpose: rule findings emitted during investigation passes.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `claim_id uuid not null references claims(id) on delete cascade`
- `rule_id text not null`
- `pass_number int not null`
- `severity text null`
- `title text not null`
- `description text null`
- `evidence jsonb null`
- `confidence numeric null`
- `severity_adjusted_by_context boolean default false` (migration #0002)
- `severity_original text null` (migration #0002)
- `status text default 'open'` (migration #0002)
- `resolved_in_pass int null` (migration #0002)
- `recommended_action text null` (migration #0002)
- `created_at timestamptz not null default now()`

Indexes: `findings_claim_id_idx`, `findings_rule_id_idx`, `findings_pass_number_idx`.

CHECK constraints:

- `findings_severity_valid`: nullable; `low`, `medium`, `high`.
- `findings_severity_original_valid`: nullable; `low`, `medium`, `high`.
- `findings_status_valid`: `open`, `resolved`, `persisted`.

JSONB: `evidence` maps to `FindingEvidence` in [lib/types.ts](../lib/types.ts).

## gaps

Purpose: unresolved evidence gaps that may trigger another pass or clarification question.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `claim_id uuid not null references claims(id) on delete cascade`
- `gap_type text not null`
- `description text not null`
- `status text not null default 'open'`
- `resolution text null`
- `resolved_at timestamptz null`
- `fill_method text null` (migration #0002)
- `fill_target text null` (migration #0002)
- `filled_in_pass int null` (migration #0002)
- `filled_value jsonb null` (migration #0002)
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()` (migration #0002)

Indexes: `gaps_claim_id_idx`, `gaps_status_idx`.

CHECK constraints:

- `gaps_status_valid`: `open`, `resolved`, `ignored`.
- `gaps_fill_method_valid`: nullable; `auto_api`, `auto_osint`, `manual_claimant`, `manual_adjuster`.

Triggers: `gaps_set_updated_at` updates `updated_at` before row update.

JSONB: `filled_value` is an open `Record<string, unknown>` payload in [lib/types.ts](../lib/types.ts).

## clarification_questions

Purpose: questions sent to claimants or staged for adjuster review.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `claim_id uuid not null references claims(id) on delete cascade`
- `question text not null`
- `context text null`
- `status text not null default 'pending'`
- `answer text null`
- `answered_at timestamptz null`
- `urgency text default 'normal'` (migration #0002)
- `resolved_by uuid null` (migration #0002)
- `resolution_note text null` (migration #0002)
- `closed_at timestamptz null` (migration #0002)
- `created_at timestamptz not null default now()`

Indexes: `clarification_questions_claim_id_idx`, `clarification_questions_status_idx`.

CHECK constraints:

- `cq_status_valid`: `pending`, `sent`, `answered`, `closed`.
- `cq_urgency_valid`: `urgent`, `normal`.

Important: `resolved_by` intentionally has no FK to `auth.users` due to Supabase schema permission restrictions. Application code must validate user existence before insert/update.

## enrichment_cache

Purpose: cache external enrichment responses such as places and currency.

Columns: `id uuid primary key`, `cache_key text unique not null`, `provider text not null`, `request_payload jsonb null`, `response_payload jsonb null`, `expires_at timestamptz not null`, `created_at timestamptz default now()`.

Indexes: `enrichment_cache_expires_at_idx`.

JSONB: payloads are `Record<string, unknown>` in [lib/types.ts](../lib/types.ts).

## audit_log

Purpose: append-only operational audit events.

Columns: `id uuid primary key`, `claim_id uuid references claims(id) null`, `actor_type text not null`, `actor_id text null`, `action text not null`, `target_table text null`, `target_id uuid null`, `details jsonb null`, `created_at timestamptz default now()`.

Indexes: `audit_log_claim_id_idx`, `audit_log_created_at_idx`.

CHECK constraints: `audit_log_actor_type_check` allows `system`, `user`,
`rule_engine`, `llm`, `gap_analyzer`, `human`, and `claimant`.

JSONB: `details` is `Record<string, unknown>` in [lib/types.ts](../lib/types.ts).

SPRINT-002B normalized extraction audit actions:

- `document_normalized_extraction_completed`
- `document_normalized_extraction_failed`
- `document_normalized_extraction_deferred`
- `document_normalized_extraction_fallback_completed`
- `claim_validation_layer_started`
- `claim_validation_layer_completed`
- `claim_validation_layer_failed`
- `claim_validation_layer_skipped`
- `claim_errored`
- `claim_error_recovered`
- `claim_cost_capped`
- `claim_synthesis_started`
- `claim_synthesis_completed`
- `adjuster_decision_approve`
- `adjuster_decision_reject`
- `adjuster_request_info`
- `adjuster_escalate`
- `adjuster_unescalate`
- `claimant_link_opened`
- `claimant_token_invalid`
- `claimant_response_submitted`

These actions use safe metadata only and do not store raw model output or secrets.
Adjuster actions do not write a top-level `cost_usd` column; this table has no
such column. Future cost metadata, if needed, belongs inside `details`.

## Trigger Semantics

`claims.updated_at` is maintained by `claims_set_updated_at`.

`update_claim_pipeline_state()` fires `AFTER INSERT OR UPDATE OF status, risk_band, cost_usd` on `passes` and updates the parent claim:

- `claims.current_pass`: highest started `pass_number` with status `in_progress`, `completed`, `skipped`, or `failed`.
- `claims.total_llm_cost_usd`: sum of `passes.cost_usd`.
- `claims.risk_band`: risk band of the highest-numbered completed pass with non-null `risk_band`; unchanged if no completed pass exists.

## Other Schema Details

- RLS is deny-by-default; `service_role` bypasses policies for server-only workflows.
- Storage bucket: `claim-documents`, private, 32 MB max file size, with allowed MIME types `application/pdf`, `image/jpeg`, and `image/png`.
