import { afterEach, describe, expect, it, vi } from 'vitest';

import { runProcessDocument } from '@/inngest/functions/process-document';
import {
  NormalizedExtractorLLMError,
  type NormalizedExtractionResult,
} from '@/lib/llm/extract/normalized';
import type {
  DocumentProcessFailedEvent,
  DocumentProcessedEvent,
  DocumentSubtype,
  DocumentType,
  DocumentUploadedEvent,
  ReceiptExtraction,
} from '@/lib/types';

/**
 * These tests use a small fake Supabase fluent client and vi.fn() step mocks.
 * Inngest's public test utilities are not required here because the state
 * machine is exported as runProcessDocument and the createFunction wrapper is
 * thin.
 */

const claimId = '11111111-1111-4111-8111-111111111111';
const documentId = '22222222-2222-4222-8222-222222222222';

describe('processDocument state machine', () => {
  afterEach(() => {
    delete process.env.SPECTIX_FORCE_DOCUMENT_FAILURE;
    vi.restoreAllMocks();
  });

  it('U1 pending -> processing -> processed succeeds', async () => {
    const supabase = new FakeSupabase({ processingStatus: 'pending' });
    const step = createStep();

    const result = await runProcessDocument({
      event: uploadedEvent(),
      step,
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: fakeClassifier,
      subtypeClassifier: fakeSubtypeClassifier,
    });

    expect(result).toEqual({
      status: 'processed',
      documentId,
      transitioned: true,
      extraction: 'deferred',
      reason: 'skip_other',
    });
    expect(supabase.document.processing_status).toBe('processed');
    expect(supabase.document.extracted_data?.spike).toBe('03d-1b');
  });

  it('U2 skips when status is processing', async () => {
    const supabase = new FakeSupabase({ processingStatus: 'processing' });
    const result = await runProcessDocument({
      event: uploadedEvent(),
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
    });

    expect(result).toEqual({ skipped: true, reason: 'not_pending' });
  });

  it('U3 skips when status is processed', async () => {
    const supabase = new FakeSupabase({ processingStatus: 'processed' });
    const result = await runProcessDocument({
      event: uploadedEvent(),
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
    });

    expect(result).toEqual({ skipped: true, reason: 'not_pending' });
  });

  it('U4 SPECTIX_FORCE_DOCUMENT_FAILURE=true forces failed branch', async () => {
    process.env.SPECTIX_FORCE_DOCUMENT_FAILURE = 'true';
    const supabase = new FakeSupabase({ processingStatus: 'pending' });

    const result = await runProcessDocument({
      event: uploadedEvent(),
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
    });

    expect(result).toEqual({
      status: 'failed',
      documentId,
      transitioned: true,
    });
    expect(supabase.document.processing_status).toBe('failed');
    expect(supabase.document.extracted_data?.failure_category).toBe('forced');
  });

  it('U5 file_name containing [FAIL] triggers failed branch', async () => {
    const supabase = new FakeSupabase({
      processingStatus: 'pending',
      fileName: 'evidence_[FAIL].pdf',
    });

    const result = await runProcessDocument({
      event: uploadedEvent(),
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
    });

    expect(result).toEqual({
      status: 'failed',
      documentId,
      transitioned: true,
    });
    expect(supabase.document.extracted_data?.failure_category).toBe('forced');
  });

  it('U6 finalize sees state changed mid-processing and exits gracefully', async () => {
    const logger = createLogger();
    const supabase = new FakeSupabase({
      processingStatus: 'pending',
      changeStateBeforeFinalize: true,
    });

    const result = await runProcessDocument({
      event: uploadedEvent(),
      step: createStep(),
      logger,
      supabaseAdmin: supabase as never,
      classifier: fakeClassifier,
      subtypeClassifier: fakeSubtypeClassifier,
    });

    expect(result).toEqual({
      status: 'processed',
      documentId,
      transitioned: false,
    });
    expect(logger.warn).toHaveBeenCalledWith(
      '[skip-finalize] state changed mid-processing',
      { documentId, expected: 'processing' },
    );
  });

  it('U7 emits processed event after finalize-processed with typed payload', async () => {
    const supabase = new FakeSupabase({ processingStatus: 'pending' });
    const finalizeSpy = vi.fn();
    const step = createStep({
      onRun(name) {
        if (name === 'finalize-processed') finalizeSpy();
      },
    });
    const expected: DocumentProcessedEvent = {
      name: 'claim/document.processed',
      data: { claimId, documentId, documentType: 'other' },
    };

    await runProcessDocument({
      event: uploadedEvent(),
      step,
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: fakeClassifier,
      subtypeClassifier: fakeSubtypeClassifier,
    });

    expect(step.sendEvent).toHaveBeenCalledWith('emit-processed', expected);
    expect(finalizeSpy.mock.invocationCallOrder[0]).toBeLessThan(
      step.sendEvent.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
  });

  it('U9 completes pass 1 when every claim document is processed', async () => {
    const supabase = new FakeSupabase({
      processingStatus: 'pending',
      otherDocuments: [{ id: 'other-doc', processing_status: 'processed' }],
    });
    const step = createStep();

    await runProcessDocument({
      event: uploadedEvent(),
      step,
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: fakeClassifier,
      subtypeClassifier: fakeSubtypeClassifier,
    });

    expect(supabase.pass).toMatchObject({
      status: 'completed',
      completed_at: expect.any(String),
    });
    expect(step.sendEvent).toHaveBeenCalledWith(
      'emit-pass-completed',
      expect.objectContaining({ name: 'claim/pass.completed' }),
    );
  });

  it('U10 marks pass 1 failed when terminal claim documents include a failure', async () => {
    process.env.SPECTIX_FORCE_DOCUMENT_FAILURE = 'true';
    const supabase = new FakeSupabase({
      processingStatus: 'pending',
      otherDocuments: [{ id: 'other-doc', processing_status: 'processed' }],
    });
    const logger = createLogger();

    await runProcessDocument({
      event: uploadedEvent(),
      step: createStep(),
      logger,
      supabaseAdmin: supabase as never,
    });

    expect(supabase.pass).toMatchObject({
      status: 'failed',
      completed_at: expect.any(String),
    });
    expect(logger.warn).toHaveBeenCalledWith(
      '[pass-failed] document processing pass failed',
      { claimId, passNumber: 1, failedDocuments: 1 },
    );
  });

  it('U11 keeps pass 1 in progress while another claim document is pending', async () => {
    const supabase = new FakeSupabase({
      processingStatus: 'pending',
      otherDocuments: [{ id: 'other-doc', processing_status: 'pending' }],
    });
    const step = createStep();

    await runProcessDocument({
      event: uploadedEvent(),
      step,
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: fakeClassifier,
      subtypeClassifier: fakeSubtypeClassifier,
    });

    expect(supabase.pass.status).toBe('in_progress');
    expect(supabase.pass.completed_at).toBeNull();
    expect(step.sendEvent).not.toHaveBeenCalledWith(
      'emit-pass-completed',
      expect.anything(),
    );
  });

  it('U12 ignores unrelated documents from other claims when completing pass 1', async () => {
    const supabase = new FakeSupabase({
      processingStatus: 'pending',
      otherClaimDocuments: [
        { id: 'other-claim-doc', processing_status: 'processing' },
      ],
    });

    await runProcessDocument({
      event: uploadedEvent(),
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: fakeClassifier,
      subtypeClassifier: fakeSubtypeClassifier,
    });

    expect(supabase.pass.status).toBe('completed');
  });

  it('U13 does not emit pass completion again for a duplicate retry event', async () => {
    const supabase = new FakeSupabase({ processingStatus: 'pending' });
    const step = createStep();

    await runProcessDocument({
      event: uploadedEvent(),
      step,
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: fakeClassifier,
      subtypeClassifier: fakeSubtypeClassifier,
    });
    await runProcessDocument({
      event: uploadedEvent(),
      step,
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: fakeClassifier,
      subtypeClassifier: fakeSubtypeClassifier,
    });

    expect(step.sendEvent).toHaveBeenCalledTimes(4);
    const passCompletedEvents = step.sendEvent.mock.calls.filter(
      (call) => call[0] === 'emit-pass-completed',
    );
    expect(passCompletedEvents).toHaveLength(1);
  });

  it('U8 emits failed event after finalize-failed with typed payload', async () => {
    process.env.SPECTIX_FORCE_DOCUMENT_FAILURE = 'true';
    const supabase = new FakeSupabase({ processingStatus: 'pending' });
    const finalizeSpy = vi.fn();
    const step = createStep({
      onRun(name) {
        if (name === 'finalize-failed') finalizeSpy();
      },
    });
    const expected: DocumentProcessFailedEvent = {
      name: 'claim/document.process_failed',
      data: { claimId, documentId, error: 'forced_via_env_var' },
    };

    await runProcessDocument({
      event: uploadedEvent(),
      step,
      logger: createLogger(),
      supabaseAdmin: supabase as never,
    });

    expect(step.sendEvent).toHaveBeenCalledWith(
      'emit-process-failed',
      expected,
    );
    expect(finalizeSpy.mock.invocationCallOrder[0]).toBeLessThan(
      step.sendEvent.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
  });

  it('SPRINT-002B persists specialized normalized extraction success', async () => {
    const supabase = new FakeSupabase({ processingStatus: 'pending' });
    const normalizedExtractor = vi.fn(async () =>
      normalizedReceiptResult(0.0012),
    );

    const result = await runProcessDocument({
      event: uploadedEvent(),
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: fakeClassifierFor('receipt'),
      subtypeClassifier: fakeSubtypeClassifierFor('general_receipt'),
      normalizedExtractor,
    });

    expect(result).toMatchObject({
      status: 'processed',
      extraction: 'normalized_completed',
    });
    expect(normalizedExtractor).toHaveBeenCalledWith('receipt_general', {
      documentId,
      fileName: 'evidence.pdf',
    });
    expect(supabase.document.extracted_data).toMatchObject({
      kind: 'normalized_extraction',
      route: 'receipt_general',
      subtype: 'receipt_general',
      document_processing: {
        phase: 'extraction_completed',
        terminal: true,
        blocking_failure: false,
      },
    });
    expect(supabase.auditLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'document_normalized_extraction_completed',
        }),
      ]),
    );
  });

  it('SPRINT-002B falls back to legacy broad extraction when specialized extraction fails', async () => {
    const supabase = new FakeSupabase({ processingStatus: 'pending' });
    const normalizedExtractor = vi.fn(async () => {
      throw new NormalizedExtractorLLMError('schema invalid', undefined, {
        modelId: 'test-model',
        inputTokens: 10,
        outputTokens: 2,
        costUsd: 0.00006,
      });
    });
    const extractor = vi.fn(async () => legacyReceiptResult(0.0008));

    const result = await runProcessDocument({
      event: uploadedEvent(),
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: fakeClassifierFor('receipt'),
      subtypeClassifier: fakeSubtypeClassifierFor('general_receipt'),
      normalizedExtractor,
      extractor,
    });

    expect(result).toMatchObject({
      status: 'processed',
      extraction: 'completed',
    });
    expect(extractor).toHaveBeenCalledWith('receipt', {
      documentId,
      fileName: 'evidence.pdf',
    });
    expect(supabase.document.extracted_data).toMatchObject({
      kind: 'extraction',
      route: 'receipt',
      documentSubtype: 'general_receipt',
    });
    expect(supabase.auditLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'document_normalized_extraction_failed',
        }),
        expect.objectContaining({
          action: 'document_normalized_extraction_fallback_completed',
        }),
      ]),
    );
    expect(supabase.rpcCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          payload: expect.objectContaining({ p_cost_increment: 0.00006 }),
        }),
        expect.objectContaining({
          payload: expect.objectContaining({ p_cost_increment: 0.0008 }),
        }),
      ]),
    );
  });

  it('SPRINT-002B treats MVP fallback as degraded runtime behavior, not normalized smoke success', async () => {
    const supabase = new FakeSupabase({ processingStatus: 'pending' });
    const normalizedExtractor = vi.fn(async () => {
      throw new NormalizedExtractorLLMError('missing required flight_date');
    });
    const extractor = vi.fn(async () => legacyReceiptResult(0.0008));

    await runProcessDocument({
      event: uploadedEvent(),
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: fakeClassifierFor('receipt'),
      subtypeClassifier: fakeSubtypeClassifierFor('general_receipt'),
      normalizedExtractor,
      extractor,
    });

    expect(supabase.document.extracted_data).toMatchObject({
      kind: 'extraction',
    });
    expect(supabase.auditLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'document_normalized_extraction_failed',
          details: expect.objectContaining({ fallback_used: true }),
        }),
        expect.objectContaining({
          action: 'document_normalized_extraction_fallback_completed',
          details: expect.objectContaining({ fallback_used: true }),
        }),
      ]),
    );
  });

  it('SPRINT-002B keeps fallback_broad output in the legacy extraction shape', async () => {
    const supabase = new FakeSupabase({ processingStatus: 'pending' });
    const normalizedExtractor = vi.fn();
    const extractor = vi.fn(async () => legacyReceiptResult(0.0008));

    await runProcessDocument({
      event: uploadedEvent(),
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: fakeClassifierFor('receipt'),
      subtypeClassifier: fakeSubtypeClassifierFor('medical_receipt'),
      normalizedExtractor,
      extractor,
    });

    expect(normalizedExtractor).not.toHaveBeenCalled();
    expect(extractor).toHaveBeenCalledWith('receipt', {
      documentId,
      fileName: 'evidence.pdf',
    });
    expect(supabase.document.extracted_data).toMatchObject({
      kind: 'extraction',
      route: 'receipt',
      documentSubtype: 'medical_receipt',
    });
  });

  it('SPRINT-002B preserves skip_dedicated fallback behavior', async () => {
    const supabase = new FakeSupabase({ processingStatus: 'pending' });

    const result = await runProcessDocument({
      event: uploadedEvent(),
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: fakeClassifierFor('flight_doc'),
      subtypeClassifier: fakeSubtypeClassifierFor('border_records'),
    });

    expect(result).toMatchObject({
      status: 'processed',
      extraction: 'deferred',
      reason: 'skip_dedicated',
    });
    expect(supabase.document.extracted_data).toMatchObject({
      kind: 'classification',
      document_processing: {
        phase: 'extraction_deferred',
        terminal: true,
        blocking_failure: false,
      },
    });
  });

  it('SPRINT-002B marks extraction failed when specialized and fallback broad both fail', async () => {
    const supabase = new FakeSupabase({ processingStatus: 'pending' });
    const normalizedExtractor = vi.fn(async () => {
      throw new Error('normalized failed');
    });
    const extractor = vi.fn(async () => {
      throw new Error('fallback failed');
    });

    const result = await runProcessDocument({
      event: uploadedEvent(),
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: fakeClassifierFor('receipt'),
      subtypeClassifier: fakeSubtypeClassifierFor('general_receipt'),
      normalizedExtractor,
      extractor,
    });

    expect(result).toMatchObject({
      status: 'failed',
      extraction: 'failed',
    });
    expect(supabase.document.processing_status).toBe('failed');
    expect(supabase.document.extracted_data).toMatchObject({
      extraction_error: {
        route: 'receipt',
        error: 'fallback failed',
        blocking: true,
      },
    });
  });

  it('SPRINT-002B finalizes pass when terminal failure persistence loses a race', async () => {
    const supabase = new FakeSupabase({
      processingStatus: 'pending',
      otherDocuments: [{ id: 'other-doc', processing_status: 'processed' }],
      changeStateBeforeFailurePersistence: true,
    });
    const normalizedExtractor = vi.fn(async () => {
      throw new Error('normalized failed');
    });
    const extractor = vi.fn(async () => {
      throw new Error('fallback failed');
    });

    const result = await runProcessDocument({
      event: uploadedEvent(),
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: fakeClassifierFor('receipt'),
      subtypeClassifier: fakeSubtypeClassifierFor('general_receipt'),
      normalizedExtractor,
      extractor,
    });

    expect(result).toMatchObject({
      status: 'failed',
      extraction: 'failed_unpersisted',
    });
    expect(supabase.document.processing_status).toBe('failed');
    expect(supabase.rpcCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'finalize_pass_after_document_processing',
        }),
      ]),
    );
    expect(supabase.pass).toMatchObject({
      status: 'failed',
      completed_at: expect.any(String),
    });
  });
});

