import type { BetaContentBlockParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';

import { callClaudeWithCostGuard } from '@/lib/cost-cap';
import { callClaudeJSON } from '@/lib/llm/client';
import { createAdminClient } from '@/lib/supabase/admin';

export type ExtractorDeps = {
  supabaseAdmin?: ReturnType<typeof createAdminClient>;
  callClaude?: typeof callClaudeJSON;
};

export type BaseExtractionResult<TData> = {
  data: TData;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

type ErrorCtor = new (message: string, cause?: unknown) => Error;

export async function prepareExtractionPayload(
  input: { documentId: string; fileName: string; promptText: string },
  deps: ExtractorDeps,
  PreCallError: ErrorCtor,
): Promise<BetaContentBlockParam[]> {
  const supabaseAdmin = deps.supabaseAdmin ?? createAdminClient();
  const { data: doc, error: fetchError } = await supabaseAdmin
    .from('documents')
    .select('file_path, mime_type')
    .eq('id', input.documentId)
    .single();

  if (fetchError) {
    throw new PreCallError(
      `fetch document row failed: ${fetchError.message}`,
      fetchError,
    );
  }

  if (!doc.file_path) {
    throw new PreCallError('document has no file_path');
  }

  if (!doc.mime_type) {
    throw new PreCallError('document has no mime_type');
  }

  const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
    .from('claim-documents')
    .download(doc.file_path);

  if (downloadError) {
    throw new PreCallError(
      `storage download failed: ${downloadError.message}`,
      downloadError,
    );
  }

  const base64 = Buffer.from(await fileBlob.arrayBuffer()).toString('base64');
  const fileBlock = buildFileContentBlock(doc.mime_type, base64, PreCallError);
  const promptBlock: BetaContentBlockParam = {
    type: 'text',
    text: `File name: ${input.fileName}\n\n${input.promptText}`,
  };

  return [fileBlock, promptBlock];
}

export async function callExtractorJSON<TParsed, TData>(input: {
  claimId: string;
  supabaseAdmin: ReturnType<typeof createAdminClient>;
  system: string;
  contentBlocks: BetaContentBlockParam[];
  maxTokens?: number;
  callClaude: typeof callClaudeJSON;
  LLMError: ErrorCtor;
  mapParsed: (parsed: TParsed) => TData;
}): Promise<BaseExtractionResult<TData>> {
  let result: Awaited<ReturnType<typeof callClaudeJSON<TParsed>>>;

  try {
    result = await callClaudeWithCostGuard({
      claimId: input.claimId,
      supabaseAdmin: input.supabaseAdmin,
      call: () =>
        input.callClaude<TParsed>({
          system: input.system,
          contentBlocks: input.contentBlocks,
          maxTokens: input.maxTokens ?? 800,
        }),
    });
  } catch (error) {
    throw new input.LLMError(
      `Claude extraction API call failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
      error,
    );
  }

  if (result.parseError || !result.parsed) {
    throw new input.LLMError(
      `Claude extraction returned invalid JSON: ${
        result.parseError ?? 'parsed null'
      }. Raw: ${result.rawText.slice(0, 200)}`,
    );
  }

  return {
    data: input.mapParsed(result.parsed),
    modelId: result.modelId,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    costUsd: result.costUsd,
  };
}

function buildFileContentBlock(
  mimeType: string,
  base64: string,
  PreCallError: ErrorCtor,
): BetaContentBlockParam {
  if (mimeType === 'application/pdf') {
    return {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64 },
    };
  }

  if (mimeType === 'image/jpeg' || mimeType === 'image/png') {
    return {
      type: 'image',
      source: { type: 'base64', media_type: mimeType, data: base64 },
    };
  }

  throw new PreCallError(
    `Unsupported mime_type for Claude extraction: ${mimeType}`,
  );
}

export function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

export function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function nullableBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

export function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}
