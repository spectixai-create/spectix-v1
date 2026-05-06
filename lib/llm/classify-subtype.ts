import type { BetaContentBlockParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';

import { CostCapHaltError, callClaudeWithCostGuard } from '@/lib/cost-cap';
import { callClaudeJSON } from './client';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  SUBTYPE_LABELS_HE,
  SUBTYPES_BY_DOCUMENT_TYPE,
  canSkipSubtypeClassification,
  getOnlySubtype,
} from '@/lib/llm/document-subtypes';
import type { DocumentSubtype, DocumentType } from '@/lib/types';

export class SubtypeClassifierPreCallError extends Error {
  readonly phase = 'pre_call' as const;

  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SubtypeClassifierPreCallError';
  }
}

export class SubtypeClassifierLLMError extends Error {
  readonly phase = 'llm_call' as const;

  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SubtypeClassifierLLMError';
  }
}

export type ClassifySubtypeResult = {
  documentSubtype: DocumentSubtype | null;
  confidence: number;
  reasoning: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  llmReturnedRaw: string | null;
  skipped: boolean;
};

type SubtypeJsonOutput = {
  document_subtype: string;
  confidence: number;
  reasoning: string;
};

type SubtypeClassifierDeps = {
  supabaseAdmin?: ReturnType<typeof createAdminClient>;
  callClaude?: typeof callClaudeJSON;
};

export const SUBTYPE_DETERMINISTIC_ACTOR_ID = 'system:single-subtype-mapping';
export const SUBTYPE_PRECALL_SENTINEL = 'subtype-classifier:pre-call-failure';

export async function classifySubtypeFromStorage(
  input: {
    claimId: string;
    documentId: string;
    fileName: string;
    broad: DocumentType;
  },
  deps: SubtypeClassifierDeps = {},
): Promise<ClassifySubtypeResult> {
  if (canSkipSubtypeClassification(input.broad)) {
    const subtype = getOnlySubtype(input.broad);

    return {
      documentSubtype: subtype,
      confidence: 1,
      reasoning: 'Mapped deterministically because broad type has one subtype.',
      modelId: SUBTYPE_DETERMINISTIC_ACTOR_ID,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      llmReturnedRaw: null,
      skipped: true,
    };
  }

  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.SPECTIX_FAKE_CLAUDE_CLASSIFIER === 'true'
  ) {
    return fakeSubtypeResult(input.broad);
  }

  const contentBlocks = await preparePayload(input, deps);
  const supabaseAdmin = deps.supabaseAdmin ?? createAdminClient();
  const callClaude = deps.callClaude ?? callClaudeJSON;
  let result: Awaited<ReturnType<typeof callClaudeJSON<SubtypeJsonOutput>>>;

  try {
    result = await callClaudeWithCostGuard({
      claimId: input.claimId,
      supabaseAdmin,
      call: () =>
        callClaude<SubtypeJsonOutput>({
          system: buildSubtypeSystemPrompt(input.broad),
          contentBlocks,
          maxTokens: 500,
        }),
    });
  } catch (error) {
    if (error instanceof CostCapHaltError) throw error;

    throw new SubtypeClassifierLLMError(
      `Claude subtype API call failed: ${error instanceof Error ? error.message : String(error)}`,
      error,
    );
  }

  if (result.parseError || !result.parsed) {
    throw new SubtypeClassifierLLMError(
      `Claude subtype returned invalid JSON: ${result.parseError ?? 'parsed null'}. Raw: ${result.rawText.slice(0, 200)}`,
    );
  }

  const allowedSubtypes = SUBTYPES_BY_DOCUMENT_TYPE[input.broad];
  const returnedSubtype = result.parsed.document_subtype;
  const documentSubtype = allowedSubtypes.includes(
    returnedSubtype as DocumentSubtype,
  )
    ? (returnedSubtype as DocumentSubtype)
    : null;

  return {
    documentSubtype,
    confidence:
      typeof result.parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, result.parsed.confidence))
        : 0,
    reasoning:
      typeof result.parsed.reasoning === 'string'
        ? result.parsed.reasoning
        : '',
    modelId: result.modelId,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    costUsd: result.costUsd,
    llmReturnedRaw: returnedSubtype,
    skipped: false,
  };
}

export function buildSubtypeSystemPrompt(broad: DocumentType): string {
  const allowedSubtypes = SUBTYPES_BY_DOCUMENT_TYPE[broad];
  const allowedLines = allowedSubtypes
    .map((subtype) => `- ${subtype}: ${SUBTYPE_LABELS_HE[subtype]}`)
    .join('\n');

  return `You are a fine-grained document subtype classifier for an Israeli travel insurance claims system.

The broad document_type is already known: ${broad}

Choose exactly one document_subtype from this allowed list:
${allowedLines}

Output strictly in JSON:
{
  "document_subtype": "<one allowed subtype id>",
  "confidence": 0.0-1.0,
  "reasoning": "סיבה קצרה בעברית"
}`;
}

function fakeSubtypeResult(broad: DocumentType): ClassifySubtypeResult {
  const subtype = SUBTYPES_BY_DOCUMENT_TYPE[broad].at(0) ?? null;

  return {
    documentSubtype: subtype,
    confidence: 0.89,
    reasoning: 'סיווג משנה מקומי',
    modelId: 'local-fake-claude-classifier',
    inputTokens: subtype ? 80 : 0,
    outputTokens: subtype ? 20 : 0,
    costUsd: subtype ? 0.00054 : 0,
    llmReturnedRaw: subtype,
    skipped: false,
  };
}

async function preparePayload(
  input: {
    claimId: string;
    documentId: string;
    fileName: string;
    broad: DocumentType;
  },
  deps: SubtypeClassifierDeps,
): Promise<BetaContentBlockParam[]> {
  const supabaseAdmin = deps.supabaseAdmin ?? createAdminClient();
  const { data: doc, error: fetchError } = await supabaseAdmin
    .from('documents')
    .select('file_path, mime_type')
    .eq('id', input.documentId)
    .single();

  if (fetchError) {
    throw new SubtypeClassifierPreCallError(
      `fetch document row failed: ${fetchError.message}`,
      fetchError,
    );
  }

  if (!doc.file_path) {
    throw new SubtypeClassifierPreCallError('document has no file_path');
  }

  if (!doc.mime_type) {
    throw new SubtypeClassifierPreCallError('document has no mime_type');
  }

  const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
    .from('claim-documents')
    .download(doc.file_path);

  if (downloadError) {
    throw new SubtypeClassifierPreCallError(
      `storage download failed: ${downloadError.message}`,
      downloadError,
    );
  }

  const base64 = Buffer.from(await fileBlob.arrayBuffer()).toString('base64');
  const contentBlock = buildFileContentBlock(doc.mime_type, base64);
  const userPromptBlock: BetaContentBlockParam = {
    type: 'text',
    text: `File name: ${input.fileName}\nBroad document_type: ${input.broad}\n\nReturn the best document_subtype from the allowed list.`,
  };

  return [contentBlock, userPromptBlock];
}

function buildFileContentBlock(
  mimeType: string,
  base64: string,
): BetaContentBlockParam {
  if (mimeType === 'application/pdf') {
    return {
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: base64,
      },
    };
  }

  if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mimeType,
        data: base64,
      },
    };
  }

  throw new SubtypeClassifierPreCallError(
    `Unsupported mime_type for Claude subtype classifier: ${mimeType}`,
  );
}
