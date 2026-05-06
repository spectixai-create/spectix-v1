import {
  extractNormalizedFromStorage,
  type NormalizedExtractorDeps,
  type NormalizedExtractionResult,
} from './build-envelope';

export const MEDICAL_VISIT_NORMALIZED_PROMPT_ID =
  'sprint-002b:medical_visit:v1';

export function extractMedicalVisitNormalizedFromStorage(
  input: { documentId: string; fileName: string },
  deps?: NormalizedExtractorDeps,
): Promise<NormalizedExtractionResult> {
  return extractNormalizedFromStorage(
    {
      ...input,
      subtype: 'medical_visit',
      promptId: MEDICAL_VISIT_NORMALIZED_PROMPT_ID,
    },
    deps,
  );
}
