import { callClaudeJSON } from '@/lib/llm/client';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  callExtractorJSON,
  nullableBoolean,
  nullableNumber,
  nullableString,
  prepareExtractionPayload,
  stringArray,
  type BaseExtractionResult,
  type ExtractorDeps,
} from '@/lib/llm/extract/common';
import type { PoliceFormatAnalysis, PoliceReportExtraction } from '@/lib/types';

export class PoliceExtractorPreCallError extends Error {
  readonly phase = 'pre_call' as const;

  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'PoliceExtractorPreCallError';
  }
}

export class PoliceExtractorLLMError extends Error {
  readonly phase = 'llm_call' as const;

  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'PoliceExtractorLLMError';
  }
}

export type ExtractPoliceResult = BaseExtractionResult<PoliceReportExtraction>;

type PoliceJson = Partial<PoliceReportExtraction> & {
  extracted?: Partial<PoliceReportExtraction>;
  format_analysis?: Partial<PoliceFormatAnalysis>;
};

export const POLICE_SYSTEM_PROMPT = `You extract police report data for an Israeli travel insurance claim.

Return strictly JSON. Preserve the two-tier structure when possible:
{
  "extracted": {
    "caseNumber", "reportDate", "incidentDate", "stationName",
    "stationCity", "officerName", "officerRank", "reporterName",
    "incidentSummary", "itemsReported"
  },
  "formatAnalysis": {
    "caseNumberFormatMatch", "caseNumberFormatNotes", "elementsPresent",
    "elementsMissing", "anomaliesDetected", "overallAuthenticityScore",
    "scoreReasoning"
  }
}

Use null or empty arrays when unknown.`;

export async function extractPoliceFromStorage(
  input: { claimId: string; documentId: string; fileName: string },
  deps: ExtractorDeps = {},
): Promise<ExtractPoliceResult> {
  const supabaseAdmin = deps.supabaseAdmin ?? createAdminClient();
  const contentBlocks = await prepareExtractionPayload(
    {
      ...input,
      promptText:
        'Extract police report fields and format analysis. Return only JSON.',
    },
    deps,
    PoliceExtractorPreCallError,
  );

  return callExtractorJSON<PoliceJson, PoliceReportExtraction>({
    system: POLICE_SYSTEM_PROMPT,
    contentBlocks,
    claimId: input.claimId,
    supabaseAdmin,
    callClaude: deps.callClaude ?? callClaudeJSON,
    LLMError: PoliceExtractorLLMError,
    mapParsed: mapPolice,
  });
}

function mapPolice(parsed: PoliceJson): PoliceReportExtraction {
  const extracted = parsed.extracted ?? parsed;
  const format = parsed.formatAnalysis ?? parsed.format_analysis ?? {};

  return {
    caseNumber: nullableString(extracted.caseNumber),
    reportDate: nullableString(extracted.reportDate),
    incidentDate: nullableString(extracted.incidentDate),
    stationName: nullableString(extracted.stationName),
    stationCity: nullableString(extracted.stationCity),
    officerName: nullableString(extracted.officerName),
    officerRank: nullableString(extracted.officerRank),
    reporterName: nullableString(extracted.reporterName),
    incidentSummary: nullableString(extracted.incidentSummary),
    itemsReported: stringArray(extracted.itemsReported),
    formatAnalysis: {
      caseNumberFormatMatch: nullableBoolean(format.caseNumberFormatMatch),
      caseNumberFormatNotes: nullableString(format.caseNumberFormatNotes) ?? '',
      elementsPresent: stringArray(format.elementsPresent),
      elementsMissing: stringArray(format.elementsMissing),
      anomaliesDetected: Array.isArray(format.anomaliesDetected)
        ? format.anomaliesDetected
            .map((item) => item as { type?: unknown; description?: unknown })
            .map((item) => ({
              type: nullableString(item.type) ?? 'unknown',
              description: nullableString(item.description) ?? '',
            }))
        : [],
      overallAuthenticityScore: nullableNumber(format.overallAuthenticityScore),
      scoreReasoning: nullableString(format.scoreReasoning) ?? '',
    },
  };
}
