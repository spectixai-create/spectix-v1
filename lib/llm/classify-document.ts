import type { BetaContentBlockParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';

import { CostCapHaltError, callClaudeWithCostGuard } from '@/lib/cost-cap';
import { callClaudeJSON } from './client';
import { createAdminClient } from '@/lib/supabase/admin';
import type { DocumentType } from '@/lib/types';

export class ClassifierPreCallError extends Error {
  readonly phase = 'pre_call' as const;

  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ClassifierPreCallError';
  }
}

export class ClassifierLLMError extends Error {
  readonly phase = 'llm_call' as const;

  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ClassifierLLMError';
  }
}

export type ClassifyDocumentResult = {
  documentType: DocumentType;
  confidence: number;
  reasoning: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

type ClassifierJsonOutput = {
  document_type: string;
  confidence: number;
  reasoning: string;
};

type ClassifierDeps = {
  supabaseAdmin?: ReturnType<typeof createAdminClient>;
  callClaude?: typeof callClaudeJSON;
};

const SYSTEM_PROMPT = `You are a document classifier for an insurance claims system. Identify the document type from the document image/PDF and filename.

Possible document types:
- police_report
- hotel_letter
- receipt
- medical_report
- witness_letter
- flight_doc
- photo
- other

Output strictly in JSON. No preamble.`;

const ALLOWED_TYPES: ReadonlySet<DocumentType> = new Set<DocumentType>([
  'police_report',
  'hotel_letter',
  'receipt',
  'medical_report',
  'witness_letter',
  'flight_doc',
  'photo',
  'other',
]);

export async function classifyDocumentFromStorage(
  input: {
    claimId: string;
    documentId: string;
    fileName: string;
  },
  deps: ClassifierDeps = {},
): Promise<ClassifyDocumentResult> {
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.SPECTIX_FAKE_CLAUDE_CLASSIFIER === 'true'
  ) {
    return fakeClassifierResult(input.fileName);
  }

  const contentBlocks = await preparePayload(input, deps);
  const supabaseAdmin = deps.supabaseAdmin ?? createAdminClient();
  const callClaude = deps.callClaude ?? callClaudeJSON;
  let result: Awaited<ReturnType<typeof callClaudeJSON<ClassifierJsonOutput>>>;

  try {
    result = await callClaudeWithCostGuard({
      claimId: input.claimId,
      supabaseAdmin,
      call: () =>
        callClaude<ClassifierJsonOutput>({
          system: SYSTEM_PROMPT,
          contentBlocks,
          maxTokens: 500,
        }),
    });
  } catch (error) {
    if (error instanceof CostCapHaltError) throw error;

    throw new ClassifierLLMError(
      `Claude API call failed: ${error instanceof Error ? error.message : String(error)}`,
      error,
    );
  }

  if (result.parseError || !result.parsed) {
    throw new ClassifierLLMError(
      `Claude returned invalid JSON: ${result.parseError ?? 'parsed null'}. Raw: ${result.rawText.slice(0, 200)}`,
    );
  }

  const documentType = ALLOWED_TYPES.has(
    result.parsed.document_type as DocumentType,
  )
    ? (result.parsed.document_type as DocumentType)
    : 'other';

  return {
    documentType,
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
  };
}

function fakeClassifierResult(fileName: string): ClassifyDocumentResult {
  const lower = fileName.toLowerCase();
  const documentType: DocumentType = lower.includes('receipt')
    ? 'receipt'
    : lower.includes('police')
      ? 'police_report'
      : 'other';

  return {
    documentType,
    confidence: 0.91,
    reasoning: 'סיווג בדיקה מקומי',
    modelId: 'local-fake-claude-classifier',
    inputTokens: 100,
    outputTokens: 25,
    costUsd: 0.000675,
  };
}

async function preparePayload(
  input: { documentId: string; fileName: string; claimId: string },
  deps: ClassifierDeps,
): Promise<BetaContentBlockParam[]> {
  const supabaseAdmin = deps.supabaseAdmin ?? createAdminClient();
  const { data: doc, error: fetchError } = await supabaseAdmin
    .from('documents')
    .select('file_path, mime_type')
    .eq('id', input.documentId)
    .single();

  if (fetchError) {
    throw new ClassifierPreCallError(
      `fetch document row failed: ${fetchError.message}`,
      fetchError,
    );
  }

  if (!doc.file_path) {
    throw new ClassifierPreCallError('document has no file_path');
  }

  if (!doc.mime_type) {
    throw new ClassifierPreCallError('document has no mime_type');
  }

  const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
    .from('claim-documents')
    .download(doc.file_path);

  if (downloadError) {
    throw new ClassifierPreCallError(
      `storage download failed: ${downloadError.message}`,
      downloadError,
    );
  }

  const base64 = Buffer.from(await fileBlob.arrayBuffer()).toString('base64');
  const contentBlock = buildFileContentBlock(doc.mime_type, base64);
  const userPromptBlock: BetaContentBlockParam = {
    type: 'text',
    text: `File name: ${input.fileName}\n\nReturn JSON:\n{\n  "document_type": "police_report" | "hotel_letter" | "receipt" | "medical_report" | "witness_letter" | "flight_doc" | "photo" | "other",\n  "confidence": 0.0-1.0,\n  "reasoning": "סיבה קצרה בעברית"\n}`,
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

  throw new ClassifierPreCallError(
    `Unsupported mime_type for Claude classifier: ${mimeType}`,
  );
}
