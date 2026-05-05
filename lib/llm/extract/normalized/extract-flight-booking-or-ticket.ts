import {
  extractNormalizedFromStorage,
  type NormalizedExtractorDeps,
  type NormalizedExtractionResult,
} from './build-envelope';

export const FLIGHT_BOOKING_OR_TICKET_NORMALIZED_PROMPT_ID =
  'sprint-002b:flight_booking_or_ticket:v1';

export function extractFlightBookingOrTicketNormalizedFromStorage(
  input: { documentId: string; fileName: string },
  deps?: NormalizedExtractorDeps,
): Promise<NormalizedExtractionResult> {
  return extractNormalizedFromStorage(
    {
      ...input,
      subtype: 'flight_booking_or_ticket',
      promptId: FLIGHT_BOOKING_OR_TICKET_NORMALIZED_PROMPT_ID,
    },
    deps,
  );
}
