begin;

set local lock_timeout = '30s';
set local statement_timeout = '60s';

-- =====================================================================
-- SPRINT-001 — pass lifecycle completion after document processing
--
-- Pass 1 tracks claim-level document-processing work and cumulative LLM
-- cost. This helper is called after a document reaches a terminal
-- processing state. It completes pass 1 when every document for the claim
-- is terminal, or marks it failed when any document is failed.
-- =====================================================================

create or replace function public.finalize_pass_after_document_processing(
  p_claim_id uuid,
  p_pass_number int default 1
) returns table (
  status text,
  terminal_documents int,
  failed_documents int,
  pending_documents int,
  transitioned boolean
)
language plpgsql
as $$
declare
  v_total_documents int;
  v_pending_documents int;
  v_failed_documents int;
  v_final_status text;
  v_previous_status text;
  v_previous_completed_at timestamptz;
begin
  select
    count(*)::int,
    count(*) filter (
      where processing_status in ('pending', 'processing')
    )::int,
    count(*) filter (where processing_status = 'failed')::int
  into v_total_documents, v_pending_documents, v_failed_documents
  from public.documents
  where claim_id = p_claim_id;

  if v_total_documents = 0 then
    return query select
      'no_documents'::text,
      0::int,
      0::int,
      0::int,
      false;
    return;
  end if;

  if v_pending_documents > 0 then
    return query select
      'in_progress'::text,
      (v_total_documents - v_pending_documents)::int,
      v_failed_documents::int,
      v_pending_documents::int,
      false;
    return;
  end if;

  v_final_status := case
    when v_failed_documents > 0 then 'failed'
    else 'completed'
  end;

  select p.status, p.completed_at
  into v_previous_status, v_previous_completed_at
  from public.passes p
  where p.claim_id = p_claim_id
    and p.pass_number = p_pass_number
  for update;

  if v_previous_status = 'skipped' then
    return query select
      v_previous_status::text,
      v_total_documents::int,
      v_failed_documents::int,
      0::int,
      false;
    return;
  end if;

  insert into public.passes (
    claim_id,
    pass_number,
    status,
    started_at,
    completed_at
  )
  values (
    p_claim_id,
    p_pass_number,
    v_final_status,
    now(),
    now()
  )
  on conflict (claim_id, pass_number) do update
    set status = excluded.status,
        completed_at = case
          when public.passes.completed_at is null
            or public.passes.status is distinct from excluded.status
          then now()
          else public.passes.completed_at
        end
  where public.passes.status <> 'skipped';

  return query select
    v_final_status::text,
    v_total_documents::int,
    v_failed_documents::int,
    0::int,
    (
      v_previous_status is null
      or v_previous_status is distinct from v_final_status
      or v_previous_completed_at is null
    );
end;
$$;

do $$
begin
  if not exists (
    select 1 from information_schema.routines
    where routine_schema = 'public'
    and routine_name = 'finalize_pass_after_document_processing'
  ) then
    raise exception 'Verification failed: finalize_pass_after_document_processing function not created';
  end if;
end;
$$;

commit;
