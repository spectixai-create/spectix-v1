-- Rollback for SPRINT-UI-001 adjuster brief view support.

DROP INDEX IF EXISTS public.idx_question_dispatches_claim;
DROP TABLE IF EXISTS public.question_dispatches;

ALTER TABLE public.claims
  DROP COLUMN IF EXISTS escalated_to_investigator;
