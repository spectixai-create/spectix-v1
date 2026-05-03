begin;

set local lock_timeout = '30s';
set local statement_timeout = '60s';

drop function if exists public.upsert_pass_increment(uuid, int, int, numeric);

update storage.buckets
  set allowed_mime_types = array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic'
  ]
  where id = 'claim-documents';

alter table public.documents
  drop constraint if exists documents_document_type_check;

commit;
