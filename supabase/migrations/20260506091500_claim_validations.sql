-- =====================================================================
-- SPRINT-002C — claim validation layer results
--
-- Adds storage for deterministic claim-level validation layers 11.1-11.3.
-- Uses pass_number because the repository's passes table has no typed
-- pass kind and D-016 keys pass accounting by (claim_id, pass_number).
-- =====================================================================

BEGIN;

SET LOCAL lock_timeout = '30s';
SET LOCAL statement_timeout = '60s';

CREATE TABLE IF NOT EXISTS public.claim_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  pass_number int NOT NULL,
  layer_id text NOT NULL,
  status text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT claim_validations_layer_id_valid CHECK (
    layer_id IN ('11.1', '11.2', '11.3')
  ),
  CONSTRAINT claim_validations_status_valid CHECK (
    status IN ('completed', 'failed', 'skipped')
  ),
  CONSTRAINT claim_validations_uq_claim_passnum_layer UNIQUE (
    claim_id,
    pass_number,
    layer_id
  )
);

CREATE INDEX IF NOT EXISTS idx_claim_validations_claim
  ON public.claim_validations(claim_id);

CREATE INDEX IF NOT EXISTS idx_claim_validations_pass
  ON public.claim_validations(claim_id, pass_number);

ALTER TABLE public.claim_validations ENABLE ROW LEVEL SECURITY;

COMMIT;
