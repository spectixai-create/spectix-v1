import {
  extractNormalizedFromStorage,
  type NormalizedExtractorDeps,
  type NormalizedExtractionResult,
} from './build-envelope';

export const HOTEL_LETTER_NORMALIZED_PROMPT_ID = 'sprint-002b:hotel_letter:v1';

export function extractHotelLetterNormalizedFromStorage(
  input: { documentId: string; fileName: string },
  deps?: NormalizedExtractorDeps,
): Promise<NormalizedExtractionResult> {
  return extractNormalizedFromStorage(
    {
      ...input,
      subtype: 'hotel_letter',
      promptId: HOTEL_LETTER_NORMALIZED_PROMPT_ID,
    },
    deps,
  );
}
