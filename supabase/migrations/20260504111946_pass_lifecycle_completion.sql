begin;

set local lock_timeout = '30s';
set local statement_timeout = '60s';

-- =====================================================================
-- SPRINT-001 - pass lifecycle completion after document processing
--
-- Pass 1 is the claim-level document-processing pass. It is in progress
-- while any claim document is non-terminal, completed when every document
-- is terminal without blocking failure, and failed when all documents are
-- terminal and at least one has a blocking failure.
-- =====================================================================

create or replace function public.reopen_pass_for_document_processing(
  p_claim_id uuid,
  p_pass_number int default 1,
  p_reason text default 'document_uploaded',
  p_document_id uuid default null
) returns table (
  status text,
  reopened boolean
)
language plpgsql
as $$
declare
  v_previous_status text;
  v_reopened boolean := false;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(p_claim_id::text || ':' || p_pass_number::text, 0)
  );

  select p.status
    into v_previous_status
  from public.passes p
  where p.claim_id = p_claim_id
    and p.pass_number = p_pass_number
  for update;

  if v_previous_status = 'skipped' then
    return query select 'skipped'::text, false;
    return;
  end if;

  v_reopened := v_previous_status in ('completed', 'failed');

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
    'in_progress',
    now(),
    null
  )
  on conflict (claim_id, pass_number) do update
    set status = 'in_progress',
        started_at = coalesce(public.passes.started_at, now()),
        completed_at = null
  where public.passes.status <> 'skipped';

  if v_reopened then
    insert into public.audit_log (
      claim_id,
      actor_type,
      actor_id,
      action,
      target_table,
      target_id,
      details
    )
    values (
      p_claim_id,
      'system',
      'db:reopen_pass_for_document_processing',
      'claim/pass.reopened',
      'passes',
      p_document_id,
      jsonb_build_object(
        'pass_number', p_pass_number,
        'previous_status', v_previous_status,
        'reason', p_reason
      )
    );
  end if;

  return query select 'in_progress'::text, v_reopened;
end;
$$;

create or replace function public.retry_document_processing(
  p_document_id uuid,
  p_reason text default 'manual_retry',
  p_actor_type text default 'system',
  p_actor_id text default null
) returns table (
  claim_id uuid,
  document_id uuid,
  processing_status text,
  pass_status text
)
language plpgsql
as $$
declare
  v_document public.documents%rowtype;
  v_pass_status text;
begin
  select *
    into v_document
  from public.documents
  where id = p_document_id
  for update;

  if not found then
    raise exception 'Document % not found', p_document_id;
  end if;

  insert into public.audit_log (
    claim_id,
    actor_type,
    actor_id,
    action,
    target_table,
    target_id,
    details
  )
  values (
    v_document.claim_id,
    p_actor_type,
    p_actor_id,
    'document_processing_retry_requested',
    'documents',
    p_document_id,
    jsonb_build_object(
      'reason', p_reason,
      'previous_processing_status', v_document.processing_status,
      'previous_document_type', v_document.document_type,
      'previous_document_subtype', v_document.document_subtype,
      'previous_extracted_data', v_document.extracted_data
    )
  );

  update public.documents
    set processing_status = 'pending',
        document_type = 'other',
        document_subtype = null,
        extracted_data = null
  where id = p_document_id;

  select r.status
    into v_pass_status
  from public.reopen_pass_for_document_processing(
    v_document.claim_id,
    1,
    'document_retry',
    p_document_id
  ) r;

  return query select
    v_document.claim_id,
    p_document_id,
    'pending'::text,
    v_pass_status;
end;
$$;

create or replace function public.finalize_pass_after_document_processing(
  p_claim_id uuid,
  p_pass_number int default 1
) returns table (
  status text,
  terminal_documents int,
  failed_documents int,
  non_terminal_documents int,
  transitioned boolean,
  emit_completed_event boolean
)
language plpgsql
as $$
declare
  v_total_documents int;
  v_non_terminal_documents int;
  v_failed_documents int;
  v_final_status text;
  v_previous_status text;
  v_transitioned boolean := false;
  v_emit_completed_event boolean := false;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(p_claim_id::text || ':' || p_pass_number::text, 0)
  );

  select
    count(*)::int,
    count(*) filter (
      where processing_status is null
        or processing_status not in ('processed', 'failed')
        or (
          processing_status = 'processed'
          and lower(coalesce(extracted_data #>> '{document_processing,terminal}', 'true')) = 'false'
        )
    )::int,
    count(*) filter (
      where processing_status = 'failed'
        or (
          processing_status = 'processed'
          and extracted_data ? 'extraction_error'
          and lower(coalesce(extracted_data #>> '{extraction_error,blocking}', 'true')) <> 'false'
        )
    )::int
  into v_total_documents, v_non_terminal_documents, v_failed_documents
  from public.documents
  where claim_id = p_claim_id;

  if v_total_documents = 0 then
    return query select
      'no_documents'::text,
      0::int,
      0::int,
      0::int,
      false,
      false;
    return;
  end if;

  select p.status
    into v_previous_status
  from public.passes p
  where p.claim_id = p_claim_id
    and p.pass_number = p_pass_number
  for update;

  if v_previous_status = 'skipped' then
    return query select
      'skipped'::text,
      (v_total_documents - v_non_terminal_documents)::int,
      v_failed_documents::int,
      v_non_terminal_documents::int,
      false,
      false;
    return;
  end if;

  if v_non_terminal_documents > 0 then
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
      'in_progress',
      now(),
      null
    )
    on conflict (claim_id, pass_number) do update
      set status = 'in_progress',
          started_at = coalesce(public.passes.started_at, now()),
          completed_at = null
    where public.passes.status <> 'skipped';

    v_transitioned := v_previous_status is distinct from 'in_progress';

    return query select
      'in_progress'::text,
      (v_total_documents - v_non_terminal_documents)::int,
      v_failed_documents::int,
      v_non_terminal_documents::int,
      v_transitioned,
      false;
    return;
  end if;

  v_final_status := case
    when v_failed_documents > 0 then 'failed'
    else 'completed'
  end;

  v_transitioned := v_previous_status is distinct from v_final_status;
  v_emit_completed_event := v_final_status = 'completed' and v_transitioned;

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
        started_at = coalesce(public.passes.started_at, now()),
        completed_at = case
          when public.passes.status is distinct from excluded.status
            or public.passes.completed_at is null
          then now()
          else public.passes.completed_at
        end
  where public.passes.status <> 'skipped';

  if v_emit_completed_event then
    insert into public.audit_log (
      claim_id,
      actor_type,
      actor_id,
      action,
      target_table,
      target_id,
      details
    )
    values (
      p_claim_id,
      'system',
      'db:finalize_pass_after_document_processing',
      'claim/pass.completed',
      'passes',
      null,
      jsonb_build_object(
        'pass_number', p_pass_number,
        'terminal_documents', v_total_documents,
        'failed_documents', v_failed_documents
      )
    );
  end if;

  return query select
    v_final_status::text,
    v_total_documents::int,
    v_failed_documents::int,
    0::int,
    v_transitioned,
    v_emit_completed_event;
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

  if not exists (
    select 1 from information_schema.routines
    where routine_schema = 'public'
    and routine_name = 'reopen_pass_for_document_processing'
  ) then
    raise exception 'Verification failed: reopen_pass_for_document_processing function not created';
  end if;

  if not exists (
    select 1 from information_schema.routines
    where routine_schema = 'public'
    and routine_name = 'retry_document_processing'
  ) then
    raise exception 'Verification failed: retry_document_processing function not created';
  end if;
end;
$$;

commit;
