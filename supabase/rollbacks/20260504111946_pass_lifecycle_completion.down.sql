begin;

set local lock_timeout = '30s';
set local statement_timeout = '60s';

drop function if exists public.finalize_pass_after_document_processing(uuid, int);

commit;
