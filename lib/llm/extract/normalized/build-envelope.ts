import {
  NORMALIZED_EXTRACTION_SCHEMA_VERSION,
  expectedRouteForSubtype,
  validateNormalizedExtractionEnvelope,
  type NormalizedExtractionEnvelope,
  type NormalizedExtractionWarning,
  type SupportedMvpExtractionSubtype,
} from '@/lib/extraction-contracts';
import { callClaudeWithCostGuard } from '@/lib/cost-cap';
import { callClaudeJSON } from '@/lib/llm/client';
import {
  prepareExtractionPayload,
  type BaseExtractionResult,
  type ExtractorDeps,
} from '@/lib/llm/extract/common';
import { createAdminClient } from '@/lib/supabase/admin';

import { buildExtractionSystemPrompt } from './build-system-prompt';

export type NormalizedExtractionResult =
  BaseExtractionResult<NormalizedExtractionEnvelope>;

type NormalizedModelPayload = {
  confidence?: unknown;
  normalized_data?: unknown;
  warnings?: unknown;
};

export class NormalizedExtractorPreCallError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'NormalizedExtractorPreCallError';
    this.cause = cause;
  }
}

export class NormalizedExtractorLLMError extends Error {
  readonly modelId?: string;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly costUsd?: number;

  constructor(
    message: string,
    cause?: unknown,
    usage?: {
      modelId?: string;
      inputTokens?: number;
      outputTokens?: number;
      costUsd?: number;
    },
  ) {
    super(message);
    this.name = 'NormalizedExtractorLLMError';
    this.cause = cause;
    this.modelId = usage?.modelId;
    this.inputTokens = usage?.inputTokens;
    this.outputTokens = usage?.outputTokens;
    this.costUsd = usage?.costUsd;
  }
}