function uploadedEvent(): DocumentUploadedEvent {
  return {
    name: 'claim/document.uploaded',
    data: { claimId, documentId },
  };
}

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function createStep(options?: { onRun?: (name: string) => void }) {
  return {
    run: vi.fn(async (name: string, fn: () => Promise<unknown>) => {
      options?.onRun?.(name);
      return fn();
    }),
    sleep: vi.fn(async () => undefined),
    sendEvent: vi.fn(async (_name: string, _payload: unknown) => undefined),
  };
}

type FakeSupabaseOptions = {
  processingStatus: 'pending' | 'processing' | 'processed' | 'failed';
  fileName?: string;
  documentType?: DocumentType;
  changeStateBeforeFinalize?: boolean;
  changeStateBeforeFailurePersistence?: boolean;
  otherDocuments?: Array<{
    id: string;
    processing_status: 'pending' | 'processing' | 'processed' | 'failed';
  }>;
  otherClaimDocuments?: Array<{
    id: string;
    processing_status: 'pending' | 'processing' | 'processed' | 'failed';
  }>;
};

class FakeSupabase {
  readonly auditLog: Array<Record<string, unknown>> = [];
  readonly rpcCalls: Array<Record<string, unknown>> = [];
  readonly document: {
    id: string;
    claim_id: string;
    file_name: string | null;
    document_type: DocumentType;
    document_subtype: DocumentSubtype | null;
    processing_status: 'pending' | 'processing' | 'processed' | 'failed';
    extracted_data: Record<string, unknown> | null;
  };
  readonly otherDocuments: Array<{
    id: string;
    claim_id: string;
    processing_status: 'pending' | 'processing' | 'processed' | 'failed';
  }>;
  readonly otherClaimDocuments: Array<{
    id: string;
    claim_id: string;
    processing_status: 'pending' | 'processing' | 'processed' | 'failed';
  }>;
  readonly pass = {
    claim_id: claimId,
    pass_number: 1,
    status: 'in_progress',
    completed_at: null as string | null,
  };
  private changeStateBeforeFinalize: boolean;
  private changeStateBeforeFailurePersistence: boolean;

