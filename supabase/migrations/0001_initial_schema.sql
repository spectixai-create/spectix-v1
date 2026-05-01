-- =====================================================================
-- Spike #00 — initial schema
-- 7 tables, indexes, RLS (deny-by-default), 1 private storage bucket.
-- Idempotent: uses IF NOT EXISTS / ON CONFLICT throughout.
-- =====================================================================

-- pgcrypto provides gen_random_uuid(). PG13+ also has it built-in, but
-- enabling explicitly keeps this portable.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. claims
-- ---------------------------------------------------------------------
create table if not exists public.claims (
  id                uuid primary key default gen_random_uuid(),
  claim_number      text not null unique,
  status            text not null default 'intake',
  risk_band         text,
  risk_score        numeric,
  claim_type        text,
  insured_name      text,
  claimant_name     text,
  incident_date     date,
  incident_location text,
  amount_claimed    numeric,
  currency          text default 'ILS',
  summary           text,
  metadata          jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists claims_status_idx     on public.claims (status);
create index if not exists claims_risk_band_idx  on public.claims (risk_band);
create index if not exists claims_created_at_idx on public.claims (created_at desc);

-- ---------------------------------------------------------------------
-- 2. documents
-- ---------------------------------------------------------------------
create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  claim_id        uuid not null references public.claims(id) on delete cascade,
  document_type   text not null,
  file_path       text not null,
  file_name       text not null,
  file_size       bigint,
  mime_type       text,
  ocr_text        text,
  extracted_data  jsonb,
  uploaded_by     uuid,
  created_at      timestamptz not null default now()
);

create index if not exists documents_claim_id_idx      on public.documents (claim_id);
create index if not exists documents_document_type_idx on public.documents (document_type);

-- ---------------------------------------------------------------------
-- 3. findings
-- ---------------------------------------------------------------------
create table if not exists public.findings (
  id           uuid primary key default gen_random_uuid(),
  claim_id     uuid not null references public.claims(id) on delete cascade,
  rule_id      text not null,
  pass_number  int  not null,
  severity     text,
  title        text not null,
  description  text,
  evidence     jsonb,
  confidence   numeric,
  created_at   timestamptz not null default now()
);

create index if not exists findings_claim_id_idx    on public.findings (claim_id);
create index if not exists findings_rule_id_idx     on public.findings (rule_id);
create index if not exists findings_pass_number_idx on public.findings (pass_number);

-- ---------------------------------------------------------------------
-- 4. gaps
-- ---------------------------------------------------------------------
create table if not exists public.gaps (
  id           uuid primary key default gen_random_uuid(),
  claim_id     uuid not null references public.claims(id) on delete cascade,
  gap_type     text not null,
  description  text not null,
  status       text not null default 'open',
  resolution   text,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists gaps_claim_id_idx on public.gaps (claim_id);
create index if not exists gaps_status_idx   on public.gaps (status);

-- ---------------------------------------------------------------------
-- 5. clarification_questions
-- ---------------------------------------------------------------------
create table if not exists public.clarification_questions (
  id           uuid primary key default gen_random_uuid(),
  claim_id     uuid not null references public.claims(id) on delete cascade,
  question     text not null,
  context      text,
  status       text not null default 'pending',
  answer       text,
  answered_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists clarification_questions_claim_id_idx
  on public.clarification_questions (claim_id);
create index if not exists clarification_questions_status_idx
  on public.clarification_questions (status);

-- ---------------------------------------------------------------------
-- 6. enrichment_cache
-- ---------------------------------------------------------------------
create table if not exists public.enrichment_cache (
  id                uuid primary key default gen_random_uuid(),
  cache_key         text not null unique,
  provider          text not null,
  request_payload   jsonb,
  response_payload  jsonb,
  expires_at        timestamptz not null,
  created_at        timestamptz not null default now()
);

create index if not exists enrichment_cache_expires_at_idx
  on public.enrichment_cache (expires_at);

-- ---------------------------------------------------------------------
-- 7. audit_log
-- ---------------------------------------------------------------------
create table if not exists public.audit_log (
  id            uuid primary key default gen_random_uuid(),
  claim_id      uuid references public.claims(id) on delete cascade,
  actor_type    text not null,
  actor_id      text,
  action        text not null,
  target_table  text,
  target_id     uuid,
  details       jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists audit_log_claim_id_idx   on public.audit_log (claim_id);
create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);

-- ---------------------------------------------------------------------
-- updated_at trigger for claims
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists claims_set_updated_at on public.claims;
create trigger claims_set_updated_at
  before update on public.claims
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security: enable on every table, define NO policies.
-- Result: anon and authenticated are denied by default.
-- Server code uses the service role client, which bypasses RLS.
-- ---------------------------------------------------------------------
alter table public.claims                  enable row level security;
alter table public.documents               enable row level security;
alter table public.findings                enable row level security;
alter table public.gaps                    enable row level security;
alter table public.clarification_questions enable row level security;
alter table public.enrichment_cache        enable row level security;
alter table public.audit_log               enable row level security;

-- ---------------------------------------------------------------------
-- Storage bucket: claim-documents (private, 32 MB max per file)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('claim-documents', 'claim-documents', false, 33554432)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;
