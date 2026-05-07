import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { ClaimantRpcErrorCode } from '@/lib/claimant/errors';
import type { ClaimantPortalState } from '@/lib/claimant/types';
import { createAdminClient } from '@/lib/supabase/admin';

export type ClaimantTokenInvalidState = Extract<
  ClaimantPortalState,
  'invalid' | 'expired' | 'used' | 'revoked'
>;

type ClaimantAuditPayload = {
  claim_id: string;
  action: 'claimant_link_opened' | 'claimant_token_invalid';
  actor_type: 'claimant';
  actor_id: string;
  details: Record<string, unknown>;
};

export function buildClaimantLinkOpenedAudit({
  claimId,
  state,
}: {
  claimId: string;
  state: ClaimantPortalState;
}): ClaimantAuditPayload {
  return {
    claim_id: claimId,
    action: 'claimant_link_opened',
    actor_type: 'claimant',
    actor_id: claimId,
    details: {
      claim_id: claimId,
      valid: state === 'valid',
      state,
    },
  };
}

export function buildClaimantTokenInvalidAudit({
  claimId,
  attemptedEndpoint,
  state,
}: {
  claimId: string;
  attemptedEndpoint: string;
  state: ClaimantTokenInvalidState;
}): ClaimantAuditPayload {
  return {
    claim_id: claimId,
    action: 'claimant_token_invalid',
    actor_type: 'claimant',
    actor_id: claimId,
    details: {
      claim_id: claimId,
      attempted_endpoint: attemptedEndpoint,
      state,
    },
  };
}

export function claimantTokenStateFromErrorCode(
  code: ClaimantRpcErrorCode,
): ClaimantTokenInvalidState | null {
  if (code === 'token_not_found') return 'invalid';
  if (code === 'token_expired') return 'expired';
  if (code === 'token_used') return 'used';
  if (code === 'token_revoked') return 'revoked';
  return null;
}

export async function recordClaimantLinkOpened({
  claimId,
  state,
  supabase = createAdminClient(),
}: {
  claimId: string;
  state: ClaimantPortalState;
  supabase?: SupabaseClient;
}): Promise<void> {
  await insertClaimantAudit(
    supabase,
    buildClaimantLinkOpenedAudit({ claimId, state }),
  );
}

export async function recordClaimantTokenInvalidAttempt({
  claimId,
  attemptedEndpoint,
  code,
  supabase = createAdminClient(),
}: {
  claimId: string;
  attemptedEndpoint: string;
  code: ClaimantRpcErrorCode;
  supabase?: SupabaseClient;
}): Promise<void> {
  const state = claimantTokenStateFromErrorCode(code);
  if (!state) return;

  await insertClaimantAudit(
    supabase,
    buildClaimantTokenInvalidAudit({ claimId, attemptedEndpoint, state }),
  );
}

async function insertClaimantAudit(
  supabase: SupabaseClient,
  payload: ClaimantAuditPayload,
): Promise<void> {
  const { error } = await supabase.from('audit_log').insert(payload);
  if (error) {
    console.error('[claimant-audit-error]', error.message);
  }
}
