import type { NormalizedExtractionRoute } from '@/lib/extraction-contracts';
import {
  ALL_DOCUMENT_SUBTYPES,
  SUBTYPES_BY_DOCUMENT_TYPE,
} from '@/lib/llm/document-subtypes';
import type { DocumentSubtype, DocumentType } from '@/lib/types';

export type NormalizedSubtypeRoute =
  | NormalizedExtractionRoute
  | 'fallback_broad';

const DB_SUBTYPE_TO_NORMALIZED_ROUTE: Partial<
  Record<DocumentSubtype, NormalizedExtractionRoute>
> = {
  general_receipt: 'receipt_general',
  police_report: 'police_report',
  medical_visit: 'medical_visit',
  hotel_letter: 'hotel_letter',
  flight_booking: 'flight_booking_or_ticket',
  flight_ticket: 'flight_booking_or_ticket',
  boarding_pass: 'boarding_pass',
  witnesses: 'witness_letter',
};

export function routeByNormalizedSubtype(
  broad: DocumentType,
  subtype: DocumentSubtype | null,
): NormalizedSubtypeRoute {
  if (subtype === null) return 'fallback_broad';
  if (broad === 'other') return 'fallback_broad';

  if (!SUBTYPES_BY_DOCUMENT_TYPE[broad].includes(subtype)) {
    throw new Error(
      `Impossible broad/subtype pair: ${broad} + ${subtype}. Check classifier output.`,
    );
  }

  return DB_SUBTYPE_TO_NORMALIZED_ROUTE[subtype] ?? 'fallback_broad';
}

export function assertAllNormalizedSubtypesMapped(): void {
  const invalid = ALL_DOCUMENT_SUBTYPES.filter((subtype) => {
    const route = DB_SUBTYPE_TO_NORMALIZED_ROUTE[subtype] ?? 'fallback_broad';
    return (
      route !== 'fallback_broad' &&
      ![
        'receipt_general',
        'police_report',
        'medical_visit',
        'hotel_letter',
        'flight_booking_or_ticket',
        'boarding_pass',
        'witness_letter',
      ].includes(route)
    );
  });

  if (invalid.length > 0) {
    throw new Error(
      `Invalid normalized subtype mappings: ${invalid.join(', ')}`,
    );
  }
}

export function dbSubtypeToNormalizedRouteTable(): Partial<
  Record<DocumentSubtype, NormalizedExtractionRoute>
> {
  return { ...DB_SUBTYPE_TO_NORMALIZED_ROUTE };
}
