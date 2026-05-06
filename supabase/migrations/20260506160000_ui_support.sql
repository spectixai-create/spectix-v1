-- SPRINT-UI-001: adjuster brief view support.
-- Adds review queue escalation state and question dispatch tracking.

ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS escalated_to_investigator boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.question_dispatches (
  question_id text NOT NULL,
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  first_dispatched_at timestamptz NOT NULL,
  last_dispatched_at timestamptz NOT NULL,
  dispatched_by uuid NOT NULL,
  last_dispatched_by uuid NOT NULL,
  edited_text text,
  PRIMARY KEY (claim_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_question_dispatches_claim
  ON public.question_dispatches(claim_id);

ALTER TABLE public.question_dispatches ENABLE ROW LEVEL SECURITY;
