import { describe, expect, it } from 'vitest';

import { ALL_DOCUMENT_SUBTYPES } from '@/lib/llm/document-subtypes';
import {
  assertAllSubtypesMapped,
  routeBySubtype,
} from '@/lib/llm/extract/route-by-subtype';

describe('routeBySubtype', () => {
  it('maps all 37 document subtypes', () => {
    expect(ALL_DOCUMENT_SUBTYPES).toHaveLength(37);
    expect(() => assertAllSubtypesMapped()).not.toThrow();

    for (const subtype of ALL_DOCUMENT_SUBTYPES) {
      expect(() => routeBySubtype('receipt', subtype)).not.toThrow();
    }
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
});
