-- Spike #03a - restrict claim-documents bucket to image/pdf MIME types.
-- Bucket itself was created in 0001_initial_schema.sql (32MB, no mime
-- restriction). file_size_limit is INTENTIONALLY unchanged here; the API
-- endpoint enforces a stricter 4MB limit per Vercel platform body cap.
--
-- ON CONFLICT DO UPDATE is INTENTIONAL: re-running this migration RESTORES
-- the authoritative mime allowlist, undoing any manual modifications. Do not
-- change to DO NOTHING - that would let drift persist.
--
-- No storage.objects RLS policies are added. Supabase enables RLS on
-- storage.objects by default with no policies = deny-by-default for
-- anon/authenticated. service_role bypasses RLS. Frontend never touches
-- Storage directly - all uploads go via the API endpoint.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'claim-documents',
  'claim-documents',
  false,
  33554432,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/heic']
)
on conflict (id) do update
  set allowed_mime_types = excluded.allowed_mime_types;
