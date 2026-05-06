import { createAdminClient } from '@/lib/supabase/admin';
import type {
  ClaimExtractionCompletedEvent,
  ClaimValidationCompletedEvent,
} from '@/lib/types';

type SupabaseLike = ReturnType<typeof createAdminClient>;

export type LastGoodState =
  | { kind: 'no_completed_pass'; passNumber: null }
  | { kind: 'pass_1_completed'; passNumber: 1 }
  | { kind: 'pass_2_completed'; passNumber: 2 }
  | { kind: 'pass_3_or_later_completed'; passNumber: number };

export type RecoverySendEvent = (
  name: string,
  payload: ClaimExtractionCompletedEvent | ClaimValidationCompletedEvent,
) => Promise<unknown>;

export type RecoverErroredClaimResult =
  | {
      ok: true;
      action: 'sent_event';
      eventName: 'claim/extraction.completed' | 'claim/validation.completed';
      passNumber: number;
    }
  | { ok: true; action: 'set_ready'; passNumber: number }
  | {
      ok: false;
      reason:
        | 'claim_not_found'
        | 'claim_not_errored'
        | 'unsupported_no_extraction_start_event';
      status?: string | null;
    };

export async function deriveLastGoodStateFromPasses({
  claimId,
  supabaseAdmin = createAdminClient(),
}: {
  claimId: string;
  supabaseAdmin?: SupabaseLike;
}): Promise<LastGoodState> {
  const { data, error } = await supabaseAdmin
    .from('passes')
    .select('pass_number')
    .eq('claim_id', claimId)
    .eq('status', 'completed')
    .order('pass_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const passNumber = (data as { pass_number?: unknown } | null)?.pass_number;
  if (typeof passNumber !== 'number') {
    return { kind: 'no_completed_pass', passNumber: null };
  }

  if (passNumber === 1) return { kind: 'pass_1_completed', passNumber: 1 };
  if (passNumber === 2) return { kind: 'pass_2_completed', passNumber: 2 };

  return { kind: 'pass_3_or_later_completed', passNumber };
}

export async function recoverErroredClaim({
  claimId,
  supabaseAdmin = createAdminClient(),
  sendEvent,
}: {
  claimId: string;
  supabaseAdmin?: SupabaseLike;
  sendEvent?: RecoverySendEvent;
}): Promise<RecoverErroredClaimResult> {
  const { data: claim, error: claimError } = await supabaseAdmin
    .from('claims')
    .select('id, status')
    .eq('id', claimId)
    .maybeSingle();

  if (claimError) throw claimError;
  if (!claim) return { ok: false, reason: 'claim_not_found' };

  const status = (claim as { status?: string | null }).status;
  if (status !== 'errored') {
    return { ok: false, reason: 'claim_not_errored', status };
  }

  const state = await deriveLastGoodStateFromPasses({
    claimId,
    supabaseAdmin,
  });

  if (state.kind === 'no_completed_pass') {
    return { ok: false, reason: 'unsupported_no_extraction_start_event' };
  }

  if (state.kind === 'pass_3_or_later_completed') {
    await updateClaimStatus({ supabaseAdmin, claimId, status: 'ready' });
    await writeRecoveredAudit({
      supabaseAdmin,
      claimId,
      recoveryAction: 'set_ready',
      passNumber: state.passNumber,
    });

    return {
      ok: true,
      action: 'set_ready',
      passNumber: state.passNumber,
    };
  }

  await updateClaimStatus({ supabaseAdmin, claimId, status: 'processing' });

  if (state.kind === 'pass_1_completed') {
    const event: ClaimExtractionCompletedEvent = {
      name: 'claim/extraction.completed',
      data: { claimId, passNumber: 1 },
    };
    if (sendEvent) await sendEvent('recover-extraction-completed', event);
    await writeRecoveredAudit({
      supabaseAdmin,
      claimId,
      recoveryAction: event.name,
      passNumber: 1,
    });

    return {
      ok: true,
      action: 'sent_event',
      eventName: event.name,
      passNumber: 1,
    };
  }

  const event: ClaimValidationCompletedEvent = {
    name: 'claim/validation.completed',
    data: { claimId, passNumber: 2 },
  };
  if (sendEvent) await sendEvent('recover-validation-completed', event);
  await writeRecoveredAudit({
    supabaseAdmin,
    claimId,
    recoveryAction: event.name,
    passNumber: 2,
  });

  return {
    ok: true,
    action: 'sent_event',
    eventName: event.name,
    passNumber: 2,
  };
}

async function updateClaimStatus({
  supabaseAdmin,
  claimId,
  status,
}: {
  supabaseAdmin: SupabaseLike;
  claimId: string;
  status: 'processing' | 'ready';
}) {
  const { error } = await supabaseAdmin
    .from('claims')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', claimId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
}

async function writeRecoveredAudit({
  supabaseAdmin,
  claimId,
  recoveryAction,
  passNumber,
}: {
  supabaseAdmin: SupabaseLike;
  claimId: string;
  recoveryAction: string;
  passNumber: number;
}) {
  const { error } = await supabaseAdmin.from('audit_log').insert({
    claim_id: claimId,
    actor_type: 'system',
    actor_id: 'system:errored-recovery',
    action: 'claim_error_recovered',
    target_table: 'claims',
    target_id: claimId,
    details: {
      recovery_action: recoveryAction,
      last_good_pass_number: passNumber,
    },
  });

  if (error) throw error;
}
