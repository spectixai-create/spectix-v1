import { describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/admin/claims/[id]/retry/route';
import {
  deriveLastGoodStateFromPasses,
  recoverErroredClaim,
  transitionClaimToErrored,
} from '@/lib/errored';
import { handleClaimScopedFunctionFailure } from '@/inngest/functions/claim-failure';

const claimId = '11111111-1111-4111-8111-111111111111';

describe('errored claim transitions and recovery', () => {
  it('transitionClaimToErrored performs guarded update and safe audit', async () => {
    const supabase = new FakeSupabase({
      status: 'processing',
      completedPass: 2,
    });

    await expect(
      transitionClaimToErrored({
        claimId,
        error: new TypeError('database exploded with safe message'),
        supabaseAdmin: supabase as never,
      }),
    ).resolves.toEqual({
      transitioned: true,
      claimId,
      status: 'errored',
      lastPassNumber: 2,
    });

    expect(supabase.claim.status).toBe('errored');
    expect(supabase.auditLog).toEqual([
      expect.objectContaining({
        action: 'claim_errored',
        details: expect.objectContaining({
          error_class: 'TypeError',
          error_message: 'database exploded with safe message',
          last_pass_number: 2,
        }),
      }),
    ]);
  });

  it.each(['ready', 'rejected_no_coverage', 'errored', 'cost_capped'])(
    'does not transition guarded %s claims',
    async (status) => {
      const supabase = new FakeSupabase({ status });

      await expect(
        transitionClaimToErrored({
          claimId,
          error: new Error('boom'),
          supabaseAdmin: supabase as never,
        }),
      ).resolves.toMatchObject({
        transitioned: false,
        status: 'unchanged',
      });
      expect(supabase.claim.status).toBe(status);
      expect(supabase.auditLog).toEqual([]);
    },
  );

  it.each([
    { completedPass: null, expected: 'no_completed_pass' },
    { completedPass: 1, expected: 'pass_1_completed' },
    { completedPass: 2, expected: 'pass_2_completed' },
    { completedPass: 3, expected: 'pass_3_or_later_completed' },
  ])(
    'derives last good state $expected',
    async ({ completedPass, expected }) => {
      const supabase = new FakeSupabase({ completedPass });

      await expect(
        deriveLastGoodStateFromPasses({
          claimId,
          supabaseAdmin: supabase as never,
        }),
      ).resolves.toMatchObject({ kind: expected });
    },
  );

  it('recovery refires extraction completion after pass 1', async () => {
    const supabase = new FakeSupabase({ completedPass: 1 });
    const sendEvent = vi.fn(async () => undefined);

    await expect(
      recoverErroredClaim({
        claimId,
        supabaseAdmin: supabase as never,
        sendEvent,
      }),
    ).resolves.toEqual({
      ok: true,
      action: 'sent_event',
      eventName: 'claim/extraction.completed',
      passNumber: 1,
    });
    expect(sendEvent).toHaveBeenCalledWith('recover-extraction-completed', {
      name: 'claim/extraction.completed',
      data: { claimId, passNumber: 1 },
    });
  });

  it('recovery refires validation completion after pass 2', async () => {
    const supabase = new FakeSupabase({ completedPass: 2 });
    const sendEvent = vi.fn(async () => undefined);

    await expect(
      recoverErroredClaim({
        claimId,
        supabaseAdmin: supabase as never,
        sendEvent,
      }),
    ).resolves.toEqual({
      ok: true,
      action: 'sent_event',
      eventName: 'claim/validation.completed',
      passNumber: 2,
    });
    expect(sendEvent).toHaveBeenCalledWith('recover-validation-completed', {
      name: 'claim/validation.completed',
      data: { claimId, passNumber: 2 },
    });
  });

  it('recovery sets ready after pass 3+', async () => {
    const supabase = new FakeSupabase({ completedPass: 3 });

    await expect(
      recoverErroredClaim({
        claimId,
        supabaseAdmin: supabase as never,
      }),
    ).resolves.toEqual({ ok: true, action: 'set_ready', passNumber: 3 });
    expect(supabase.claim.status).toBe('ready');
  });

  it('returns unsupported recovery when no extraction start event exists', async () => {
    const supabase = new FakeSupabase({ completedPass: null });

    await expect(
      recoverErroredClaim({
        claimId,
        supabaseAdmin: supabase as never,
      }),
    ).resolves.toEqual({
      ok: false,
      reason: 'unsupported_no_extraction_start_event',
    });
  });

  it('admin retry endpoint is 403 until admin auth convention exists', async () => {
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('admin_auth_unconfigured');
  });

  it('claim-scoped Inngest failure handler writes through step.run', async () => {
    const supabase = new FakeSupabase({ status: 'processing' });
    const step = {
      run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
    };

    await handleClaimScopedFunctionFailure({
      event: {
        name: 'inngest/function.failed',
        data: {
          function_id: 'process-document',
          run_id: 'run-1',
          error: { name: 'Error', message: 'handler failed' },
          event: {
            name: 'claim/document.uploaded',
            data: { claimId, documentId: 'doc-id' },
          },
        },
      } as never,
      error: new Error('handler failed'),
      step,
      logger: { warn: vi.fn(), error: vi.fn() },
      functionId: 'process-document',
      supabaseAdmin: supabase as never,
    });

    expect(step.run).toHaveBeenCalledWith(
      'mark-process-document-claim-errored',
      expect.any(Function),
    );
    expect(supabase.claim.status).toBe('errored');
    expect(supabase.auditLog).toEqual([
      expect.objectContaining({ action: 'claim_errored' }),
    ]);
  });
});

class FakeSupabase {
  readonly auditLog: Array<Record<string, unknown>> = [];
  readonly claim: { id: string; status: string };

  constructor(
    private readonly options: {
      status?: string;
      completedPass?: number | null;
    } = {},
  ) {
    this.claim = {
      id: claimId,
      status: options.status ?? 'errored',
    };
  }

  from(table: string) {
    return new FakeQuery(this, table);
  }
}

class FakeQuery {
  private updatePayload: Record<string, unknown> | null = null;
  private updateAttempted = false;

  constructor(
    private readonly db: FakeSupabase,
    private readonly table: string,
  ) {}

  select() {
    return this;
  }

  eq() {
    return this;
  }

  order() {
    return this;
  }

  limit() {
    return this;
  }

  not(_column: string, _operator: string, value: string) {
    if (this.table === 'claims' && this.updatePayload) {
      const blocked = value
        .replace(/[()]/g, '')
        .split(',')
        .includes(this.db.claim.status);
      if (blocked) this.updatePayload = null;
    }

    return this;
  }

  update(payload: Record<string, unknown>) {
    this.updateAttempted = true;
    this.updatePayload = payload;
    return this;
  }

  insert(payload: Record<string, unknown>) {
    this.db.auditLog.push(payload);
    return Promise.resolve({ error: null });
  }

  maybeSingle() {
    if (this.table === 'claims' && this.updatePayload) {
      Object.assign(this.db.claim, this.updatePayload);
      return Promise.resolve({ data: { id: this.db.claim.id }, error: null });
    }

    if (this.table === 'claims' && this.updateAttempted) {
      return Promise.resolve({ data: null, error: null });
    }

    if (this.table === 'claims') {
      return Promise.resolve({ data: this.db.claim, error: null });
    }

    if (this.table === 'passes') {
      const passNumber = this.db['options'].completedPass;
      return Promise.resolve({
        data:
          typeof passNumber === 'number' ? { pass_number: passNumber } : null,
        error: null,
      });
    }

    return Promise.resolve({ data: null, error: null });
  }
}
