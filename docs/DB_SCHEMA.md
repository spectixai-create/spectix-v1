# Database Schema

Canonical source: [supabase/migrations/0001_initial_schema.sql](../supabase/migrations/0001_initial_schema.sql). This document mirrors it for reading. On migration changes, update this file and [lib/types.ts](../lib/types.ts) in the same PR.

## claims

Purpose: top-level claim record.

Columns: `id uuid primary key`, `claim_number text unique not null`, `status text default 'intake'`, `risk_band text null`, `risk_score integer null`, `claim_type text null`, `insured_name text null`, `claimant_name text null`, `incident_date date null`, `incident_location text null`, `amount_claimed numeric null`, `currency text default 'ILS'`, `summary text null`, `metadata jsonb null`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`.

Indexes: `claim_number`, `status`, `risk_band`, `created_at`.

JSONB: `metadata` maps to `ClaimMetadata` in [lib/types.ts](../lib/types.ts).

## documents

Purpose: uploaded files and extracted document data.

Columns: `id uuid primary key`, `claim_id uuid references claims(id) on delete cascade`, `document_type text not null`, `file_path text not null`, `file_name text not null`, `file_size bigint null`, `mime_type text null`, `ocr_text text null`, `extracted_data jsonb null`, `uploaded_by uuid null`, `created_at timestamptz default now()`.

Indexes: `claim_id`, `document_type`, `created_at`.

JSONB: `extracted_data` maps to `ExtractedData` in [lib/types.ts](../lib/types.ts).

## findings

Purpose: rule findings emitted during investigation passes.

Columns: `id uuid primary key`, `claim_id uuid references claims(id) on delete cascade`, `rule_id text not null`, `pass_number integer not null`, `severity text null`, `title text not null`, `description text null`, `evidence jsonb null`, `confidence numeric null`, `created_at timestamptz default now()`.

Indexes: `claim_id`, `rule_id`, `severity`, `pass_number`.

JSONB: `evidence` maps to `FindingEvidence` in [lib/types.ts](../lib/types.ts).

## gaps

Purpose: unresolved evidence gaps that may trigger another pass or clarification question.

Columns: `id uuid primary key`, `claim_id uuid references claims(id) on delete cascade`, `gap_type text not null`, `description text not null`, `status text default 'open'`, `resolution text null`, `resolved_at timestamptz null`, `created_at timestamptz default now()`.

Indexes: `claim_id`, `status`, `gap_type`.

## clarification_questions

Purpose: questions sent to claimants or staged for adjuster review.

Columns: `id uuid primary key`, `claim_id uuid references claims(id) on delete cascade`, `question text not null`, `context text null`, `status text default 'pending'`, `answer text null`, `answered_at timestamptz null`, `created_at timestamptz default now()`.

Indexes: `claim_id`, `status`, `created_at`.

## enrichment_cache

Purpose: cache external enrichment responses such as places and currency.

Columns: `id uuid primary key`, `cache_key text unique not null`, `provider text not null`, `request_payload jsonb null`, `response_payload jsonb null`, `expires_at timestamptz not null`, `created_at timestamptz default now()`.

Indexes: `cache_key`, `provider`, `expires_at`.

JSONB: payloads are `Record<string, unknown>` in [lib/types.ts](../lib/types.ts).

## audit_log

Purpose: append-only operational audit events.

Columns: `id uuid primary key`, `claim_id uuid references claims(id) null`, `actor_type text not null`, `actor_id uuid null`, `action text not null`, `target_table text null`, `target_id uuid null`, `details jsonb null`, `created_at timestamptz default now()`.

Indexes: `claim_id`, `actor_type`, `action`, `created_at`.

## Other Schema Details

- `claims.updated_at` is maintained by an `updated_at` trigger.
- RLS is deny-by-default; `service_role` bypasses policies for server-only workflows.
- Storage bucket: `claim-documents`, private, 32 MB max file size.
