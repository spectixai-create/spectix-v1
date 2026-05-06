import { NonRetriableError } from 'inngest';
import { describe, expect, it, vi } from 'vitest';

import {
  COST_CAP_USD,
  CostCapHaltError,
  callClaudeWithCostGuard,
  transitionClaimToCostCapped,
} from '@/lib/cost-cap';

const claimId = '11111111-1111-4111-8111-111111111111';

describe('soft cost cap guard', () => {
  it('halts with NonRetriableError when cap is reached', async () => {
    const supabase = new FakeSupabase({ totalCostUsd: 2.01 });
    const call = vi.fn(async () => ({ ok: true }));

    await expect(
      callClaudeWithCostGuard({
        claimId,
        supabaseAdmin: supabase as never,
        call,
      }),
    ).rejects.toBeInstanceOf(CostCapHaltError);
    await expect(
      callClaudeWithCostGuard({
        claimId,
        supabaseAdmin: new FakeSupabase({ status: 'cost_capped' }) as never,
        call,
      }),
    ).rejects.toBeInstanceOf(NonRetriableError);
    expect(call).not.toHaveBeenCalled();
    expect(supabase.claim.status).toBe('cost_capped');
    expect(supabase.auditLog).toEqual([
      expect.objectContaining({
        action: 'claim_cost_capped',
        details: expect.objectContaining({
          total_cost_usd: 2.01,
          threshold_usd: COST_CAP_USD,
        }),
      }),
    ]);
  });

  it('allows calls below cap and does not record cost', async () => {
    const supabase = new FakeSupabase({ totalCostUsd: 1.25 });
    const call = vi.fn(async () => ({ costUsd: 0.1 }));

    await expect(
      callClaudeWithCostGuard({
        claimId,
        supabaseAdmin: supabase as never,
        call,
      }),
    ).resolves.toEqual({ costUsd: 0.1 });

    expect(call).toHaveBeenCalledTimes(1);
    expect(supabase.rpcCalls).toEqual([]);
    expect(supabase.auditLog).toEqual([]);
    expect(supabase.claim.total_llm_cost_usd).toBe(1.25);
  });

  it('transitionClaimToCostCapped is guarded and idempotent', async () => {
    const readyClaim = new FakeSupabase({
      status: 'ready',
      totalCostUsd: 3,
    });

    await expect(
      transitionClaimToCostCapped({
        claimId,
        totalCostUsd: 3,
        supabaseAdmin: readyClaim as never,
      }),
    ).resolves.toEqual({
      transitioned: false,
      claimId,
      status: 'unchanged',
    });
    expect(readyClaim.claim.status).toBe('ready');
    expect(readyClaim.auditLog).toEqual([]);
  });
});

class FakeSupabase {
  readonly auditLog: Array<Record<string, unknown>> = [];
  readonly rpcCalls: Array<Record<string, unknown>> = [];
  readonly claim: {
    id: string;
    status: string;
    total_llm_cost_usd: number;
  };

  constructor(options?: { status?: string; totalCostUsd?: number }) {
    this.claim = {
      id: claimId,
      status: options?.status ?? 'processing',
      total_llm_cost_usd: options?.totalCostUsd ?? 0,
    };
  }

  from(table: string) {
    return new FakeQuery(this, table);
  }

  rpc(name: string, payload: Record<string, unknown>) {
    this.rpcCalls.push({ name, payload });
    return Promise.resolve({ data: null, error: null });
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

    return Promise.resolve({ data: null, error: null });
  }
}
