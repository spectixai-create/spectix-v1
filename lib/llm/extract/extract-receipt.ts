import { callClaudeJSON } from '@/lib/llm/client';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  callExtractorJSON,
  nullableNumber,
  nullableString,
  prepareExtractionPayload,
  type BaseExtractionResult,
  type ExtractorDeps,
} from '@/lib/llm/extract/common';
import type { ReceiptExtraction, ReceiptItem } from '@/lib/types';

export class ReceiptExtractorPreCallError extends Error {
  readonly phase = 'pre_call' as const;

  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ReceiptExtractorPreCallError';
  }
}

export class ReceiptExtractorLLMError extends Error {
  readonly phase = 'llm_call' as const;

  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ReceiptExtractorLLMError';
  }
}

export type ExtractReceiptResult = BaseExtractionResult<ReceiptExtraction>;

type ReceiptJson = Partial<ReceiptExtraction>;

export const RECEIPT_SYSTEM_PROMPT = `You extract receipt data for an Israeli travel insurance claim.

Return strictly JSON with these fields:
storeName, storeAddress, storePhone, receiptDate, receiptNumber, items,
subtotal, tax, total, currency, paymentMethod.

Each item has description, quantity, unitPrice, total.
Use null when unknown. Do not invent amounts.`;

export async function extractReceiptFromStorage(
  input: { claimId: string; documentId: string; fileName: string },
  deps: ExtractorDeps = {},
): Promise<ExtractReceiptResult> {
  const supabaseAdmin = deps.supabaseAdmin ?? createAdminClient();
  const contentBlocks = await prepareExtractionPayload(
    {
      ...input,
      promptText:
        'Extract the receipt fields. Return only the JSON object described in the system prompt.',
    },
    deps,
    ReceiptExtractorPreCallError,
  );

  return callExtractorJSON<ReceiptJson, ReceiptExtraction>({
    system: RECEIPT_SYSTEM_PROMPT,
    contentBlocks,
    claimId: input.claimId,
    supabaseAdmin,
    callClaude: deps.callClaude ?? callClaudeJSON,
    LLMError: ReceiptExtractorLLMError,
    mapParsed: mapReceipt,
  });
}

function mapReceipt(parsed: ReceiptJson): ReceiptExtraction {
  const items = Array.isArray(parsed.items)
    ? parsed.items.map(mapItem).filter((item) => item.description !== '')
    : [];

  return {
    storeName: nullableString(parsed.storeName),
    storeAddress: nullableString(parsed.storeAddress),
    storePhone: nullableString(parsed.storePhone),
    receiptDate: nullableString(parsed.receiptDate),
    receiptNumber: nullableString(parsed.receiptNumber),
    items,
    subtotal: nullableNumber(parsed.subtotal),
    tax: nullableNumber(parsed.tax),
    total: nullableNumber(parsed.total),
    currency: nullableString(parsed.currency),
    paymentMethod: nullableString(parsed.paymentMethod),
  };
}

function mapItem(value: unknown): ReceiptItem {
  const item = value as Partial<ReceiptItem>;

  return {
    description: typeof item.description === 'string' ? item.description : '',
    quantity: nullableNumber(item.quantity),
    unitPrice: nullableNumber(item.unitPrice),
    total: nullableNumber(item.total),
  };
}
