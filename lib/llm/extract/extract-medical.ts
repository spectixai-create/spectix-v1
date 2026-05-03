import { callClaudeJSON } from '@/lib/llm/client';
import {
  callExtractorJSON,
  nullableNumber,
  nullableString,
  prepareExtractionPayload,
  stringArray,
  type BaseExtractionResult,
  type ExtractorDeps,
} from '@/lib/llm/extract/common';
import type { MedicalReportExtraction } from '@/lib/types';

export class MedicalExtractorPreCallError extends Error {
  readonly phase = 'pre_call' as const;

  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'MedicalExtractorPreCallError';
  }
}

export class MedicalExtractorLLMError extends Error {
  readonly phase = 'llm_call' as const;

  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'MedicalExtractorLLMError';
  }
}

export type ExtractMedicalResult =
  BaseExtractionResult<MedicalReportExtraction>;

type MedicalJson = Partial<MedicalReportExtraction>;

export const MEDICAL_SYSTEM_PROMPT = `You extract medical visit/report data for an Israeli travel insurance claim.

Return strictly JSON with these fields:
patientName, dateOfTreatment, facility, facilityAddress, diagnosisBrief,
treatmentBrief, totalCost, currency, attendingDoctor, anomalies.

Privacy rule: diagnosisBrief must be brief. Do not copy a full sensitive
medical narrative. Use null or empty arrays when unknown.`;

export async function extractMedicalFromStorage(
  input: { documentId: string; fileName: string },
  deps: ExtractorDeps = {},
): Promise<ExtractMedicalResult> {
  const contentBlocks = await prepareExtractionPayload(
    {
      ...input,
      promptText:
        'Extract the medical fields. Keep diagnosisBrief short. Return only JSON.',
    },
    deps,
    MedicalExtractorPreCallError,
  );

  return callExtractorJSON<MedicalJson, MedicalReportExtraction>({
    system: MEDICAL_SYSTEM_PROMPT,
    contentBlocks,
    callClaude: deps.callClaude ?? callClaudeJSON,
    LLMError: MedicalExtractorLLMError,
    mapParsed: mapMedical,
  });
}

function mapMedical(parsed: MedicalJson): MedicalReportExtraction {
  return {
    patientName: nullableString(parsed.patientName),
    dateOfTreatment: nullableString(parsed.dateOfTreatment),
    facility: nullableString(parsed.facility),
    facilityAddress: nullableString(parsed.facilityAddress),
    diagnosisBrief: nullableString(parsed.diagnosisBrief),
    treatmentBrief: nullableString(parsed.treatmentBrief),
    totalCost: nullableNumber(parsed.totalCost),
    currency: nullableString(parsed.currency),
    attendingDoctor: nullableString(parsed.attendingDoctor),
    anomalies: stringArray(parsed.anomalies),
  };
}
