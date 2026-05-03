import { describe, expect, it, vi } from 'vitest';

import {
  ClassifierLLMError,
  ClassifierPreCallError,
  classifyDocumentFromStorage,
} from '@/lib/llm/classify-document';

describe('classifyDocumentFromStorage', () => {
  it('C1 maps happy Claude output', async () => {
    const result = await classifyDocumentFromStorage(baseInput(), {
      supabaseAdmin: fakeSupabase() as never,
      callClaude: fakeClaude({
        document_type: 'police_report',
        confidence: 0.92,
        reasoning: 'דוח משטרה',
      }) as never,
    });

    expect(result.documentType).toBe('police_report');
    expect(result.confidence).toBe(0.92);
  });

  it('C2 falls back invalid document_type to other', async () => {
    const result = await classifyDocumentFromStorage(baseInput(), {
      supabaseAdmin: fakeSupabase() as never,
      callClaude: fakeClaude({
        document_type: 'invoice',
        confidence: 0.7,
        reasoning: 'לא מוכר',
      }) as never,
    });

    expect(result.documentType).toBe('other');
  });

  it('C3a wraps SDK throws in ClassifierLLMError', async () => {
    await expect(
      classifyDocumentFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase() as never,
        callClaude: vi.fn(async () => {
          throw new Error('sdk down');
        }) as never,
      }),
    ).rejects.toBeInstanceOf(ClassifierLLMError);
  });

  it('C3b wraps malformed JSON in ClassifierLLMError', async () => {
    await expect(
      classifyDocumentFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase() as never,
        callClaude: vi.fn(async () => ({
          parsed: null,
          parseError: 'bad json',
          rawText: '{',
          modelId: 'test-model',
          inputTokens: 1,
          outputTokens: 1,
          costUsd: 0,
        })) as never,
      }),
    ).rejects.toBeInstanceOf(ClassifierLLMError);
  });

  it('C4 clamps confidence above 1', async () => {
    const result = await classifyDocumentFromStorage(baseInput(), {
      supabaseAdmin: fakeSupabase() as never,
      callClaude: fakeClaude({
        document_type: 'receipt',
        confidence: 1.5,
        reasoning: 'קבלה',
      }) as never,
    });

    expect(result.confidence).toBe(1);
  });

  it('C5 storage download failures are pre-call errors', async () => {
    await expect(
      classifyDocumentFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase({ downloadError: true }) as never,
        callClaude: fakeClaude({
          document_type: 'receipt',
          confidence: 0.9,
          reasoning: '',
        }) as never,
      }),
    ).rejects.toBeInstanceOf(ClassifierPreCallError);
  });

  it('C6 builds correct content blocks for pdf, jpeg, png and rejects HEIC', async () => {
    for (const [mimeType, expectedType] of [
      ['application/pdf', 'document'],
      ['image/jpeg', 'image'],
      ['image/png', 'image'],
    ] as const) {
      const callClaude = fakeClaude({
        document_type: 'other',
        confidence: 0.5,
        reasoning: '',
      });
      await classifyDocumentFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase({ mimeType }) as never,
        callClaude: callClaude as never,
      });
      const calls = callClaude.mock.calls as unknown as Array<
        [{ contentBlocks: Array<{ type: string }> }]
      >;
      expect(calls.at(0)?.[0].contentBlocks.at(0)?.type).toBe(expectedType);
    }

    await expect(
      classifyDocumentFromStorage(baseInput(), {
        supabaseAdmin: fakeSupabase({ mimeType: 'image/heic' }) as never,
        callClaude: fakeClaude({
          document_type: 'other',
          confidence: 0.5,
          reasoning: '',
        }) as never,
      }),
    ).rejects.toThrow(/Unsupported mime_type/);
  });
});

function baseInput() {
  return { documentId: 'doc-id', fileName: 'evidence.pdf' };
}

function fakeClaude(parsed: {
  document_type: string;
  confidence: number;
  reasoning: string;
}) {
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

function fakeSupabase(options?: {
  mimeType?: string;
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
              file_path: 'claims/claim/doc.pdf',
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
