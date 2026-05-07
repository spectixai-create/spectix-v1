-- Rollback for UI-002B claimant response core flow.

DROP FUNCTION IF EXISTS public.finalize_question_responses(text, uuid);
DROP FUNCTION IF EXISTS public.link_document_to_question(text, uuid, uuid, text);
DROP FUNCTION IF EXISTS public.save_draft(text, uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.validate_claimant_magic_link(text, uuid);

ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_actor_type_check;

ALTER TABLE public.question_dispatches
  DROP CONSTRAINT IF EXISTS question_dispatches_notification_channel_check;

ALTER TABLE public.question_dispatches
  DROP COLUMN IF EXISTS notification_channel,
  DROP COLUMN IF EXISTS notification_last_error,
  DROP COLUMN IF EXISTS notification_attempts,
  DROP COLUMN IF EXISTS notification_sent_at;

DROP INDEX IF EXISTS public.idx_documents_response_question;

ALTER TABLE public.documents
  DROP COLUMN IF EXISTS response_to_question_id;

DROP INDEX IF EXISTS public.idx_claimant_magic_links_active;
DROP TABLE IF EXISTS public.claimant_magic_links;

DROP INDEX IF EXISTS public.idx_question_responses_claim;
DROP TABLE IF EXISTS public.question_responses;
DROP TABLE IF EXISTS public.question_response_drafts;
