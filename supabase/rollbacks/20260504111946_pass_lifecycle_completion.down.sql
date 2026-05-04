begin;

set local lock_timeout = '30s';
set local statement_timeout = '60s';

drop function if exists public.finalize_pass_after_document_processing(uuid, int);
drop function if exists public.retry_document_processing(uuid, text, text, text);
drop function if exists public.reopen_pass_for_document_processing(uuid, int, text, uuid);

commit;
