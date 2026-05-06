import {
  extractNormalizedFromStorage,
  type NormalizedExtractorDeps,
  type NormalizedExtractionResult,
} from './build-envelope';

export const RECEIPT_GENERAL_NORMALIZED_PROMPT_ID =
  'sprint-002b:receipt_general:v1';

export function extractReceiptGeneralNormalizedFromStorage(
  input: { claimId: string; documentId: string; fileName: string },
  deps?: NormalizedExtractorDeps,
): Promise<NormalizedExtractionResult> {
  return extractNormalizedFromStorage(
    {
      ...input,
      subtype: 'receipt_general',
      promptId: RECEIPT_GENERAL_NORMALIZED_PROMPT_ID,
    },
    deps,
  );
}
