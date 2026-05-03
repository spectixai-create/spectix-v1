import { describe, expect, it } from 'vitest';

import {
  ALL_DOCUMENT_SUBTYPES,
  SUBTYPES_BY_DOCUMENT_TYPE,
} from '@/lib/llm/document-subtypes';
import {
  assertAllSubtypesMapped,
  routeBySubtype,
} from '@/lib/llm/extract/route-by-subtype';
import type { DocumentType } from '@/lib/types';

describe('routeBySubtype', () => {
  it('maps all 37 document subtypes through real broad/subtype pairs', () => {
    expect(ALL_DOCUMENT_SUBTYPES).toHaveLength(37);
    expect(() => assertAllSubtypesMapped()).not.toThrow();

    let count = 0;
    for (const [broad, subtypes] of Object.entries(SUBTYPES_BY_DOCUMENT_TYPE)) {
      for (const subtype of subtypes) {
        expect(() =>
          routeBySubtype(broad as DocumentType, subtype),
        ).not.toThrow();
        count += 1;
      }
    }
    expect(count).toBe(37);
  });

  it('returns skip_other for null subtype', () => {
    expect(routeBySubtype('receipt', null)).toBe('skip_other');
  });

  it('returns skip_other for broad other regardless of subtype', () => {
    expect(routeBySubtype('other', 'policy_terms')).toBe('skip_other');
  });

  it('routes representative extractor paths', () => {
    expect(routeBySubtype('receipt', 'pharmacy_receipt')).toBe('receipt');
    expect(routeBySubtype('police_report', 'police_report')).toBe('police');
    expect(routeBySubtype('hotel_letter', 'hotel_letter')).toBe(
      'hotel_generic',
    );
    expect(routeBySubtype('medical_report', 'medical_visit')).toBe('medical');
    expect(routeBySubtype('flight_doc', 'boarding_pass')).toBe(
      'skip_dedicated',
    );
  });

  it('routes prior mismatch cases without pretending broad kind matches payload', () => {
    expect(routeBySubtype('witness_letter', 'witnesses')).toBe('hotel_generic');
    expect(routeBySubtype('flight_doc', 'flight_booking')).toBe(
      'hotel_generic',
    );
    expect(routeBySubtype('flight_doc', 'flight_ticket')).toBe('hotel_generic');
  });

  it('throws on impossible broad/subtype pairs', () => {
    expect(() => routeBySubtype('receipt', 'police_report')).toThrow(
      'Impossible broad/subtype pair',
    );
  });
});
