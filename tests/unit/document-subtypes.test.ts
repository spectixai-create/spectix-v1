import { describe, expect, it } from 'vitest';

import {
  ALL_DOCUMENT_SUBTYPES,
  SUBTYPE_DAG_PHASE,
  SUBTYPE_LABELS_HE,
  SUBTYPES_BY_DOCUMENT_TYPE,
  canSkipSubtypeClassification,
  getOnlySubtype,
} from '@/lib/llm/document-subtypes';
import type { DocumentSubtype } from '@/lib/types';

const EXPECTED_SUBTYPES: DocumentSubtype[] = [
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
  'employer_letter',
];

describe('document subtype taxonomy', () => {
  it('maps exactly all 37 subtypes without duplicates', () => {
    expect(ALL_DOCUMENT_SUBTYPES).toHaveLength(37);
    expect(new Set(ALL_DOCUMENT_SUBTYPES).size).toBe(37);
    expect([...ALL_DOCUMENT_SUBTYPES].sort()).toEqual(
      [...EXPECTED_SUBTYPES].sort(),
    );
  });

  it('has Hebrew labels for every subtype', () => {
    expect(Object.keys(SUBTYPE_LABELS_HE).sort()).toEqual(
      [...EXPECTED_SUBTYPES].sort(),
    );
    expect(
      Object.values(SUBTYPE_LABELS_HE).every((label) => label.length > 0),
    ).toBe(true);
  });

  it('has DAG phase entries for every subtype', () => {
    expect(Object.keys(SUBTYPE_DAG_PHASE).sort()).toEqual(
      [...EXPECTED_SUBTYPES].sort(),
    );
  });

  it('knows which broad types can skip subtype classification', () => {
    for (const broad of [
      'police_report',
      'hotel_letter',
      'witness_letter',
      'photo',
    ] as const) {
      expect(canSkipSubtypeClassification(broad)).toBe(true);
    }

    for (const broad of [
      'receipt',
      'medical_report',
      'flight_doc',
      'other',
    ] as const) {
      expect(canSkipSubtypeClassification(broad)).toBe(false);
    }
  });

  it('returns only subtype for single-subtype broad types', () => {
    expect(getOnlySubtype('police_report')).toBe('police_report');
    expect(getOnlySubtype('hotel_letter')).toBe('hotel_letter');
    expect(getOnlySubtype('witness_letter')).toBe('witnesses');
    expect(getOnlySubtype('photo')).toBe('photos');
  });

  it('throws when getOnlySubtype is called for broad type with many subtypes', () => {
    expect(() => getOnlySubtype('receipt')).toThrow(/receipt/);
  });

  it('keeps phase 1 taxonomy entries stable', () => {
    expect(SUBTYPE_DAG_PHASE.claim_form).toBe(1);
    expect(SUBTYPE_DAG_PHASE.policy).toBe(1);
    expect(SUBTYPE_DAG_PHASE.policy_terms).toBe(1);
    expect(SUBTYPE_DAG_PHASE.id_or_passport).toBe(1);
    expect(SUBTYPE_DAG_PHASE.bank_account_confirmation).toBe(1);
    expect(SUBTYPE_DAG_PHASE.incident_affidavit).toBe(1);
  });

  it('marks medical_record_12mo as pass2_plus', () => {
    expect(SUBTYPE_DAG_PHASE.medical_record_12mo).toBe('pass2_plus');
  });

  it('splits pharmacy receipt and prescription into reachable broad parents', () => {
    expect(SUBTYPES_BY_DOCUMENT_TYPE.receipt).toContain('pharmacy_receipt');
    expect(SUBTYPES_BY_DOCUMENT_TYPE.medical_report).toContain('prescription');
    expect(SUBTYPES_BY_DOCUMENT_TYPE.other).not.toContain('pharmacy_receipt');
    expect(SUBTYPES_BY_DOCUMENT_TYPE.other).not.toContain('prescription');
  });
});
