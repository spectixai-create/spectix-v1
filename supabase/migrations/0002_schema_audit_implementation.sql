-- =====================================================================
-- Spike #migration-0002 — schema audit implementation
--
-- Adds columns identified in /docs/SCHEMA_AUDIT.md:
--   - claims: contact/policy/pipeline/brief columns + CHECK constraints
--   - passes (NEW table) with FK to claims, CHECK on status/risk_band
--   - documents: processing_status + CHECK
--   - clarification_questions: urgency/closure fields + CHECK constraints
--     (no FK on resolved_by per Supabase auth.users restrictions)
--   - findings: lifecycle/context fields + CHECK constraints
--   - gaps: fill fields + CHECK constraints + updated_at trigger
--   - Trigger: update_claim_pipeline_state on passes write
--
-- Wrapped in transaction. ROLLBACK on any failure.
-- =====================================================================

BEGIN;

SET LOCAL lock_timeout = '30s';
SET LOCAL statement_timeout = '60s';

-- ======================================================================
-- PRE-FLIGHT: verify existing data conforms to upcoming CHECK constraints
-- ======================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.claims WHERE status NOT IN (
      'intake', 'processing', 'pending_info', 'ready', 'reviewed',
      'rejected_no_coverage', 'cost_capped'
    )
  ) THEN
    RAISE EXCEPTION 'Pre-flight: claims.status has values outside allowed enum. Manual cleanup required before migration.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.clarification_questions WHERE status NOT IN (
      'pending', 'sent', 'answered', 'closed'
    )
  ) THEN
    RAISE EXCEPTION 'Pre-flight: clarification_questions.status has invalid values.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.findings
    WHERE severity IS NOT NULL AND severity NOT IN ('low', 'medium', 'high')
  ) THEN
    RAISE EXCEPTION 'Pre-flight: findings.severity has values outside (low|medium|high). Possibly "critical" — decide whether to widen CHECK or normalize data.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.gaps WHERE status NOT IN ('open', 'resolved', 'ignored')
  ) THEN
    RAISE EXCEPTION 'Pre-flight: gaps.status has invalid values.';
  END IF;
END $$;

-- ======================================================================
-- 1. claims table additions
-- ======================================================================

ALTER TABLE public.claims ADD COLUMN claimant_email text;
ALTER TABLE public.claims ADD COLUMN claimant_phone text;
ALTER TABLE public.claims ADD COLUMN policy_number text;
CREATE INDEX claims_policy_number_idx ON public.claims (policy_number);
ALTER TABLE public.claims ADD COLUMN current_pass int DEFAULT 0;
ALTER TABLE public.claims ADD COLUMN total_llm_cost_usd numeric DEFAULT 0;
ALTER TABLE public.claims ADD COLUMN brief_text text;
ALTER TABLE public.claims ADD COLUMN brief_pass_number int;
ALTER TABLE public.claims ADD COLUMN brief_recommendation text;
ALTER TABLE public.claims ADD COLUMN brief_generated_at timestamptz;

ALTER TABLE public.claims ADD CONSTRAINT claims_status_valid
  CHECK (status IN (
    'intake', 'processing', 'pending_info', 'ready', 'reviewed',
    'rejected_no_coverage', 'cost_capped'
  ));

ALTER TABLE public.claims ADD CONSTRAINT claims_brief_recommendation_valid
  CHECK (brief_recommendation IS NULL OR brief_recommendation IN (
    'approve', 'request_info', 'deep_investigation', 'reject_no_coverage'
  ));

-- ======================================================================
-- 2. passes table
-- ======================================================================

CREATE TABLE public.passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  pass_number int NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  risk_band text,
  findings_count int DEFAULT 0,
  gaps_count int DEFAULT 0,
  llm_calls_made int DEFAULT 0,
  cost_usd numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (claim_id, pass_number),
  CONSTRAINT passes_status_valid CHECK (status IN (
    'pending', 'in_progress', 'completed', 'skipped', 'failed'
  )),
  CONSTRAINT passes_risk_band_valid CHECK (risk_band IS NULL OR risk_band IN (
    'green', 'yellow', 'orange', 'red'
  ))
);

CREATE INDEX passes_claim_id_idx ON public.passes (claim_id);
CREATE INDEX passes_status_idx ON public.passes (status);

ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;

-- ======================================================================
-- 3. documents table additions
-- ======================================================================

ALTER TABLE public.documents ADD COLUMN processing_status text DEFAULT 'pending';
ALTER TABLE public.documents ADD CONSTRAINT documents_processing_status_valid
  CHECK (processing_status IN ('pending', 'processing', 'processed', 'failed'));

-- ======================================================================
-- 4. clarification_questions table additions
-- ======================================================================
-- resolved_by intentionally has no FK to auth.users due to Supabase schema
-- permission restrictions. Application-level enforcement only.

