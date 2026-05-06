-- =====================================================================
-- SPRINT-003A - deterministic synthesis results
--
-- Adds storage for deterministic synthesis findings, clarification
-- questions, and readiness score. Uses Form B pass_number semantics.
-- =====================================================================

BEGIN;

SET LOCAL lock_timeout = '30s';
SET LOCAL statement_timeout = '60s';

CREATE TABLE IF NOT EXISTS public.synthesis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  pass_number int NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT synthesis_results_kind_valid CHECK (
    kind IN ('finding', 'question', 'readiness_score')
  )
);

CREATE INDEX IF NOT EXISTS idx_synthesis_results_claim
  ON public.synthesis_results(claim_id);

CREATE INDEX IF NOT EXISTS idx_synthesis_results_claim_pass
  ON public.synthesis_results(claim_id, pass_number);

ALTER TABLE public.synthesis_results ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.replace_synthesis_results(
  p_claim_id uuid,
  p_pass_number int,
  p_results jsonb
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF jsonb_typeof(p_results) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'p_results must be a JSON array';
  END IF;

  DELETE FROM public.synthesis_results
  WHERE claim_id = p_claim_id
    AND pass_number = p_pass_number;

  INSERT INTO public.synthesis_results (
    claim_id,
    pass_number,
    kind,
    payload
  )
  SELECT
    p_claim_id,
    p_pass_number,
    result.kind,
    result.payload
  FROM jsonb_to_recordset(p_results) AS result(kind text, payload jsonb);
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'synthesis_results'
  ) THEN
    RAISE EXCEPTION 'Verification failed: synthesis_results table not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'replace_synthesis_results'
  ) THEN
    RAISE EXCEPTION 'Verification failed: replace_synthesis_results function not created';
  END IF;
END;
$$;

COMMIT;
