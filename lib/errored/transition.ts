import { createAdminClient } from '@/lib/supabase/admin';

type SupabaseLike = ReturnType<typeof createAdminClient>;

export type TransitionClaimToErroredInput = {
  claimId: string;
  error: unknown;
  supabaseAdmin?: SupabaseLike;
  lastPassNumber?: number | null;
};

export type TransitionClaimToErroredResult = {
  transitioned: boolean;
  claimId: string;
  status: 'errored' | 'unchanged';
  lastPassNumber: number | null;
};

const ERRORED_GUARD_STATUSES =
  '(errored,rejected,rejected_no_coverage,ready,cost_capped)';

export async function transitionClaimToErrored({
  claimId,
  error,
  supabaseAdmin = createAdminClient(),
  lastPassNumber,
}: TransitionClaimToErroredInput): Promise<TransitionClaimToErroredResult> {
  const resolvedLastPassNumber =
    typeof lastPassNumber === 'undefined'
      ? await getLastCompletedPassNumber({ claimId, supabaseAdmin })
      : lastPassNumber;
  const safeError = toSafeError(error);

  const { data, error: updateError } = await supabaseAdmin
    .from('claims')
    .update({
      status: 'errored',
      updated_at: new Date().toISOString(),
    })
    .eq('id', claimId)
    .not('status', 'in', ERRORED_GUARD_STATUSES)
    .select('id')
    .maybeSingle();

  if (updateError) throw updateError;

  if (!data) {
    return {
      transitioned: false,
      claimId,
      status: 'unchanged',
      lastPassNumber: resolvedLastPassNumber,
    };
  }

  const { error: auditError } = await supabaseAdmin.from('audit_log').insert({
    claim_id: claimId,
    actor_type: 'system',
    actor_id: 'system:errored-transition',
    action: 'claim_errored',
    target_table: 'claims',
    target_id: claimId,
    details: {
      error_class: safeError.errorClass,
      error_message: safeError.message,
      last_pass_number: resolvedLastPassNumber,
    },
  });

  if (auditError) throw auditError;

  return {
    transitioned: true,
    claimId,
    status: 'errored',
    lastPassNumber: resolvedLastPassNumber,
  };
}

async function getLastCompletedPassNumber({
  claimId,
  supabaseAdmin,
}: {
  claimId: string;
  supabaseAdmin: SupabaseLike;
}): Promise<number | null> {
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
  return typeof passNumber === 'number' ? passNumber : null;
}

function toSafeError(error: unknown): {
  errorClass: string;
  message: string;
} {
  if (error instanceof Error) {
    return {
      errorClass: error.name || 'Error',
      message: truncate(error.message || 'unknown error', 500),
    };
  }

  if (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return {
      errorClass:
        'name' in error && typeof error.name === 'string'
          ? error.name
          : 'Error',
      message: truncate(error.message, 500),
    };
  }

  return {
    errorClass: typeof error,
    message: truncate(String(error), 500),
  };
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}
