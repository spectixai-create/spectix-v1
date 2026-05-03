import { describe, expect, it, vi } from 'vitest';

import { parseClaudeJSON } from '@/lib/llm/client';
import {
  HotelGenericExtractorLLMError,
  HotelGenericExtractorPreCallError,
  HOTEL_GENERIC_SYSTEM_PROMPT,
  extractHotelGenericFromStorage,
} from '@/lib/llm/extract/extract-hotel-generic';
import {
  MedicalExtractorLLMError,
  MedicalExtractorPreCallError,
  MEDICAL_SYSTEM_PROMPT,
  extractMedicalFromStorage,
} from '@/lib/llm/extract/extract-medical';
import {
  POLICE_SYSTEM_PROMPT,
  PoliceExtractorLLMError,
  PoliceExtractorPreCallError,
  extractPoliceFromStorage,
} from '@/lib/llm/extract/extract-police';
import {
  RECEIPT_SYSTEM_PROMPT,
  ReceiptExtractorLLMError,
  ReceiptExtractorPreCallError,
  extractReceiptFromStorage,
} from '@/lib/llm/extract/extract-receipt';

describe('receipt extractor', () => {
  it('success path maps receipt fields', async () => {
    const result = await extractReceiptFromStorage(baseInput(), {
      supabaseAdmin: fakeSupabase() as never,
      callClaude: fakeClaude({ storeName: 'Pharmacy', total: 12 }) as never,
    });

    expect(result.data).toMatchObject({ storeName: 'Pharmacy', total: 12 });
    expect(result.costUsd).toBeGreaterThan(0);
  });

  it('system prompt includes receipt field names', async () => {
    expect(RECEIPT_SYSTEM_PROMPT).toContain('storeName');
    expect(RECEIPT_SYSTEM_PROMPT).toContain('paymentMethod');
  });

  it('dirty fenced JSON parses through shared parser', async () => {
    const rawText = '```json\n{"storeName":"Shop","items":[]}\n```';
    const result = await extractReceiptFromStorage(baseInput(), {
      supabaseAdmin: fakeSupabase() as never,
      callClaude: fakeClaudeFromRaw(rawText) as never,
    });

    expect(result.data.storeName).toBe('Shop');
  });

  it('pre-call failure for missing file path', async () => {
    await expect(
      extractReceiptFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase({ filePath: null }) as never,
      }),
    ).rejects.toBeInstanceOf(ReceiptExtractorPreCallError);
  });

  it('pre-call failure for unsupported mime', async () => {
    await expect(
      extractReceiptFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase({ mimeType: 'image/heic' }) as never,
      }),
    ).rejects.toBeInstanceOf(ReceiptExtractorPreCallError);
  });

  it('LLM failure wraps thrown error', async () => {
    await expect(
      extractReceiptFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase() as never,
        callClaude: throwingClaude() as never,
      }),
    ).rejects.toBeInstanceOf(ReceiptExtractorLLMError);
  });

  it('parsed null wraps as LLM error', async () => {
    await expect(
      extractReceiptFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase() as never,
        callClaude: parsedNullClaude() as never,
      }),
    ).rejects.toBeInstanceOf(ReceiptExtractorLLMError);
  });
});

describe('police extractor', () => {
  it('success path maps police fields', async () => {
    const result = await extractPoliceFromStorage(baseInput(), {
      supabaseAdmin: fakeSupabase() as never,
      callClaude: fakeClaude({
        extracted: { caseNumber: 'A-1', itemsReported: ['bag'] },
        formatAnalysis: { caseNumberFormatMatch: true },
      }) as never,
    });

    expect(result.data.caseNumber).toBe('A-1');
    expect(result.data.formatAnalysis.caseNumberFormatMatch).toBe(true);
  });

  it('system prompt includes police field names', () => {
    expect(POLICE_SYSTEM_PROMPT).toContain('caseNumber');
    expect(POLICE_SYSTEM_PROMPT).toContain('formatAnalysis');
  });

  it('dirty fenced JSON parses through shared parser', async () => {
    const result = await extractPoliceFromStorage(baseInput(), {
      supabaseAdmin: fakeSupabase() as never,
      callClaude: fakeClaudeFromRaw(
        '```\n{"extracted":{"caseNumber":"P-7"},"formatAnalysis":{}}\n```',
      ) as never,
    });

    expect(result.data.caseNumber).toBe('P-7');
  });

  it('pre-call failure for missing file path', async () => {
    await expect(
      extractPoliceFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase({ filePath: null }) as never,
      }),
    ).rejects.toBeInstanceOf(PoliceExtractorPreCallError);
  });

  it('pre-call failure for unsupported mime', async () => {
    await expect(
      extractPoliceFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase({ mimeType: 'image/heic' }) as never,
      }),
    ).rejects.toBeInstanceOf(PoliceExtractorPreCallError);
  });

  it('LLM failure wraps thrown error', async () => {
    await expect(
      extractPoliceFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase() as never,
        callClaude: throwingClaude() as never,
      }),
    ).rejects.toBeInstanceOf(PoliceExtractorLLMError);
  });

  it('parsed null wraps as LLM error', async () => {
    await expect(
      extractPoliceFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase() as never,
        callClaude: parsedNullClaude() as never,
      }),
    ).rejects.toBeInstanceOf(PoliceExtractorLLMError);
  });
});

