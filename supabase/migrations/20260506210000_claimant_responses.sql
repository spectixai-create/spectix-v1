-- UI-002B claimant response core flow.
-- No notification sending is implemented in this migration.

DO $$
BEGIN
  IF to_regclass('public.question_dispatches') IS NULL THEN
    RAISE EXCEPTION 'Migration 0008 must be applied first';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.question_response_drafts (
  question_id text NOT NULL,
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  response_value jsonb NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (claim_id, question_id)
);

CREATE TABLE IF NOT EXISTS public.question_responses (
  question_id text NOT NULL,
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  response_value jsonb NOT NULL,
  responded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (claim_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_question_responses_claim
  ON public.question_responses(claim_id);

CREATE TABLE IF NOT EXISTS public.claimant_magic_links (
  token_hash text PRIMARY KEY,
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  revoked_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_claimant_magic_links_active
  ON public.claimant_magic_links(claim_id)
  WHERE used_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS response_to_question_id text NULL;

CREATE INDEX IF NOT EXISTS idx_documents_response_question
  ON public.documents(claim_id, response_to_question_id)
  WHERE response_to_question_id IS NOT NULL;

ALTER TABLE public.question_dispatches
  ADD COLUMN IF NOT EXISTS notification_sent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS notification_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notification_last_error text NULL,
  ADD COLUMN IF NOT EXISTS notification_channel text NULL;

ALTER TABLE public.question_dispatches
  DROP CONSTRAINT IF EXISTS question_dispatches_notification_channel_check;

ALTER TABLE public.question_dispatches
  ADD CONSTRAINT question_dispatches_notification_channel_check
  CHECK (notification_channel IS NULL OR notification_channel IN ('email', 'sms', 'both'));

ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_actor_type_check;

ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_actor_type_check
  CHECK (actor_type IN ('system', 'user', 'rule_engine', 'llm', 'gap_analyzer', 'human', 'claimant'));

ALTER TABLE public.question_response_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claimant_magic_links ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_claimant_magic_link(
  p_token_hash text,
  p_claim_id uuid
)
RETURNS public.claimant_magic_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.claimant_magic_links;
BEGIN
  SELECT *
  INTO v_link
  FROM public.claimant_magic_links
  WHERE token_hash = p_token_hash
    AND claim_id = p_claim_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'token_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_link.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'token_used' USING ERRCODE = 'P0002';
  END IF;

  IF v_link.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'token_revoked' USING ERRCODE = 'P0003';
  END IF;

  IF v_link.expires_at <= now() THEN
    RAISE EXCEPTION 'token_expired' USING ERRCODE = 'P0004';
  END IF;

  RETURN v_link;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_draft(
  p_token_hash text,
  p_claim_id uuid,
  p_question_id text,
  p_response_value jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saved_at timestamptz := now();
BEGIN
  PERFORM set_config('lock_timeout', '5s', true);
  PERFORM public.validate_claimant_magic_link(p_token_hash, p_claim_id);

  IF NOT EXISTS (
    SELECT 1
    FROM public.question_dispatches
    WHERE claim_id = p_claim_id
      AND question_id = p_question_id
  ) THEN
    RAISE EXCEPTION 'question_not_dispatched' USING ERRCODE = 'P0006';
  END IF;

  INSERT INTO public.question_response_drafts (
    claim_id,
    question_id,
    response_value,
    saved_at
  )
  VALUES (
    p_claim_id,
    p_question_id,
    p_response_value,
    v_saved_at
  )
  ON CONFLICT (claim_id, question_id)
  DO UPDATE SET
    response_value = EXCLUDED.response_value,
    saved_at = EXCLUDED.saved_at;

  RETURN jsonb_build_object(
    'claim_id', p_claim_id,
    'question_id', p_question_id,
    'saved_at', v_saved_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.link_document_to_question(
  p_token_hash text,
  p_claim_id uuid,
  p_document_id uuid,
  p_question_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('lock_timeout', '5s', true);
  PERFORM public.validate_claimant_magic_link(p_token_hash, p_claim_id);

  IF NOT EXISTS (
    SELECT 1
    FROM public.question_dispatches
    WHERE claim_id = p_claim_id
      AND question_id = p_question_id
  ) THEN
    RAISE EXCEPTION 'question_not_dispatched' USING ERRCODE = 'P0006';
  END IF;

  UPDATE public.documents
  SET response_to_question_id = p_question_id
  WHERE id = p_document_id
    AND claim_id = p_claim_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'document_not_found' USING ERRCODE = 'P0007';
  END IF;

  RETURN jsonb_build_object(
    'claim_id', p_claim_id,
    'question_id', p_question_id,
    'document_id', p_document_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_question_responses(
  p_token_hash text,
  p_claim_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim_status text;
  v_question_count int := 0;
  v_draft_count int := 0;
  v_new_document_ids jsonb := '[]'::jsonb;
BEGIN
  PERFORM set_config('lock_timeout', '5s', true);
  PERFORM public.validate_claimant_magic_link(p_token_hash, p_claim_id);

  SELECT status
  INTO v_claim_status
  FROM public.claims
  WHERE id = p_claim_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'claim_not_found' USING ERRCODE = 'P0010';
  END IF;

  IF v_claim_status <> 'pending_info' THEN
    RAISE EXCEPTION 'claim_not_pending_info' USING ERRCODE = 'P0009';
  END IF;

  SELECT count(*)
  INTO v_question_count
  FROM public.question_dispatches
  WHERE claim_id = p_claim_id;

  SELECT count(*)
  INTO v_draft_count
  FROM public.question_response_drafts d
  INNER JOIN public.question_dispatches q
    ON q.claim_id = d.claim_id
   AND q.question_id = d.question_id
  WHERE d.claim_id = p_claim_id;

  IF v_question_count = 0 THEN
    RAISE EXCEPTION 'no_questions_dispatched' USING ERRCODE = 'P0008';
  END IF;

  IF v_draft_count < v_question_count THEN
    RAISE EXCEPTION 'incomplete_responses' USING ERRCODE = 'P0005';
  END IF;

  INSERT INTO public.question_responses (
    claim_id,
    question_id,
    response_value,
    responded_at
  )
  SELECT
    claim_id,
    question_id,
    response_value,
    now()
  FROM public.question_response_drafts
  WHERE claim_id = p_claim_id
  ON CONFLICT (claim_id, question_id)
  DO UPDATE SET
    response_value = EXCLUDED.response_value,
    responded_at = EXCLUDED.responded_at;

  DELETE FROM public.question_response_drafts
  WHERE claim_id = p_claim_id;

  UPDATE public.claimant_magic_links
  SET used_at = now()
  WHERE token_hash = p_token_hash
    AND claim_id = p_claim_id;

  UPDATE public.claims
  SET status = 'processing',
      updated_at = now()
  WHERE id = p_claim_id;

  SELECT COALESCE(jsonb_agg(id ORDER BY created_at), '[]'::jsonb)
  INTO v_new_document_ids
  FROM public.documents
  WHERE claim_id = p_claim_id
    AND response_to_question_id IS NOT NULL
    AND processing_status = 'pending';

  INSERT INTO public.audit_log (
    claim_id,
    action,
    actor_type,
    actor_id,
    details
  )
  VALUES (
    p_claim_id,
    'claimant_response_submitted',
    'claimant',
    p_claim_id::text,
    jsonb_build_object(
      'claim_id', p_claim_id,
      'question_count', v_question_count,
      'new_document_count', jsonb_array_length(v_new_document_ids)
    )
  );

  RETURN jsonb_build_object(
    'claim_id', p_claim_id,
    'question_count', v_question_count,
    'new_document_ids', v_new_document_ids
  );
END;
$$;
