import { createAdminClient } from '@/lib/supabase/admin';

import { COST_CAP_USD } from './types';

type SupabaseLike = ReturnType<typeof createAdminClient>;

export type TransitionClaimToCostCappedInput = {
  claimId: string;
  totalCostUsd: number;
  thresholdUsd?: number;
  supabaseAdmin?: SupabaseLike;
};

export type TransitionClaimToCostCappedResult = {
  transitioned: boolean;
  claimId: string;
  status: 'cost_capped' | 'unchanged';
};

const COST_CAP_GUARD_STATUSES =
  '(cost_capped,rejected,rejected_no_coverage,ready)';

export async function transitionClaimToCostCapped({
  claimId,
  totalCostUsd,
  thresholdUsd = COST_CAP_USD,
  supabaseAdmin = createAdminClient(),
}: TransitionClaimToCostCappedInput): Promise<TransitionClaimToCostCappedResult> {
  const { data, error: updateError } = await supabaseAdmin
    .from('claims')
    .update({
      status: 'cost_capped',
      updated_at: new Date().toISOString(),
    })
    .eq('id', claimId)
    .not('status', 'in', COST_CAP_GUARD_STATUSES)
    .select('id')
    .maybeSingle();

  if (updateError) throw updateError;

  if (!data) {
    return { transitioned: false, claimId, status: 'unchanged' };
  }

  const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
    claim_id: claimId,
    actor_type: 'system',
    actor_id: 'system:cost-cap',
    action: 'claim_cost_capped',
    target_table: 'claims',
    target_id: claimId,
    details: {
      total_cost_usd: totalCostUsd,
      threshold_usd: thresholdUsd,
    },
  });

  if (auditError) throw auditError;

  return { transitioned: true, claimId, status: 'cost_capped' };
}
