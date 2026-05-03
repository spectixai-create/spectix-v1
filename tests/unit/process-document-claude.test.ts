import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CLASSIFIER_PRECALL_SENTINEL,
  CLASSIFIER_WRAPPER_SENTINEL,
  PROCESS_DOCUMENT_CONFIG,
  SYSTEM_ACTOR_ID,
  runProcessDocument,
} from '@/inngest/functions/process-document';
import {
  ClassifierLLMError,
  ClassifierPreCallError,
} from '@/lib/llm/classify-document';
import type { DocumentUploadedEvent, DocumentType } from '@/lib/types';

const claimId = '11111111-1111-4111-8111-111111111111';
const documentId = '22222222-2222-4222-8222-222222222222';
const MODEL_ID = 'claude-sonnet-4-6-20250915';

describe('processDocument Claude integration branches', () => {
  afterEach(() => {
    delete process.env.SPECTIX_FORCE_DOCUMENT_FAILURE;
    vi.restoreAllMocks();
  });

  it('C7 happy path audits llm actor and emits event', async () => {
    const supabase = new FakeSupabase();
    const step = createStep();

    const result = await runProcessDocument({
      event: uploadedEvent(),
      step,
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: async () => classifierResult('receipt'),
    });

    expect(result).toEqual({
      status: 'processed',
      documentId,
      transitioned: true,
    });
    expect(step.sendEvent).toHaveBeenCalledOnce();
    expect(supabase.lastAudit('document_processing_completed')).toMatchObject({
      actor_type: 'llm',
      actor_id: MODEL_ID,
    });
  });

  it('C8a LLM errors audit llm wrapper sentinel and emit failed', async () => {
    const supabase = new FakeSupabase();
    const step = createStep();

    const result = await runProcessDocument({
      event: uploadedEvent(),
      step,
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: async () => {
        throw new ClassifierLLMError('bad json');
      },
    });

    expect(result).toEqual({
      status: 'failed',
      documentId,
      transitioned: true,
    });
    expect(step.sendEvent).toHaveBeenCalledWith(
      'emit-process-failed',
      expect.objectContaining({ name: 'claim/document.process_failed' }),
    );
    expect(supabase.lastAudit('document_processing_failed')).toMatchObject({
      actor_type: 'llm',
      actor_id: CLASSIFIER_WRAPPER_SENTINEL,
    });
  });

  it('C8b pre-call errors audit system pre-call sentinel', async () => {
    const supabase = new FakeSupabase();

    await runProcessDocument({
      event: uploadedEvent(),
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: async () => {
        throw new ClassifierPreCallError('storage missing');
      },
    });

    expect(supabase.lastAudit('document_processing_failed')).toMatchObject({
      actor_type: 'system',
      actor_id: CLASSIFIER_PRECALL_SENTINEL,
    });
  });

  it('C8c forced failures audit process-document system actor', async () => {
    process.env.SPECTIX_FORCE_DOCUMENT_FAILURE = 'true';
    const supabase = new FakeSupabase();

    await runProcessDocument({
      event: uploadedEvent(),
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: async () => classifierResult('receipt'),
    });

    expect(supabase.lastAudit('document_processing_failed')).toMatchObject({
      actor_type: 'system',
      actor_id: SYSTEM_ACTOR_ID,
    });
  });

  it('C8d state change in finalize suppresses failed event', async () => {
    process.env.SPECTIX_FORCE_DOCUMENT_FAILURE = 'true';
    const step = createStep();
    const result = await runProcessDocument({
      event: uploadedEvent(),
      step,
      logger: createLogger(),
      supabaseAdmin: new FakeSupabase({
        changeStateBeforeFinalize: true,
      }) as never,
      classifier: async () => classifierResult('receipt'),
    });

    expect(result).toEqual({
      status: 'failed',
      documentId,
      transitioned: false,
    });
    expect(step.sendEvent).not.toHaveBeenCalled();
  });

  it('C9 pass UPSERT receives cumulative increment payload', async () => {
    const supabase = new FakeSupabase();

    await runProcessDocument({
      event: uploadedEvent(),
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: async () => classifierResult('receipt', 0.02),
    });

    expect(supabase.rpcCalls).toEqual([
      {
        name: 'upsert_pass_increment',
        payload: {
          p_claim_id: claimId,
          p_pass_number: 1,
          p_calls_increment: 1,
          p_cost_increment: 0.02,
        },
      },
    ]);
  });

  it('C10 forced failure does not call pass UPSERT', async () => {
    process.env.SPECTIX_FORCE_DOCUMENT_FAILURE = 'true';
    const supabase = new FakeSupabase();

    await runProcessDocument({
      event: uploadedEvent(),
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: async () => classifierResult('receipt'),
    });

    expect(supabase.rpcCalls).toHaveLength(0);
  });

  it('C11 pre-call failure does not call pass UPSERT', async () => {
    const supabase = new FakeSupabase();

    await runProcessDocument({
      event: uploadedEvent(),
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: async () => {
        throw new ClassifierPreCallError('bad storage');
      },
    });

    expect(supabase.rpcCalls).toHaveLength(0);
  });

  it('C12 config has claim-scoped concurrency', () => {
    expect(PROCESS_DOCUMENT_CONFIG.concurrency).toEqual({
      limit: 5,
      key: 'event.data.claimId',
    });
  });
});

function uploadedEvent(): DocumentUploadedEvent {
  return { name: 'claim/document.uploaded', data: { claimId, documentId } };
}

function classifierResult(documentType: DocumentType, costUsd = 0.000675) {
  return {
    documentType,
    confidence: 0.9,
    reasoning: 'classified',
    modelId: MODEL_ID,
    inputTokens: 100,
    outputTokens: 25,
    costUsd,
  };
}

function createLogger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function createStep() {
  return {
    run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    sendEvent: vi.fn(async () => undefined),
  };
}

class FakeSupabase {
  readonly auditLog: Array<Record<string, unknown>> = [];
  readonly rpcCalls: Array<Record<string, unknown>> = [];
  readonly document = {
    id: documentId,
    claim_id: claimId,
    file_name: 'receipt.pdf',
    document_type: 'other' as DocumentType,
    processing_status: 'pending',
    extracted_data: null as Record<string, unknown> | null,
  };

  constructor(
    private readonly options: { changeStateBeforeFinalize?: boolean } = {},
  ) {}

  from(table: string) {
    return new FakeQuery(this, table);
  }

  rpc(name: string, payload: Record<string, unknown>) {
    this.rpcCalls.push({ name, payload });
    return Promise.resolve({ error: null });
  }

  lastAudit(action: string) {
    return this.auditLog.findLast((row) => row.action === action);
  }

  updateDocument(
    payload: Record<string, unknown>,
    filters: Record<string, unknown>,
  ) {
    if (filters.id !== this.document.id) return null;
    if (filters.processing_status !== this.document.processing_status)
      return null;
    if (
      this.options.changeStateBeforeFinalize &&
      filters.processing_status === 'processing'
    ) {
      this.document.processing_status = 'processed';
      return null;
    }
    Object.assign(this.document, payload);
    return { ...this.document };
  }
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
    if (this.table === 'audit_log') this.client.auditLog.push(payload);
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
    return Promise.resolve({
      data:
        this.table === 'documents' && this.payload
          ? this.client.updateDocument(this.payload, this.filters)
          : null,
      error: null,
    });
  }
}
