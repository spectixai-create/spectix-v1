-- Rollback UI-003 Part 2 trip context, currency code, and minimal consent log.

DROP TABLE IF EXISTS public.consent_log;

DROP INDEX IF EXISTS public.claims_currency_code_idx;

ALTER TABLE public.claims
  DROP CONSTRAINT IF EXISTS claims_currency_code_format_check,
  DROP CONSTRAINT IF EXISTS claims_trip_dates_order_check,
  DROP CONSTRAINT IF EXISTS claims_pre_trip_insurance_check;

ALTER TABLE public.claims
  DROP COLUMN IF EXISTS currency_code,
  DROP COLUMN IF EXISTS trip_start_date,
  DROP COLUMN IF EXISTS trip_end_date,
  DROP COLUMN IF EXISTS pre_trip_insurance;
