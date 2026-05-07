import { inngest } from '../client';
import { handleClaimScopedFunctionFailure } from './claim-failure';

import { sendClaimantEmail } from '@/lib/claimant/notifications';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ClaimDispatchQuestionsEvent } from '@/lib/types';

export const CLAIMANT_NOTIFY_CONFIG = {
  id: 'claimant-notify',
  retries: 3,
  concurrency: { limit: 1, key: 'event.data.claim_id' },
} as const;

type StepLike = {
  run: <T>(name: string, fn: () => Promise<T>) => Promise<T>;
};

type SupabaseLike = ReturnType<typeof createAdminClient>;
type SendClaimantEmail = typeof sendClaimantEmail;

export async function runClaimantNotify({
  event,
  step,
  supabaseAdmin = createAdminClient(),
  sendEmail = sendClaimantEmail,
}: {
  event: ClaimDispatchQuestionsEvent;
  step: StepLike;
  supabaseAdmin?: SupabaseLike;
  sendEmail?: SendClaimantEmail;
}) {
  const {
    claim_id,
    dispatch_id,
    claimant_email,
    claimant_first_name,
    claim_number,
    magic_link_url,
    question_count,
  } = event.data;

  if (!claimant_email) {
    return { sent: false, reason: 'no_email_on_file' };
  }

  return step.run('send-claimant-email', async () => {
    try {
      const messageId = await sendEmail({
        to: claimant_email,
        claim_number,
        first_name: claimant_first_name,
        magic_link_url,
        question_count,
        dispatch_id,
      });

      await supabaseAdmin
        .from('question_dispatches')
        .update({
          notification_sent_at: new Date().toISOString(),
          notification_attempts: 1,
          notification_channel: 'email',
          notification_last_error: null,
        })
        .eq('claim_id', claim_id)
        .throwOnError();

      return { sent: true, messageId };
    } catch (error) {
      await supabaseAdmin
        .from('question_dispatches')
        .update({
          notification_attempts: 1,
          notification_channel: 'email',
          notification_last_error: truncateNotificationError(error),
        })
        .eq('claim_id', claim_id)
        .throwOnError();

      throw error;
    }
  });
}

export const claimantNotifyFunction = inngest.createFunction(
  {
    ...CLAIMANT_NOTIFY_CONFIG,
    onFailure: async ({ event, error, step, logger }) =>
      handleClaimScopedFunctionFailure({
        event,
        error,
        step: step as unknown as {
          run: (name: string, fn: () => Promise<unknown>) => Promise<unknown>;
        },
        logger,
        functionId: CLAIMANT_NOTIFY_CONFIG.id,
      }),
  },
  { event: 'claim/dispatch-questions' },
  async ({ event, step }) =>
    runClaimantNotify({
      event: event as ClaimDispatchQuestionsEvent,
      step: step as unknown as StepLike,
    }),
);

function truncateNotificationError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return (message || 'unknown_error')
    .replace(/https?:\/\/\S+/g, '[url]')
    .slice(0, 500);
}
