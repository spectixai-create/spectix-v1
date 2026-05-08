-- UI-003 Part 2: trip context, currency code, and minimal consent audit.
-- Consent audit intentionally stores no IP, user-agent, cookies, headers, or
-- fingerprinting metadata.

ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS currency_code text NOT NULL DEFAULT 'ILS',
  ADD COLUMN IF NOT EXISTS trip_start_date date NULL,
  ADD COLUMN IF NOT EXISTS trip_end_date date NULL,
  ADD COLUMN IF NOT EXISTS pre_trip_insurance text NULL;

UPDATE public.claims
SET currency_code = upper(coalesce(nullif(currency_code, ''), nullif(currency, ''), 'ILS'))
WHERE currency_code IS NULL
   OR currency_code = '';

ALTER TABLE public.claims
  DROP CONSTRAINT IF EXISTS claims_currency_code_format_check,
  DROP CONSTRAINT IF EXISTS claims_trip_dates_order_check,
  DROP CONSTRAINT IF EXISTS claims_pre_trip_insurance_check;

ALTER TABLE public.claims
  ADD CONSTRAINT claims_currency_code_format_check
    CHECK (currency_code ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT claims_trip_dates_order_check
    CHECK (
      trip_start_date IS NULL
      OR trip_end_date IS NULL
      OR trip_end_date >= trip_start_date
    ),
  ADD CONSTRAINT claims_pre_trip_insurance_check
    CHECK (
      pre_trip_insurance IS NULL
      OR pre_trip_insurance IN ('yes', 'no', 'unknown')
    );

CREATE INDEX IF NOT EXISTS claims_currency_code_idx
  ON public.claims(currency_code);

CREATE TABLE IF NOT EXISTS public.consent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  tos_version text NOT NULL,
  privacy_version text NOT NULL,
  accepted_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consent_log_claim_id_idx
  ON public.consent_log(claim_id);

ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;
