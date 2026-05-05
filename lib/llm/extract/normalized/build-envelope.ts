import {
  NORMALIZED_EXTRACTION_SCHEMA_VERSION,
  expectedRouteForSubtype,
  validateNormalizedExtractionEnvelope,
  type NormalizedExtractionEnvelope,
  type NormalizedExtractionWarning,
  type SupportedMvpExtractionSubtype,
} from '@/lib/extraction-contracts';
import { callClaudeJSON } from '@/lib/llm/client';
import {
  prepareExtractionPayload,
  type BaseExtractionResult,
  type ExtractorDeps,
} from '@/lib/llm/extract/common';
import type { createAdminClient } from '@/lib/supabase/admin';

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
    documentId: string;
    fileName: string;
    subtype: SupportedMvpExtractionSubtype;
    promptId: string;
  },
  deps: ExtractorDeps = {},
): Promise<NormalizedExtractionResult> {
  const callClaude = deps.callClaude ?? callClaudeJSON;
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
    result = await callClaude<NormalizedModelPayload>({
      system,
      contentBlocks,
      maxTokens: 1200,
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
    normalized_data: input.parsed.normalized_data,
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
