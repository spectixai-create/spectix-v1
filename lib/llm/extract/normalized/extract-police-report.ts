import {
  extractNormalizedFromStorage,
  type NormalizedExtractorDeps,
  type NormalizedExtractionResult,
} from './build-envelope';

export const POLICE_REPORT_NORMALIZED_PROMPT_ID =
  'sprint-002b:police_report:v1';

export function extractPoliceReportNormalizedFromStorage(
  input: { documentId: string; fileName: string },
  deps?: NormalizedExtractorDeps,
): Promise<NormalizedExtractionResult> {
  return extractNormalizedFromStorage(
    {
      ...input,
      subtype: 'police_report',
      promptId: POLICE_REPORT_NORMALIZED_PROMPT_ID,
    },
    deps,
  );
}