  constructor(options: FakeSupabaseOptions) {
    this.document = {
      id: documentId,
      claim_id: claimId,
      file_name: options.fileName ?? 'evidence.pdf',
      document_type: options.documentType ?? 'other',
      document_subtype: null,
      processing_status: options.processingStatus,
      extracted_data: null,
    };
    this.otherDocuments = (options.otherDocuments ?? []).map((document) => ({
      ...document,
      claim_id: claimId,
    }));
    this.otherClaimDocuments = (options.otherClaimDocuments ?? []).map(
      (document) => ({
        ...document,
        claim_id: '33333333-3333-4333-8333-333333333333',
      }),
    );
    this.changeStateBeforeFinalize = options.changeStateBeforeFinalize ?? false;
    this.changeStateBeforeFailurePersistence =
      options.changeStateBeforeFailurePersistence ?? false;
  }

  from(table: string) {
    return new FakeQuery(this, table);
  }

  rpc(name: string, payload: Record<string, unknown>) {
    this.rpcCalls.push({ name, payload });

    if (name === 'finalize_pass_after_document_processing') {
      const result = this.finalizePassAfterDocumentProcessing();

      return Promise.resolve({ data: [result], error: null });
    }

    return Promise.resolve({ error: null });
  }

  updateDocument(
    payload: Record<string, unknown>,
    filters: Record<string, unknown>,
  ) {
    if (filters.id !== this.document.id) return null;

    if (filters.processing_status !== this.document.processing_status) {
      return null;
    }

    if (
      this.changeStateBeforeFinalize &&
      filters.processing_status === 'processing'
    ) {
      this.document.processing_status = 'processed';
      return null;
    }

    if (
      this.changeStateBeforeFailurePersistence &&
      filters.processing_status === 'processing' &&
      payload.processing_status === 'failed'
    ) {
      this.document.processing_status = 'failed';
      this.document.extracted_data = {
        document_processing: {
          phase: 'external_failure_terminal',
          terminal: true,
          blocking_failure: true,
        },
      };
      return null;
    }

    Object.assign(this.document, payload);
    return { ...this.document };
  }

