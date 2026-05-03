begin;

set local lock_timeout = '30s';
set local statement_timeout = '60s';

-- =====================================================================
-- Spike #03c — classifier preparation
--
-- Adds the document_type CHECK needed before Claude classification writes
-- real values, removes HEIC from the upload allowlist per D-017, and adds
-- the D-016 pass accounting helper used by Inngest.
-- =====================================================================

do $$
declare
  bad_count int;
  bad_values text[];
begin
  select count(*), array_agg(distinct document_type)
    into bad_count, bad_values
  from public.documents
  where document_type not in (
    'police_report', 'hotel_letter', 'receipt', 'medical_report',
    'witness_letter', 'flight_doc', 'photo', 'other'
  );

  if bad_count > 0 then
    raise exception
      'Pre-flight failed: % rows with document_type outside vocabulary. Values: %',
      bad_count, bad_values;
  end if;
end;
$$;

alter table public.documents
  add constraint documents_document_type_check
  check (document_type in (
    'police_report', 'hotel_letter', 'receipt', 'medical_report',
    'witness_letter', 'flight_doc', 'photo', 'other'
  ));

-- D-017: remove HEIC from new uploads. Existing HEIC objects remain
-- accessible; Supabase does not delete existing storage objects when a bucket
-- allowlist changes.
update storage.buckets
  set allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']
  where id = 'claim-documents';

create or replace function public.upsert_pass_increment(
  p_claim_id uuid,
  p_pass_number int,
  p_calls_increment int,
  p_cost_increment numeric
) returns void
language sql
as $$
  insert into public.passes (
    claim_id, pass_number, status, started_at,
    llm_calls_made, cost_usd
  )
  values (
    p_claim_id, p_pass_number, 'in_progress', now(),
    p_calls_increment, p_cost_increment
  )
  on conflict (claim_id, pass_number) do update
    set llm_calls_made = passes.llm_calls_made + excluded.llm_calls_made,
        cost_usd = passes.cost_usd + excluded.cost_usd,
        status = case
          when passes.status = 'pending' then 'in_progress'
          else passes.status
        end;
$$;

do $$
begin
  if not exists (
    select 1 from information_schema.routines
    where routine_schema = 'public'
    and routine_name = 'upsert_pass_increment'
  ) then
    raise exception 'Verification failed: upsert_pass_increment function not created';
  end if;
end;
$$;

commit;
