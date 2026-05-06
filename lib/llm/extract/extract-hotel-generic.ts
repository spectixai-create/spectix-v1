import { callClaudeJSON } from '@/lib/llm/client';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  callExtractorJSON,
  nullableBoolean,
  nullableString,
  prepareExtractionPayload,
  stringArray,
  type BaseExtractionResult,
  type ExtractorDeps,
} from '@/lib/llm/extract/common';
import type { HotelLetterExtraction } from '@/lib/types';

export class HotelGenericExtractorPreCallError extends Error {
  readonly phase = 'pre_call' as const;

  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'HotelGenericExtractorPreCallError';
  }
}

export class HotelGenericExtractorLLMError extends Error {
  readonly phase = 'llm_call' as const;

  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'HotelGenericExtractorLLMError';
  }
}

export type ExtractHotelGenericResult =
  BaseExtractionResult<HotelLetterExtraction>;

type HotelJson = Partial<HotelLetterExtraction>;

export const HOTEL_GENERIC_SYSTEM_PROMPT = `You extract service-provider letter data for an Israeli travel insurance claim.

This broad prompt covers hotel letters and other provider documents.
Return strictly JSON with these fields:
hotelName, hotelAddress, letterDate, guestName, stayStartDate, stayEndDate,
incidentReportedToHotel, hotelActions, signedBy, onLetterhead,
languageQuality, redFlags.

Use null or empty arrays when unknown.`;

export async function extractHotelGenericFromStorage(
  input: { claimId: string; documentId: string; fileName: string },
  deps: ExtractorDeps = {},
): Promise<ExtractHotelGenericResult> {
  const supabaseAdmin = deps.supabaseAdmin ?? createAdminClient();
  const contentBlocks = await prepareExtractionPayload(
    {
      ...input,
      promptText:
        'Extract the service-provider letter fields. Return only JSON.',
    },
    deps,
    HotelGenericExtractorPreCallError,
  );

  return callExtractorJSON<HotelJson, HotelLetterExtraction>({
    system: HOTEL_GENERIC_SYSTEM_PROMPT,
    contentBlocks,
    claimId: input.claimId,
    supabaseAdmin,
    callClaude: deps.callClaude ?? callClaudeJSON,
    LLMError: HotelGenericExtractorLLMError,
    mapParsed: mapHotel,
  });
}

function mapHotel(parsed: HotelJson): HotelLetterExtraction {
  return {
    hotelName: nullableString(parsed.hotelName),
    hotelAddress: nullableString(parsed.hotelAddress),
    letterDate: nullableString(parsed.letterDate),
    guestName: nullableString(parsed.guestName),
    stayStartDate: nullableString(parsed.stayStartDate),
    stayEndDate: nullableString(parsed.stayEndDate),
    incidentReportedToHotel: nullableBoolean(parsed.incidentReportedToHotel),
    hotelActions: nullableString(parsed.hotelActions),
    signedBy: nullableString(parsed.signedBy),
    onLetterhead: nullableBoolean(parsed.onLetterhead),
    languageQuality: nullableString(parsed.languageQuality),
    redFlags: stringArray(parsed.redFlags),
  };
}