  finalizePassAfterDocumentProcessing() {
    const claimDocuments = [
      this.document,
      ...this.otherDocuments,
      ...this.otherClaimDocuments,
    ].filter((document) => document.claim_id === claimId);
    const pendingDocuments = claimDocuments.filter((document) =>
      ['pending', 'processing'].includes(document.processing_status),
    ).length;
    const failedDocuments = claimDocuments.filter(
      (document) => document.processing_status === 'failed',
    ).length;

    if (pendingDocuments > 0) {
      return {
        status: 'in_progress',
        terminal_documents: claimDocuments.length - pendingDocuments,
        failed_documents: failedDocuments,
        non_terminal_documents: pendingDocuments,
        transitioned: false,
        emit_completed_event: false,
      };
    }

    const nextStatus = failedDocuments > 0 ? 'failed' : 'completed';
    const transitioned =
      this.pass.status !== nextStatus || this.pass.completed_at === null;
    const emitCompletedEvent = nextStatus === 'completed' && transitioned;
    this.pass.status = nextStatus;
    this.pass.completed_at ??= '2026-05-04T00:00:00.000Z';

    return {
      status: nextStatus,
      terminal_documents: claimDocuments.length,
      failed_documents: failedDocuments,
      non_terminal_documents: 0,
      transitioned,
      emit_completed_event: emitCompletedEvent,
    };
  }
}

