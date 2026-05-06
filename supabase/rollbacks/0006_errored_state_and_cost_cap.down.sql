begin;

set local lock_timeout = '30s';
set local statement_timeout = '60s';

do $$
begin
  if exists (select 1 from public.claims where status = 'errored') then
    raise exception 'Cannot roll back errored status while claims.status contains errored rows';
  end if;
end $$;

alter table public.claims
  drop constraint if exists claims_status_valid;

alter table public.claims
  add constraint claims_status_valid
  check (
    status in (
      'intake',
      'processing',
      'pending_info',
      'ready',
      'reviewed',
      'rejected_no_coverage',
      'cost_capped'
    )
  );

commit;
