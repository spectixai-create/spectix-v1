begin;

set local lock_timeout = '30s';
set local statement_timeout = '60s';

drop index if exists public.documents_document_subtype_idx;

alter table public.documents
  drop constraint if exists documents_document_subtype_check;

alter table public.documents
  drop column if exists document_subtype;

commit;
