import { describe, expect, it, vi } from 'vitest';

import {
  WATCHDOG_ACTOR_ID,
  runWatchdogStuckDocuments,
} from '@/inngest/functions/watchdog-stuck-documents';

describe('watchdogStuckDocuments', () => {
  it('W1 transitions stuck processing documents to failed', async () => {
    const supabase = new FakeWatchdogSupabase([
      processingDoc('doc-1', minutesAgo(10)),
    ]);

    const result = await runWatchdogStuckDocuments({
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
    });

    expect(result).toEqual({ scanned: 1, transitioned: 1 });
    expect(supabase.docs[0]?.processing_status).toBe('failed');
  });

  it('W2 ignores fresh processing documents', async () => {
    const supabase = new FakeWatchdogSupabase([
      processingDoc('doc-1', minutesAgo(1)),
    ]);

    const result = await runWatchdogStuckDocuments({
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
    });

    expect(result).toEqual({ scanned: 0, transitioned: 0 });
  });

  it('W3 writes watchdog audit actor', async () => {
    const supabase = new FakeWatchdogSupabase([
      processingDoc('doc-1', minutesAgo(10)),
    ]);

    await runWatchdogStuckDocuments({
      step: createStep(),
      logger: createLogger(),
      supabaseAdmin: supabase as never,
    });

    expect(supabase.auditLog[0]).toMatchObject({
      actor_type: 'system',
      actor_id: WATCHDOG_ACTOR_ID,
      action: 'document_processing_failed',
    });
  });

  it('W4 skips if state changed before transition', async () => {
    const logger = createLogger();
    const supabase = new FakeWatchdogSupabase(
      [processingDoc('doc-1', minutesAgo(10))],
      { changeBeforeTransition: true },
    );

    const result = await runWatchdogStuckDocuments({
      step: createStep(),
      logger,
      supabaseAdmin: supabase as never,
    });

    expect(result).toEqual({ scanned: 1, transitioned: 0 });
    expect(logger.info).toHaveBeenCalledWith(
      '[watchdog-skip] state changed before watchdog',
      { documentId: 'doc-1' },
    );
  });
});

function createStep() {
  return {
    run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
  };
}

function createLogger() {
  return { info: vi.fn(), error: vi.fn() };
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function processingDoc(id: string, createdAt: string) {
  return {
    id,
    claim_id: 'claim-1',
    created_at: createdAt,
    processing_status: 'processing',
    extracted_data: null as Record<string, unknown> | null,
  };
}

class FakeWatchdogSupabase {
  readonly auditLog: Array<Record<string, unknown>> = [];

  constructor(
    readonly docs: ReturnType<typeof processingDoc>[],
    private readonly options: { changeBeforeTransition?: boolean } = {},
  ) {}

  from(table: string) {
    return new FakeWatchdogQuery(this, table);
  }
}

class FakeWatchdogQuery {
  private filters: Record<string, unknown> = {};
  private lessThan: { column: string; value: string } | null = null;
  private payload: Record<string, unknown> | null = null;

  constructor(
    private readonly client: FakeWatchdogSupabase,
    private readonly table: string,
  ) {}

  select() {
    return this;
  }

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

  lt(column: string, value: string) {
    this.lessThan = { column, value };
    return this;
  }

  limit() {
    const rows = this.client.docs.filter(
      (doc) =>
        doc.processing_status === this.filters.processing_status &&
        this.lessThan &&
        doc.created_at < this.lessThan.value,
    );

    return Promise.resolve({ data: rows, error: null });
  }

  maybeSingle() {
    const doc = this.client.docs.find((row) => row.id === this.filters.id);
    if (!doc || doc.processing_status !== this.filters.processing_status) {
      return Promise.resolve({ data: null, error: null });
    }

    if (this.client['options'].changeBeforeTransition) {
      doc.processing_status = 'processed';
      return Promise.resolve({ data: null, error: null });
    }

    Object.assign(doc, this.payload);
    return Promise.resolve({ data: { id: doc.id }, error: null });
  }
}
