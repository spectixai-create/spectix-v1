import { describe, expect, it, vi } from 'vitest';

import {
  SUBTYPE_DETERMINISTIC_ACTOR_ID,
  SubtypeClassifierLLMError,
  SubtypeClassifierPreCallError,
  classifySubtypeFromStorage,
} from '@/lib/llm/classify-subtype';
import { parseClaudeJSON } from '@/lib/llm/client';
import type { DocumentType } from '@/lib/types';

describe('classifySubtypeFromStorage', () => {
  it('skip path maps police_report deterministically', async () => {
    const callClaude = vi.fn();
    const result = await classifySubtypeFromStorage(
      baseInput('police_report'),
      {
        callClaude: callClaude as never,
      },
    );

    expect(result).toMatchObject({
      documentSubtype: 'police_report',
      skipped: true,
      costUsd: 0,
      modelId: SUBTYPE_DETERMINISTIC_ACTOR_ID,
      llmReturnedRaw: null,
    });
    expect(callClaude).not.toHaveBeenCalled();
  });

  it('skip path maps photo deterministically', async () => {
    const result = await classifySubtypeFromStorage(baseInput('photo'));

    expect(result).toMatchObject({
      documentSubtype: 'photos',
      skipped: true,
      costUsd: 0,
      modelId: SUBTYPE_DETERMINISTIC_ACTOR_ID,
      llmReturnedRaw: null,
    });
  });

  it('LLM path returns valid receipt subtype', async () => {
    const result = await classifySubtypeFromStorage(baseInput('receipt'), {
      supabaseAdmin: fakeSupabase() as never,
      callClaude: fakeClaude({
        document_subtype: 'medical_receipt',
        confidence: 0.85,
        reasoning: 'קבלה רפואית',
      }) as never,
    });

    expect(result).toMatchObject({
      documentSubtype: 'medical_receipt',
      confidence: 0.85,
      skipped: false,
      llmReturnedRaw: 'medical_receipt',
    });
    expect(result.costUsd).toBeGreaterThan(0);
  });

  it('system prompt enumerates allowed receipt subtypes with Hebrew labels', async () => {
    const callClaude = fakeClaude({
      document_subtype: 'general_receipt',
      confidence: 0.8,
      reasoning: 'קבלה',
    });

    await classifySubtypeFromStorage(baseInput('receipt'), {
      supabaseAdmin: fakeSupabase() as never,
      callClaude: callClaude as never,
    });

    const firstCall = callClaude.mock.calls.at(0) as
      | [{ system: string }]
      | undefined;

    expect(firstCall).toBeDefined();
    const system = firstCall?.[0].system ?? '';
    expect(system).toContain('general_receipt');
    expect(system).toContain('medical_receipt');
    expect(system).toContain('repair_estimate_or_invoice');
    expect(system).toContain('pharmacy_receipt');
    expect(system).toContain('קבלת בית מרקחת');
  });

  it('invalid subtype returns null without throwing', async () => {
    const result = await classifySubtypeFromStorage(baseInput('receipt'), {
      supabaseAdmin: fakeSupabase() as never,
      callClaude: fakeClaude({
        document_subtype: 'made_up_subtype',
        confidence: 0.5,
        reasoning: 'לא מוכר',
      }) as never,
    });

    expect(result).toMatchObject({
      documentSubtype: null,
      llmReturnedRaw: 'made_up_subtype',
      skipped: false,
    });
    expect(result.costUsd).toBeGreaterThan(0);
  });

  it('dirty fenced JSON response is parsed through parser cleanup', async () => {
    const rawText =
      '```json\n{"document_subtype":"pharmacy_receipt","confidence":0.91,"reasoning":"קבלה מבית מרקחת"}\n```';
    const callClaude = vi.fn(async () => {
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

    const result = await classifySubtypeFromStorage(baseInput('receipt'), {
      supabaseAdmin: fakeSupabase() as never,
      callClaude: callClaude as never,
    });

    expect(result.documentSubtype).toBe('pharmacy_receipt');
  });

  it('pre-call failure when document row has no file_path', async () => {
    await expect(
      classifySubtypeFromStorage(baseInput('receipt'), {
        supabaseAdmin: fakeSupabase({ filePath: null }) as never,
        callClaude: fakeClaude({
          document_subtype: 'general_receipt',
          confidence: 0.9,
          reasoning: '',
        }) as never,
      }),
    ).rejects.toBeInstanceOf(SubtypeClassifierPreCallError);
  });

  it('pre-call failure for unsupported mime', async () => {
    await expect(
      classifySubtypeFromStorage(baseInput('receipt'), {
        supabaseAdmin: fakeSupabase({ mimeType: 'image/heic' }) as never,
        callClaude: fakeClaude({
          document_subtype: 'general_receipt',
          confidence: 0.9,
          reasoning: '',
        }) as never,
      }),
    ).rejects.toBeInstanceOf(SubtypeClassifierPreCallError);
  });

  it('wraps callClaude throws in SubtypeClassifierLLMError', async () => {
    await expect(
      classifySubtypeFromStorage(baseInput('receipt'), {
        supabaseAdmin: fakeSupabase() as never,
        callClaude: vi.fn(async () => {
          throw new Error('sdk down');
        }) as never,
      }),
    ).rejects.toBeInstanceOf(SubtypeClassifierLLMError);
  });

  it('wraps parsed null responses in SubtypeClassifierLLMError', async () => {
    await expect(
      classifySubtypeFromStorage(baseInput('receipt'), {
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
    ).rejects.toBeInstanceOf(SubtypeClassifierLLMError);
  });

  it('receipt broad can reach pharmacy_receipt', async () => {
    const result = await classifySubtypeFromStorage(baseInput('receipt'), {
      supabaseAdmin: fakeSupabase() as never,
      callClaude: fakeClaude({
        document_subtype: 'pharmacy_receipt',
        confidence: 0.9,
        reasoning: 'קבלת בית מרקחת',
      }) as never,
    });

    expect(result.documentSubtype).toBe('pharmacy_receipt');
  });
});

function baseInput(broad: DocumentType) {
  return { documentId: 'doc-id', fileName: 'evidence.pdf', broad };
}

function fakeClaude(parsed: {
  document_subtype: string;
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
