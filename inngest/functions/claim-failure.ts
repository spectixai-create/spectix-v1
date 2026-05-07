import type { FailureEventPayload } from 'inngest';

import { transitionClaimToErrored } from '@/lib/errored';
import { createAdminClient } from '@/lib/supabase/admin';

type SupabaseLike = ReturnType<typeof createAdminClient>;

type FailureStepLike = {
  run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>;
};

type LoggerLike = {
  warn: (message: string, metadata?: Record<string, unknown>) => void;
  error: (message: string, metadata?: Record<string, unknown>) => void;
};

export async function handleClaimScopedFunctionFailure({
  event,
  error,
  step,
  logger,
  functionId,
  supabaseAdmin = createAdminClient(),
}: {
  event: FailureEventPayload;
  error: unknown;
  step: FailureStepLike;
  logger: LoggerLike;
  functionId: string;
  supabaseAdmin?: SupabaseLike;
}) {
  const claimId = getFailedClaimId(event);

  if (!claimId) {
    logger.warn('[failure-handler-skip] missing claimId', { functionId });
    return { skipped: true, reason: 'missing_claim_id' };
  }

  return step.run(`mark-${functionId}-claim-errored`, async () =>
    transitionClaimToErrored({
      claimId,
      error: event.data.error ?? error,
      supabaseAdmin,
    }),
  );
}

export function getFailedClaimId(event: FailureEventPayload): string | null {
  const originalEvent = event.data.event as
    | { data?: { claimId?: unknown; claim_id?: unknown } }
    | undefined;
  const claimId = originalEvent?.data?.claimId ?? originalEvent?.data?.claim_id;

  return typeof claimId === 'string' && claimId.trim() !== '' ? claimId : null;
}
