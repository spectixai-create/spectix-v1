-- Rollback for SPRINT-002C claim validation layer results.

BEGIN;

DROP INDEX IF EXISTS public.idx_claim_validations_pass;
DROP INDEX IF EXISTS public.idx_claim_validations_claim;
DROP TABLE IF EXISTS public.claim_validations;

COMMIT;
