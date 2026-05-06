import { createAdminClient } from '@/lib/supabase/admin';

import { transitionClaimToCostCapped } from './transition';
import { COST_CAP_USD, CostCapHaltError } from './types';

type SupabaseLike = ReturnType<typeof createAdminClient>;

const HALT_STATUSES = new Set([
  'cost_capped',
  'errored',
  'rejected',
  'rejected_no_coverage',
  'ready',
]);

export async function callClaudeWithCostGuard<T>({
  claimId,
  supabaseAdmin = createAdminClient(),
  thresholdUsd = COST_CAP_USD,
  call,
}: {
  claimId: string;
  supabaseAdmin?: SupabaseLike;
  thresholdUsd?: number;
  call: () => Promise<T>;
}): Promise<T> {
  const { data, error } = await supabaseAdmin
    .from('claims')
    .select('id, status, total_llm_cost_usd')
    .eq('id', claimId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`claim not found for cost guard: ${claimId}`);

  const claim = data as {
    status?: string | null;
    total_llm_cost_usd?: string | number | null;
  };
  const status = claim.status ?? null;
  const totalCostUsd = toNumber(claim.total_llm_cost_usd);

  if (status && HALT_STATUSES.has(status)) {
    throw new CostCapHaltError(`Claim is not eligible for LLM call: ${status}`);
  }

  if (totalCostUsd >= thresholdUsd) {
    await transitionClaimToCostCapped({
      claimId,
      totalCostUsd,
      thresholdUsd,
      supabaseAdmin,
    });
    throw new CostCapHaltError('Claim LLM cost cap reached');
  }

  return call();
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
