-- Rollback for SPRINT-003A deterministic synthesis results.

BEGIN;

DROP FUNCTION IF EXISTS public.replace_synthesis_results(uuid, int, jsonb);
DROP INDEX IF EXISTS public.idx_synthesis_results_claim_pass;
DROP INDEX IF EXISTS public.idx_synthesis_results_claim;
DROP TABLE IF EXISTS public.synthesis_results;

COMMIT;
