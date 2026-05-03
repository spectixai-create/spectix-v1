begin;

set local lock_timeout = '30s';
set local statement_timeout = '60s';

-- =====================================================================
-- Spike #03d-1a — document_subtype column (D-018).
-- Two-tier document classification: broad DocumentType + fine
-- DocumentSubtype (37 values). Existing rows remain null until reprocessed.
-- =====================================================================

alter table public.documents
  add column if not exists document_subtype text null;

-- Remove any prior draft version before adding the canonical constraint.
alter table public.documents
  drop constraint if exists documents_document_subtype_check;

alter table public.documents
  add constraint documents_document_subtype_check
  check (document_subtype is null or document_subtype in (
    'claim_form',
    'policy',
    'policy_terms',
    'insurance_proposal',
    'id_or_passport',
    'bank_account_confirmation',
    'power_of_attorney',
    'medical_confidentiality_waiver',
    'flight_booking',
    'flight_ticket',
    'boarding_pass',
    'border_records',
    'incident_affidavit',
    'police_report',
    'pir_report',
    'hotel_letter',
    'general_receipt',
    'photos',
    'serial_or_imei',
    'witnesses',
    'medical_visit',
    'discharge_summary',
    'medical_receipt',
    'pharmacy_receipt',
    'prescription',
    'medical_record_12mo',
    'medical_evacuation',
    'flight_cancellation_letter',
    'replacement_booking',
    'damage_report',
    'rental_contract',
    'driver_license',
    'repair_estimate_or_invoice',
    'third_party_details',
    'travel_advisory',
    'embassy_contact_proof',
    'employer_letter'
  ));

create index if not exists documents_document_subtype_idx
  on public.documents (document_subtype)
  where document_subtype is not null;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'documents'
      and column_name = 'document_subtype'
  ) then
    raise exception 'Verification failed: document_subtype column not added';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'documents_document_subtype_check'
      and conrelid = 'public.documents'::regclass
  ) then
    raise exception 'Verification failed: documents_document_subtype_check constraint not created';
  end if;
end;
$$;

commit;
