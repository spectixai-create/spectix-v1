import { describe, expect, it } from 'vitest';

import {
  ALL_DOCUMENT_SUBTYPES,
  SUBTYPES_BY_DOCUMENT_TYPE,
} from '@/lib/llm/document-subtypes';
import {
  assertAllNormalizedSubtypesMapped,
  dbSubtypeToNormalizedRouteTable,
  routeByNormalizedSubtype,
} from '@/lib/llm/extract/normalized';
import type { DocumentSubtype, DocumentType } from '@/lib/types';

describe('routeByNormalizedSubtype', () => {
  it('maps the seven MVP DB subtypes to normalized routes', () => {
    expect(routeByNormalizedSubtype('receipt', 'general_receipt')).toBe(
      'receipt_general',
    );
    expect(routeByNormalizedSubtype('police_report', 'police_report')).toBe(
      'police_report',
    );
    expect(routeByNormalizedSubtype('medical_report', 'medical_visit')).toBe(
      'medical_visit',
    );
    expect(routeByNormalizedSubtype('hotel_letter', 'hotel_letter')).toBe(
      'hotel_letter',
    );
    expect(routeByNormalizedSubtype('flight_doc', 'flight_booking')).toBe(
      'flight_booking_or_ticket',
    );
    expect(routeByNormalizedSubtype('flight_doc', 'flight_ticket')).toBe(
      'flight_booking_or_ticket',
    );
    expect(routeByNormalizedSubtype('flight_doc', 'boarding_pass')).toBe(
      'boarding_pass',
    );
    expect(routeByNormalizedSubtype('witness_letter', 'witnesses')).toBe(
      'witness_letter',
    );
  });

  it('maps all remaining known subtypes to fallback_broad', () => {
    const dedicated = new Set(Object.keys(dbSubtypeToNormalizedRouteTable()));
    const fallbackSubtypes = ALL_DOCUMENT_SUBTYPES.filter(
      (subtype) => !dedicated.has(subtype),
    );

    expect(fallbackSubtypes).toHaveLength(29);

    for (const [broad, subtypes] of Object.entries(SUBTYPES_BY_DOCUMENT_TYPE)) {
      for (const subtype of subtypes) {
        if (dedicated.has(subtype)) continue;

        expect(routeByNormalizedSubtype(broad as DocumentType, subtype)).toBe(
          'fallback_broad',
        );
      }
    }
  });

  it('returns fallback_broad for null subtype and broad other', () => {
    expect(routeByNormalizedSubtype('receipt', null)).toBe('fallback_broad');
    expect(routeByNormalizedSubtype('other', 'policy_terms')).toBe(
      'fallback_broad',
    );
  });

  it('throws on impossible broad/subtype pairs', () => {
    expect(() => routeByNormalizedSubtype('receipt', 'police_report')).toThrow(
      'Impossible broad/subtype pair',
    );
  });

  it('asserts every known subtype maps to a normalized route or fallback', () => {
    expect(ALL_DOCUMENT_SUBTYPES).toHaveLength(37);
    expect(() => assertAllNormalizedSubtypesMapped()).not.toThrow();
  });

  it('does not silently complete unknown subtype values', () => {
    expect(() =>
      routeByNormalizedSubtype('receipt', 'unknown_subtype' as DocumentSubtype),
    ).toThrow('Impossible broad/subtype pair');
  });
});