ALTER TABLE public.clarification_questions ADD COLUMN urgency text DEFAULT 'normal';
ALTER TABLE public.clarification_questions ADD COLUMN resolved_by uuid;
ALTER TABLE public.clarification_questions ADD COLUMN resolution_note text;
ALTER TABLE public.clarification_questions ADD COLUMN closed_at timestamptz;

ALTER TABLE public.clarification_questions ADD CONSTRAINT cq_urgency_valid
  CHECK (urgency IN ('urgent', 'normal'));
ALTER TABLE public.clarification_questions ADD CONSTRAINT cq_status_valid
  CHECK (status IN ('pending', 'sent', 'answered', 'closed'));

-- ======================================================================
-- 5. findings table additions
-- ======================================================================

ALTER TABLE public.findings ADD COLUMN severity_adjusted_by_context boolean DEFAULT false;
ALTER TABLE public.findings ADD COLUMN severity_original text;
ALTER TABLE public.findings ADD COLUMN status text DEFAULT 'open';
ALTER TABLE public.findings ADD COLUMN resolved_in_pass int;
ALTER TABLE public.findings ADD COLUMN recommended_action text;

ALTER TABLE public.findings ADD CONSTRAINT findings_severity_valid
  CHECK (severity IS NULL OR severity IN ('low', 'medium', 'high'));
ALTER TABLE public.findings ADD CONSTRAINT findings_severity_original_valid
  CHECK (severity_original IS NULL OR severity_original IN ('low', 'medium', 'high'));
ALTER TABLE public.findings ADD CONSTRAINT findings_status_valid
  CHECK (status IN ('open', 'resolved', 'persisted'));

-- ======================================================================
-- 6. gaps table additions
-- ======================================================================

ALTER TABLE public.gaps ADD COLUMN fill_method text;
ALTER TABLE public.gaps ADD COLUMN fill_target text;
ALTER TABLE public.gaps ADD COLUMN filled_in_pass int;
ALTER TABLE public.gaps ADD COLUMN filled_value jsonb;
ALTER TABLE public.gaps ADD COLUMN updated_at timestamptz DEFAULT now();

UPDATE public.gaps SET updated_at = created_at;

ALTER TABLE public.gaps ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.gaps ADD CONSTRAINT gaps_status_valid
  CHECK (status IN ('open', 'resolved', 'ignored'));
ALTER TABLE public.gaps ADD CONSTRAINT gaps_fill_method_valid
  CHECK (fill_method IS NULL OR fill_method IN (
    'auto_api', 'auto_osint', 'manual_claimant', 'manual_adjuster'
  ));

DROP TRIGGER IF EXISTS gaps_set_updated_at ON public.gaps;
CREATE TRIGGER gaps_set_updated_at
  BEFORE UPDATE ON public.gaps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ======================================================================
-- 7. Trigger function: update claims pipeline state from passes
-- ======================================================================

CREATE OR REPLACE FUNCTION public.update_claim_pipeline_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.claims SET current_pass = COALESCE((
    SELECT MAX(pass_number)
    FROM public.passes
    WHERE claim_id = NEW.claim_id
    AND status IN ('in_progress', 'completed', 'skipped', 'failed')
  ), 0) WHERE id = NEW.claim_id;

  UPDATE public.claims SET total_llm_cost_usd = COALESCE((
    SELECT SUM(cost_usd)
    FROM public.passes
    WHERE claim_id = NEW.claim_id
  ), 0) WHERE id = NEW.claim_id;

  UPDATE public.claims SET risk_band = (
    SELECT risk_band
    FROM public.passes
    WHERE claim_id = NEW.claim_id
    AND status = 'completed'
    AND risk_band IS NOT NULL
    ORDER BY pass_number DESC
    LIMIT 1
  ) WHERE id = NEW.claim_id
  AND EXISTS (
    SELECT 1 FROM public.passes
    WHERE claim_id = NEW.claim_id
    AND status = 'completed'
    AND risk_band IS NOT NULL
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS passes_update_claim_state ON public.passes;
CREATE TRIGGER passes_update_claim_state
  AFTER INSERT OR UPDATE OF status, risk_band, cost_usd
  ON public.passes
  FOR EACH ROW EXECUTE FUNCTION public.update_claim_pipeline_state();

-- ======================================================================
-- 8. Verification queries
-- ======================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'claims'
    AND column_name = 'policy_number'
  ) THEN
    RAISE EXCEPTION 'Verification failed: claims.policy_number not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'passes'
  ) THEN
    RAISE EXCEPTION 'Verification failed: passes table not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_schema = 'public'
    AND event_object_table = 'passes'
    AND trigger_name = 'passes_update_claim_state'
  ) THEN
    RAISE EXCEPTION 'Verification failed: passes_update_claim_state trigger not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_schema = 'public'
    AND event_object_table = 'gaps'
    AND trigger_name = 'gaps_set_updated_at'
  ) THEN
    RAISE EXCEPTION 'Verification failed: gaps_set_updated_at trigger not created';
  END IF;
END $$;

COMMIT;