describe('hotel generic extractor', () => {
  it('success path maps hotel fields', async () => {
    const result = await extractHotelGenericFromStorage(baseInput(), {
      supabaseAdmin: fakeSupabase() as never,
      callClaude: fakeClaude({
        hotelName: 'Hotel',
        redFlags: ['odd'],
      }) as never,
    });

    expect(result.data.hotelName).toBe('Hotel');
    expect(result.data.redFlags).toEqual(['odd']);
  });

  it('system prompt includes hotel-generic field names', () => {
    expect(HOTEL_GENERIC_SYSTEM_PROMPT).toContain('hotelName');
    expect(HOTEL_GENERIC_SYSTEM_PROMPT).toContain('languageQuality');
  });

  it('dirty fenced JSON parses through shared parser', async () => {
    const result = await extractHotelGenericFromStorage(baseInput(), {
      supabaseAdmin: fakeSupabase() as never,
      callClaude: fakeClaudeFromRaw(
        '```json\n{"hotelName":"Inn"}\n```',
      ) as never,
    });

    expect(result.data.hotelName).toBe('Inn');
  });

  it('pre-call failure for missing file path', async () => {
    await expect(
      extractHotelGenericFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase({ filePath: null }) as never,
      }),
    ).rejects.toBeInstanceOf(HotelGenericExtractorPreCallError);
  });

  it('pre-call failure for unsupported mime', async () => {
    await expect(
      extractHotelGenericFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase({ mimeType: 'image/heic' }) as never,
      }),
    ).rejects.toBeInstanceOf(HotelGenericExtractorPreCallError);
  });

  it('LLM failure wraps thrown error', async () => {
    await expect(
      extractHotelGenericFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase() as never,
        callClaude: throwingClaude() as never,
      }),
    ).rejects.toBeInstanceOf(HotelGenericExtractorLLMError);
  });

  it('parsed null wraps as LLM error', async () => {
    await expect(
      extractHotelGenericFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase() as never,
        callClaude: parsedNullClaude() as never,
      }),
    ).rejects.toBeInstanceOf(HotelGenericExtractorLLMError);
  });
});

describe('medical extractor', () => {
  it('success path maps medical fields', async () => {
    const result = await extractMedicalFromStorage(baseInput(), {
      supabaseAdmin: fakeSupabase() as never,
      callClaude: fakeClaude({
        patientName: 'Patient',
        diagnosisBrief: 'Brief flu-like illness',
      }) as never,
    });

    expect(result.data.patientName).toBe('Patient');
    expect(result.data.diagnosisBrief).toContain('Brief');
  });

  it('system prompt includes medical field names and privacy guard', () => {
    expect(MEDICAL_SYSTEM_PROMPT).toContain('diagnosisBrief');
    expect(MEDICAL_SYSTEM_PROMPT).toContain('Do not copy a full sensitive');
  });

  it('dirty fenced JSON parses through shared parser', async () => {
    const result = await extractMedicalFromStorage(baseInput(), {
      supabaseAdmin: fakeSupabase() as never,
      callClaude: fakeClaudeFromRaw(
        'Here:\n```json\n{"patientName":"A"}\n```\nDone',
      ) as never,
    });

    expect(result.data.patientName).toBe('A');
  });

  it('pre-call failure for missing file path', async () => {
    await expect(
      extractMedicalFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase({ filePath: null }) as never,
      }),
    ).rejects.toBeInstanceOf(MedicalExtractorPreCallError);
  });

  it('pre-call failure for unsupported mime', async () => {
    await expect(
      extractMedicalFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase({ mimeType: 'image/heic' }) as never,
      }),
    ).rejects.toBeInstanceOf(MedicalExtractorPreCallError);
  });

  it('LLM failure wraps thrown error', async () => {
    await expect(
      extractMedicalFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase() as never,
        callClaude: throwingClaude() as never,
      }),
    ).rejects.toBeInstanceOf(MedicalExtractorLLMError);
  });

  it('parsed null wraps as LLM error', async () => {
    await expect(
      extractMedicalFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase() as never,
        callClaude: parsedNullClaude() as never,
      }),
    ).rejects.toBeInstanceOf(MedicalExtractorLLMError);
  });
});

function baseInput() {
  return { documentId: 'doc-id', fileName: 'evidence.pdf' };
}

function fakeClaude(parsed: Record<string, unknown>) {
  return vi.fn(async () => ({
    parsed,
    parseError: null,
    rawText: JSON.stringify(parsed),
    modelId: 'test-model',
    inputTokens: 100,
    outputTokens: 25,
    costUsd: 0.000675,
  }));
}

function fakeClaudeFromRaw(rawText: string) {
  return vi.fn(async () => {
    const { parsed, error } = parseClaudeJSON(rawText);

    return {
      parsed,
      parseError: error,
      rawText,
      modelId: 'test-model',
      inputTokens: 100,
      outputTokens: 25,
      costUsd: 0.000675,
    };
  });
}

function throwingClaude() {
  return vi.fn(async () => {
    throw new Error('sdk down');
  });
}

function parsedNullClaude() {
  return vi.fn(async () => ({
    parsed: null,
    parseError: 'bad json',
    rawText: '{',
    modelId: 'test-model',
    inputTokens: 1,
    outputTokens: 1,
    costUsd: 0,
  }));
}

function fakeSupabase(options?: {
  mimeType?: string;
  filePath?: string | null;
  downloadError?: boolean;
}) {
  return {
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        single() {
          return Promise.resolve({
            data: {
              file_path:
                options && 'filePath' in options
                  ? options.filePath
                  : 'claims/claim/doc.pdf',
              mime_type: options?.mimeType ?? 'application/pdf',
            },
            error: null,
          });
        },
      };
    },
    storage: {
      from() {
        return {
          download() {
            if (options?.downloadError) {
              return Promise.resolve({
                data: null,
                error: { message: 'download failed' },
              });
            }

            return Promise.resolve({
              data: new Blob(['fake document bytes']),
              error: null,
            });
          },
        };
      },
    },
  };
}