async function fakeClassifier() {
  return {
    documentType: 'other' as const,
    confidence: 0.9,
    reasoning: 'test',
    modelId: 'test-model',
    inputTokens: 100,
    outputTokens: 20,
    costUsd: 0.0006,
  };
}

async function fakeSubtypeClassifier() {
  return {
    documentSubtype: 'claim_form' as const,
    confidence: 0.9,
    reasoning: 'test subtype',
    modelId: 'test-model',
    inputTokens: 80,
    outputTokens: 20,
    costUsd: 0.00054,
    llmReturnedRaw: 'claim_form',
    skipped: false,
  };
}

function fakeClassifierFor(documentType: DocumentType) {
  return async () => ({
    documentType,
    confidence: 0.9,
    reasoning: 'test',
    modelId: 'test-model',
    inputTokens: 100,
    outputTokens: 20,
    costUsd: 0.0006,
  });
}

function fakeSubtypeClassifierFor(documentSubtype: DocumentSubtype) {
  return async () => ({
    documentSubtype,
    confidence: 0.9,
    reasoning: 'test subtype',
    modelId: 'test-model',
    inputTokens: 80,
    outputTokens: 20,
    costUsd: 0.00054,
    llmReturnedRaw: documentSubtype,
    skipped: false,
  });
}

