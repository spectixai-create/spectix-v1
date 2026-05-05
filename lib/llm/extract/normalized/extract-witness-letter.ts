import {
  extractNormalizedFromStorage,
  type NormalizedExtractorDeps,
  type NormalizedExtractionResult,
} from './build-envelope';

export const WITNESS_LETTER_NORMALIZED_PROMPT_ID =
  'sprint-002b:witness_letter:v1';

export function extractWitnessLetterNormalizedFromStorage(
  input: { documentId: string; fileName: string },
  deps?: NormalizedExtractorDeps,
): Promise<NormalizedExtractionResult> {
  return extractNormalizedFromStorage(
    {
      ...input,
      subtype: 'witness_letter',
      promptId: WITNESS_LETTER_NORMALIZED_PROMPT_ID,
    },
    deps,
  );
}
