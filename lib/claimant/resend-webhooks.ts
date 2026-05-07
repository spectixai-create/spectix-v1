import type { WebhookEventPayload } from 'resend';

import {
  CLAIMANT_EMAIL_TAG_CLAIM_ID,
  CLAIMANT_EMAIL_TAG_DISPATCH_ID,
  extractClaimIdFromNotificationDispatchId,
} from '@/lib/claimant/notifications';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ResendEmailReceivedEvent } from '@/lib/types';

type SupabaseLike = ReturnType<typeof createAdminClient>;

type ResendHandledEvent =
  | 'email.sent'
  | 'email.delivered'
  | 'email.bounced'
  | 'email.complained';

export async function handleResendWebhookEvent({
  event,
  supabaseAdmin,
  sendEvent,
}: {
  event: WebhookEventPayload;
  supabaseAdmin: SupabaseLike;
  sendEvent: (event: ResendEmailReceivedEvent) => Promise<unknown>;
}): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  if (!isHandledResendEvent(event.type)) {
    return { ok: true };
  }

  const correlation = getResendWebhookCorrelation(event);
  if (!correlation.dispatchId) {
    return { ok: false, status: 400, message: 'Missing dispatch_id tag' };
  }
  if (!correlation.claimId) {
    return { ok: false, status: 400, message: 'Missing claim_id correlation' };
  }

  if (event.type === 'email.delivered') {
    await updateQuestionDispatches(supabaseAdmin, correlation.claimId, {
      notification_last_error: null,
    });
  } else if (event.type === 'email.bounced') {
    await updateQuestionDispatches(supabaseAdmin, correlation.claimId, {
      notification_last_error: truncateNotificationError(
        `email.bounced: ${event.data.bounce?.subType ?? 'unknown'}`,
      ),
    });
  } else if (event.type === 'email.complained') {
    await updateQuestionDispatches(supabaseAdmin, correlation.claimId, {
      notification_last_error: 'email.complained',
    });
  }

  await sendEvent({
    name: 'resend/email.received',
    data: {
      claim_id: correlation.claimId,
      dispatch_id: correlation.dispatchId,
      status: event.type,
    },
  });

  return { ok: true };
}

export function getResendWebhookCorrelation(event: WebhookEventPayload): {
  claimId: string | null;
  dispatchId: string | null;
} {
  const tags = getResendTags(event);
  const dispatchId = tags[CLAIMANT_EMAIL_TAG_DISPATCH_ID] ?? null;
  const claimId =
    tags[CLAIMANT_EMAIL_TAG_CLAIM_ID] ??
    (dispatchId ? extractClaimIdFromNotificationDispatchId(dispatchId) : null);

  return { claimId, dispatchId };
}

function getResendTags(event: WebhookEventPayload): Record<string, string> {
  const data = (event as { data?: { tags?: unknown } }).data;
  if (!data?.tags) {
    return {};
  }

  if (Array.isArray(data.tags)) {
    return Object.fromEntries(
      data.tags.flatMap((tag) => {
        const candidate = tag as { name?: unknown; value?: unknown };
        return typeof candidate.name === 'string' &&
          typeof candidate.value === 'string'
          ? [[candidate.name, candidate.value]]
          : [];
      }),
    );
  }

  if (typeof data.tags === 'object') {
    return Object.fromEntries(
      Object.entries(data.tags).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  }

  return {};
}

function isHandledResendEvent(type: string): type is ResendHandledEvent {
  return (
    type === 'email.sent' ||
    type === 'email.delivered' ||
    type === 'email.bounced' ||
    type === 'email.complained'
  );
}

function updateQuestionDispatches(
  supabaseAdmin: SupabaseLike,
  claimId: string,
  patch: {
    notification_last_error: string | null;
  },
) {
  return supabaseAdmin
    .from('question_dispatches')
    .update(patch)
    .eq('claim_id', claimId)
    .throwOnError();
}

function truncateNotificationError(value: string): string {
  return value.slice(0, 500);
}
