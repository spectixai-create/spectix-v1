import {
  extractNormalizedFromStorage,
  type NormalizedExtractorDeps,
  type NormalizedExtractionResult,
} from './build-envelope';

export const BOARDING_PASS_NORMALIZED_PROMPT_ID =
  'sprint-002b:boarding_pass:v1';

export function extractBoardingPassNormalizedFromStorage(
  input: { documentId: string; fileName: string },
  deps?: NormalizedExtractorDeps,
): Promise<NormalizedExtractionResult> {
  return extractNormalizedFromStorage(
    {
      ...input,
      subtype: 'boarding_pass',
      promptId: BOARDING_PASS_NORMALIZED_PROMPT_ID,
    },
    deps,
  );
}
