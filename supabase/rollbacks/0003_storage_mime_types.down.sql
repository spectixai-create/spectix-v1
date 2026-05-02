-- Reverts the mime_types restriction added in 0003.
-- Pre-#0003 state: allowed_mime_types was NULL (not specified in #0001 bucket
-- creation - verified against migrations/0001_initial_schema.sql).
-- Bucket itself is NOT deleted - it predates D-015 and was created in #0001.

update storage.buckets
  set allowed_mime_types = null
  where id = 'claim-documents';
