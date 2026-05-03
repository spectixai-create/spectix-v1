import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CLASSIFIER_PRECALL_SENTINEL,
  PROCESS_DOCUMENT_CONFIG,
  SYSTEM_ACTOR_ID,
  runProcessDocument,
} from '@/inngest/functions/process-document';
import { DEFAULT_MODEL } from '@/lib/llm/client';
import {
  ClassifierLLMError,
  ClassifierPreCallError,
} from '@/lib/llm/classify-document';
import {
  SUBTYPE_DETERMINISTIC_ACTOR_ID,
  SUBTYPE_PRECALL_SENTINEL,
  SubtypeClassifierLLMError,
  SubtypeClassifierPreCallError,
} from '@/lib/llm/classify-subtype';
import type {
  DocumentSubtype,
  DocumentUploadedEvent,
  DocumentType,
} from '@/lib/types';

const claimId = '11111111-1111-4111-8111-111111111111';
const documentId = '22222222-2222-4222-8222-222222222222';
const MODEL_ID = 'claude-sonnet-4-5-20250929';

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
      subtypeClassifier: async () => subtypeResult('general_receipt'),
    });

    expect(result).toEqual({
      status: 'processed',
      documentId,
      transitioned: true,
    });
    expect(step.sendEvent).toHaveBeenCalledTimes(2);
    expect(supabase.lastAudit('document_processing_completed')).toMatchObject({
      actor_type: 'llm',
      actor_id: MODEL_ID,
    });
  });

  it('C8a broad LLM errors audit canonical default model and emit failed', async () => {
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
      actor_id: DEFAULT_MODEL,
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
      subtypeClassifier: async () => subtypeResult('general_receipt'),
    });

    const failedAudit = supabase.lastAudit('document_processing_failed');
    expect(failedAudit).toMatchObject({
      actor_type: 'system',
      actor_id: SYSTEM_ACTOR_ID,
    });
    expect(failedAudit?.details).toMatchObject({
      failure_phase: 'forced',
    });
    expect(supabase.document.extracted_data).toMatchObject({
      failure_phase: 'forced',
    });
  });

  it('C8e filename-forced failures record forced phase in audit and document data', async () => {
    const supabase = new FakeSupabase();
    supabase.document.file_name = 'receipt_[FAIL].pdf';

    await runProcessDocument({
      event: uploadedEvent(),
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: async () => classifierResult('receipt'),
      subtypeClassifier: async () => subtypeResult('general_receipt'),
    });

    const failedAudit = supabase.lastAudit('document_processing_failed');
    expect(failedAudit?.details).toMatchObject({
      failure_category: 'forced',
      failure_phase: 'forced',
    });
    expect(supabase.document.extracted_data).toMatchObject({
      failure_category: 'forced',
      failure_phase: 'forced',
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
      subtypeClassifier: async () => subtypeResult('general_receipt', 0.003),
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
      {
        name: 'upsert_pass_increment',
        payload: {
          p_claim_id: claimId,
          p_pass_number: 1,
          p_calls_increment: 1,
          p_cost_increment: 0.003,
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

  it('U-NEW-1 skip-subtype broad writes deterministic subtype and broad cost only', async () => {
    const supabase = new FakeSupabase();
    const step = createStep();

    await runProcessDocument({
      event: uploadedEvent(),
      step,
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: async () => classifierResult('police_report', 0.02),
      subtypeClassifier: async () =>
        subtypeResult('police_report', 0, {
          skipped: true,
          modelId: SUBTYPE_DETERMINISTIC_ACTOR_ID,
          llmReturnedRaw: null,
        }),
    });

    expect(supabase.document.document_subtype).toBe('police_report');
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
    expect(
      supabase.lastAudit('document_subtype_classification_completed'),
    ).toMatchObject({
      actor_type: 'system',
      actor_id: SUBTYPE_DETERMINISTIC_ACTOR_ID,
    });
    expect(step.sendEvent).toHaveBeenCalledWith(
      'emit-subtype-classified',
      expect.objectContaining({
        name: 'claim/document.subtype_classified',
      }),
    );
  });

  it('U-NEW-2 LLM subtype success writes subtype, audits, and emits both events', async () => {
    const supabase = new FakeSupabase();
    const step = createStep();

    await runProcessDocument({
      event: uploadedEvent(),
      step,
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: async () => classifierResult('receipt', 0.02),
      subtypeClassifier: async () => subtypeResult('medical_receipt', 0.003),
    });

    expect(supabase.document.document_subtype).toBe('medical_receipt');
    expect(supabase.rpcCalls).toHaveLength(2);
    expect(
      supabase.lastAudit('document_subtype_classification_completed'),
    ).toMatchObject({
      actor_type: 'llm',
      actor_id: MODEL_ID,
    });
    expect(step.sendEvent).toHaveBeenCalledWith(
      'emit-processed',
      expect.objectContaining({ name: 'claim/document.processed' }),
    );
    expect(step.sendEvent).toHaveBeenCalledWith(
      'emit-subtype-classified',
      expect.objectContaining({ name: 'claim/document.subtype_classified' }),
    );
  });

  it('U-NEW-3 subtype LLM error preserves broad cost only', async () => {
    const supabase = new FakeSupabase();
    const step = createStep();

    await runProcessDocument({
      event: uploadedEvent(),
      step,
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: async () => classifierResult('receipt', 0.02),
      subtypeClassifier: async () => {
        throw new SubtypeClassifierLLMError('subtype failed');
      },
    });

    expect(step.run).toHaveBeenCalledWith(
      'upsert-pass-broad-cost',
      expect.any(Function),
    );
    expect(step.run).not.toHaveBeenCalledWith(
      'upsert-pass-subtype-cost',
      expect.any(Function),
    );
    expect(supabase.rpcCalls).toHaveLength(1);
    expect(supabase.rpcCalls.at(0)?.payload).toMatchObject({
      p_cost_increment: 0.02,
    });
    expect(supabase.document.processing_status).toBe('failed');
    expect(supabase.document.extracted_data).toMatchObject({
      failure_phase: 'subtype',
    });
    const failedAudit = supabase.lastAudit('document_processing_failed');
    expect(failedAudit).toMatchObject({
      actor_type: 'llm',
      actor_id: DEFAULT_MODEL,
    });
    expect(failedAudit?.details).toMatchObject({
      cost_usd: 0.02,
      failure_phase: 'subtype',
    });
  });

  it('U-NEW-4 subtype pre-call error audits subtype pre-call sentinel', async () => {
    const supabase = new FakeSupabase();
    const step = createStep();

    await runProcessDocument({
      event: uploadedEvent(),
      step,
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: async () => classifierResult('receipt', 0.02),
      subtypeClassifier: async () => {
        throw new SubtypeClassifierPreCallError('no file path');
      },
    });

    expect(step.run).toHaveBeenCalledWith(
      'upsert-pass-broad-cost',
      expect.any(Function),
    );
    expect(step.run).not.toHaveBeenCalledWith(
      'upsert-pass-subtype-cost',
      expect.any(Function),
    );
    expect(supabase.lastAudit('document_processing_failed')).toMatchObject({
      actor_type: 'system',
      actor_id: SUBTYPE_PRECALL_SENTINEL,
    });
  });

  it('U-NEW-5 invalid subtype persists null and skips subtype event', async () => {
    const supabase = new FakeSupabase();
    const step = createStep();

    await runProcessDocument({
      event: uploadedEvent(),
      step,
      logger: createLogger(),
      supabaseAdmin: supabase as never,
      classifier: async () => classifierResult('receipt', 0.02),
      subtypeClassifier: async () =>
        subtypeResult(null, 0.003, { llmReturnedRaw: 'invalid_value' }),
    });

    expect(supabase.document.document_subtype).toBeNull();
    expect(
      supabase.lastAudit('document_subtype_classification_completed')?.details,
    ).toMatchObject({
      llm_returned_invalid_subtype: 'invalid_value',
    });
    expect(step.sendEvent).toHaveBeenCalledWith(
      'emit-processed',
      expect.objectContaining({ name: 'claim/document.processed' }),
    );
    expect(step.sendEvent).not.toHaveBeenCalledWith(
      'emit-subtype-classified',
      expect.anything(),
    );
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

function subtypeResult(
  documentSubtype: DocumentSubtype | null,
  costUsd = 0.00054,
  overrides: Partial<{
    skipped: boolean;
    modelId: string;
    llmReturnedRaw: string | null;
  }> = {},
) {
  return {
    documentSubtype,
    confidence: 0.88,
    reasoning: 'subtype classified',
    modelId: overrides.modelId ?? MODEL_ID,
    inputTokens: 80,
    outputTokens: 20,
    costUsd,
    llmReturnedRaw: overrides.llmReturnedRaw ?? documentSubtype,
    skipped: overrides.skipped ?? false,
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
    document_subtype: null as DocumentSubtype | null,
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
