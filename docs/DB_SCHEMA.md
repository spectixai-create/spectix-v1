# Database Schema

Canonical sources:

- [supabase/migrations/0001_initial_schema.sql](../supabase/migrations/0001_initial_schema.sql)
- [supabase/migrations/0002_schema_audit_implementation.sql](../supabase/migrations/0002_schema_audit_implementation.sql)

Migration #0002 is applied. This document mirrors the production schema for reading. On future migration changes, update this file and [lib/types.ts](../lib/types.ts) in the same PR.

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
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Indexes: `claims_status_idx`, `claims_risk_band_idx`, `claims_created_at_idx`, `claims_policy_number_idx`.

CHECK constraints:

- `claims_status_valid`: `intake`, `processing`, `pending_info`, `ready`, `reviewed`, `rejected_no_coverage`, `cost_capped`.
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

## documents

Purpose: uploaded files and extracted document data.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `claim_id uuid not null references claims(id) on delete cascade`
- `document_type text not null`
- `file_path text not null`
- `file_name text not null`
- `file_size bigint null`
- `mime_type text null`
- `ocr_text text null`
- `extracted_data jsonb null`
- `processing_status text default 'pending'` (migration #0002)
- `uploaded_by uuid null`
- `created_at timestamptz not null default now()`

Indexes: `documents_claim_id_idx`, `documents_document_type_idx`.

CHECK constraints:

- `documents_processing_status_valid`: `pending`, `processing`, `processed`, `failed`.

JSONB: `extracted_data` maps to `ExtractedData` in [lib/types.ts](../lib/types.ts).

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

JSONB: `details` is `Record<string, unknown>` in [lib/types.ts](../lib/types.ts).

## Trigger Semantics

`claims.updated_at` is maintained by `claims_set_updated_at`.

`update_claim_pipeline_state()` fires `AFTER INSERT OR UPDATE OF status, risk_band, cost_usd` on `passes` and updates the parent claim:

- `claims.current_pass`: highest started `pass_number` with status `in_progress`, `completed`, `skipped`, or `failed`.
- `claims.total_llm_cost_usd`: sum of `passes.cost_usd`.
- `claims.risk_band`: risk band of the highest-numbered completed pass with non-null `risk_band`; unchanged if no completed pass exists.

## Other Schema Details

- RLS is deny-by-default; `service_role` bypasses policies for server-only workflows.
- Storage bucket: `claim-documents`, private, 32 MB max file size.
