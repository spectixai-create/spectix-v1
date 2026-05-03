import { afterEach, describe, expect, it, vi } from 'vitest';

import { runProcessDocument } from '@/inngest/functions/process-document';
import type {
  DocumentProcessFailedEvent,
  DocumentProcessedEvent,
  DocumentSubtype,
  DocumentType,
  DocumentUploadedEvent,
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
    });
    expect(supabase.document.processing_status).toBe('processed');
    expect(supabase.document.extracted_data?.spike).toBe('03d-1a');
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
    sendEvent: vi.fn(async () => undefined),
  };
}

type FakeSupabaseOptions = {
  processingStatus: 'pending' | 'processing' | 'processed' | 'failed';
  fileName?: string;
  documentType?: DocumentType;
  changeStateBeforeFinalize?: boolean;
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
  private changeStateBeforeFinalize: boolean;

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
    this.changeStateBeforeFinalize = options.changeStateBeforeFinalize ?? false;
  }

  from(table: string) {
    return new FakeQuery(this, table);
  }

  rpc(name: string, payload: Record<string, unknown>) {
    this.rpcCalls.push({ name, payload });
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

    Object.assign(this.document, payload);
    return { ...this.document };
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