function normalizedReceiptResult(costUsd: number): NormalizedExtractionResult {
  return {
    data: {
      kind: 'normalized_extraction',
      route: 'receipt_general',
      subtype: 'receipt_general',
      schema_version: 'sprint-002a.v1',
      source_document_id: documentId,
      status: 'completed',
      confidence: 0.9,
      warnings: [],
      extraction_completed_at: '2026-05-05T00:00:00.000Z',
      normalized_data: {
        subtype: 'receipt_general',
        fields: {
          merchant_name: present('Pharmacy'),
          transaction_date: present('2026-04-30'),
          total_amount: present(12),
          currency: present('ILS'),
          expense_summary_or_category: present('medicine'),
          document_confidence: present(0.9),
        },
      },
    },
    modelId: 'test-normalized-model',
    inputTokens: 10,
    outputTokens: 5,
    costUsd,
  };
}

function legacyReceiptResult(costUsd: number) {
  return {
    data: {
      storeName: 'Pharmacy',
      storeAddress: null,
      storePhone: null,
      receiptDate: '2026-04-30',
      receiptNumber: null,
      items: [],
      subtotal: null,
      tax: null,
      total: 12,
      currency: 'ILS',
      paymentMethod: null,
    } satisfies ReceiptExtraction,
    modelId: 'test-fallback-model',
    inputTokens: 20,
    outputTokens: 6,
    costUsd,
  };
}

function present<T>(value: T) {
  return { presence: 'present' as const, value, confidence: 0.9 };
}

class FakeQuery {
  private payload: Record<string, unknown> | null = null;
  private filters: Record<string, unknown> = {};

  constructor(
    private readonly client: FakeSupabase,
    private readonly table: string,
  ) {}

  update(payload: Record<string, unknown>) {
    this.payload = payload;
    return this;
  }

  insert(payload: Record<string, unknown>) {
    if (this.table === 'audit_log') {
      this.client.auditLog.push(payload);
    }

    return Promise.resolve({ error: null });
  }

  eq(column: string, value: unknown) {
    this.filters[column] = value;
    return this;
  }

  select() {
    return this;
  }

  maybeSingle() {
    if (this.table !== 'documents' || !this.payload) {
      return Promise.resolve({ data: null, error: null });
    }

    return Promise.resolve({
      data: this.client.updateDocument(this.payload, this.filters),
      error: null,
    });
  }
}