export async function extractNormalizedFromStorage(
  input: {
    claimId: string;
    documentId: string;
    fileName: string;
    subtype: SupportedMvpExtractionSubtype;
    promptId: string;
  },
  deps: ExtractorDeps = {},
): Promise<NormalizedExtractionResult> {
  const callClaude = deps.callClaude ?? callClaudeJSON;
  const supabaseAdmin = deps.supabaseAdmin ?? createAdminClient();
  const system = buildExtractionSystemPrompt(input.subtype);
  const contentBlocks = await prepareExtractionPayload(
    {
      documentId: input.documentId,
      fileName: input.fileName,
      promptText: `Extract normalized ${input.subtype} fields.`,
    },
    deps,
    NormalizedExtractorPreCallError,
  );

  let result: Awaited<
    ReturnType<typeof callClaudeJSON<NormalizedModelPayload>>
  >;

  try {
    result = await callClaudeWithCostGuard({
      claimId: input.claimId,
      supabaseAdmin,
      call: () =>
        callClaude<NormalizedModelPayload>({
          system,
          contentBlocks,
          maxTokens: 1200,
        }),
    });
  } catch (error) {
    throw new NormalizedExtractorLLMError(
      `Claude normalized extraction API call failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error,
    );
  }

  const usage = {
    modelId: result.modelId,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    costUsd: result.costUsd,
  };

  if (result.parseError || !result.parsed || !isRecord(result.parsed)) {
    throw new NormalizedExtractorLLMError(
      `Claude normalized extraction returned invalid JSON: ${
        result.parseError ?? 'parsed null'
      }. Raw: ${result.rawText.slice(0, 200)}`,
      undefined,
      usage,
    );
  }

  const envelope = buildCompletedEnvelope({
    parsed: result.parsed,
    documentId: input.documentId,
    subtype: input.subtype,
    promptId: input.promptId,
    usage,
  });
  const validation = validateNormalizedExtractionEnvelope(envelope);

  if (!validation.ok) {
    throw new NormalizedExtractorLLMError(
      `Claude normalized extraction failed schema validation: ${validation.issues
        .map((issue) => `${issue.path} ${issue.code}`)
        .join('; ')}`,
      undefined,
      usage,
    );
  }

  const validatedEnvelope = {
    ...validation.payload,
    warnings: mergeWarnings(validation.payload.warnings, validation.warnings),
  };

  return {
    data: validatedEnvelope,
    modelId: result.modelId,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    costUsd: result.costUsd,
  };
}

function buildCompletedEnvelope(input: {
  parsed: Record<string, unknown>;
  documentId: string;
  subtype: SupportedMvpExtractionSubtype;
  promptId: string;
  usage: {
    modelId: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  };
}): NormalizedExtractionEnvelope {
  if (input.parsed.kind === 'normalized_extraction') {
    return {
      ...input.parsed,
      normalized_data: normalizeNormalizedDataAliases(
        input.parsed.normalized_data,
        input.subtype,
      ),
      source_document_id:
        typeof input.parsed.source_document_id === 'string'
          ? input.parsed.source_document_id
          : input.documentId,
      model_metadata: {
        ...asRecord(input.parsed.model_metadata),
        model_id: input.usage.modelId,
        input_tokens: input.usage.inputTokens,
        output_tokens: input.usage.outputTokens,
        cost_usd: input.usage.costUsd,
        prompt_id: input.promptId,
      },
    } as NormalizedExtractionEnvelope;
  }

  return {
    kind: 'normalized_extraction',
    route: expectedRouteForSubtype(input.subtype),
    subtype: input.subtype,
    schema_version: NORMALIZED_EXTRACTION_SCHEMA_VERSION,
    source_document_id: input.documentId,
    status: 'completed',
    confidence: normalizeConfidence(input.parsed.confidence),
    warnings: normalizeWarnings(input.parsed.warnings),
    normalized_data: normalizeNormalizedDataAliases(
      input.parsed.normalized_data,
      input.subtype,
    ),
    extraction_completed_at: new Date().toISOString(),
    model_metadata: {
      model_id: input.usage.modelId,
      input_tokens: input.usage.inputTokens,
      output_tokens: input.usage.outputTokens,
      cost_usd: input.usage.costUsd,
      prompt_id: input.promptId,
    },
  } as NormalizedExtractionEnvelope;
}

function normalizeNormalizedDataAliases(
  normalizedData: unknown,
  subtype: SupportedMvpExtractionSubtype,
): unknown {
  if (!isRecord(normalizedData) || !isRecord(normalizedData.fields)) {
    return normalizedData;
  }

  const fields = { ...normalizedData.fields };

  if (subtype === 'police_report') {
    copyDateAlias(fields, 'report_or_filing_date', [
      'report_date',
      'filing_date',
      'police_report_date',
      'document_date',
      'incident_report_date',
      'incident_date',
    ]);
  }

  if (subtype === 'boarding_pass') {
    copyDateAlias(fields, 'flight_date', [
      'departure_date',
      'boarding_date',
      'travel_date',
      'departure_datetime',
      'boarding_datetime',
      'flight_datetime',
      'boarding_or_departure_datetime',
      'boarding_or_departure_time',
    ]);
  }

  return {
    ...normalizedData,
    fields,
  };
}

function copyDateAlias(
  fields: Record<string, unknown>,
  canonicalField: string,
  aliases: string[],
) {
  if (hasPresentValue(fields[canonicalField])) return;

  for (const alias of aliases) {
    const aliasField = fields[alias];
    const aliasValue = getPresentValue(aliasField);
    const normalizedDate = normalizeDateLikeValue(aliasValue);

    if (normalizedDate === null) continue;

    fields[canonicalField] = {
      ...asRecord(aliasField),
      presence: 'present',
      value: normalizedDate,
    };
    return;
  }
}

function hasPresentValue(field: unknown): boolean {
  return getPresentValue(field) !== null;
}

function getPresentValue(field: unknown): unknown | null {
  if (!isRecord(field) || field.presence !== 'present') return null;

  return field.value === null || typeof field.value === 'undefined'
    ? null
    : field.value;
}

function normalizeDateLikeValue(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value !== 'string' && typeof value !== 'number') return null;

  const text = String(value).trim();
  if (!text) return null;

  const isoMatch = text.match(
    /(?:^|\D)(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?!\d)/,
  );
  if (isoMatch) {
    return formatDateParts(isoMatch[1], isoMatch[2], isoMatch[3]);
  }

  const dayFirstMatch = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/);
  if (dayFirstMatch) {
    return formatDateParts(
      dayFirstMatch[3],
      dayFirstMatch[2],
      dayFirstMatch[1],
    );
  }

  return null;
}

function formatDateParts(year: string, month: string, day: string): string {
  return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(
    2,
    '0',
  )}`;
}

function normalizeConfidence(value: unknown): number {
  return typeof value === 'number' && value >= 0 && value <= 1 ? value : 0.5;
}

function normalizeWarnings(value: unknown): NormalizedExtractionWarning[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (warning): warning is NormalizedExtractionWarning =>
      isRecord(warning) &&
      typeof warning.code === 'string' &&
      typeof warning.message === 'string',
  );
}

function mergeWarnings(
  existing: NormalizedExtractionWarning[],
  fromValidation: NormalizedExtractionWarning[],
): NormalizedExtractionWarning[] {
  const seen = new Set(existing.map((warning) => warningKey(warning)));
  const merged = [...existing];

  for (const warning of fromValidation) {
    const key = warningKey(warning);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(warning);
    }
  }

  return merged;
}

function warningKey(warning: NormalizedExtractionWarning): string {
  return `${warning.code}:${warning.field ?? ''}:${warning.message}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export type NormalizedExtractorDeps = {
  supabaseAdmin?: ReturnType<typeof createAdminClient>;
  callClaude?: typeof callClaudeJSON;
};
