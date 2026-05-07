import 'server-only';

import {
  buildAdjusterAudit,
  canRequestInfo,
  normalizeEditedTexts,
  normalizeQuestionIds,
  planQuestionDispatches,
} from '@/lib/adjuster/service';
import { inngest } from '@/inngest/client';
import { fetchClaimDetail } from '@/lib/adjuster/data';
import type { ClaimDetailSnapshot } from '@/lib/adjuster/types';
import {
  getClaimantContactStatus,
  type ClaimantContactStatus,
} from '@/lib/claimant/contact';
import { buildNotificationDispatchId } from '@/lib/claimant/notifications';
import {
  buildClaimantMagicLinkUrl,
  generateClaimantToken,
  getClaimantLinkExpiry,
  hashClaimantToken,
  resolveAppBaseUrl,
} from '@/lib/claimant/tokens';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Claim, ClaimStatus, QuestionDispatch } from '@/lib/types';

export type DispatchQuestionsResult =
  | {
      ok: true;
      magicLinkUrl: string;
      expiresAt: string;
      contactStatus: ClaimantContactStatus;
      dispatchedQuestionCount: number;
      notificationAttempted: boolean;
      snapshot: ClaimDetailSnapshot | null;
    }
  | { ok: false; status: number; code: string; message: string };

export type RegenerateLinkResult =
  | {
      ok: true;
      magicLinkUrl: string;
      expiresAt: string;
      snapshot: ClaimDetailSnapshot | null;
    }
  | { ok: false; status: number; code: string; message: string };

type DispatchClaimRow = {
  id: string;
  status: ClaimStatus;
  claimNumber: string | null;
  claimantEmail: string | null;
  claimantPhone: string | null;
  claimantName: string | null;
};

type DbDispatchClaimRow = {
  id: string;
  status: ClaimStatus;
  claim_number: string | null;
  claimant_email: string | null;
  claimant_phone: string | null;
  claimant_name: string | null;
};

type DbQuestionDispatchRow = {
  question_id: string;
  claim_id: string;
  first_dispatched_at: string;
  last_dispatched_at: string;
  dispatched_by: string;
  last_dispatched_by: string;
  edited_text: string | null;
  notification_sent_at?: string | null;
  notification_attempts?: number | string | null;
  notification_last_error?: string | null;
  notification_channel?: 'email' | 'sms' | 'both' | null;
};

export { normalizeEditedTexts, normalizeQuestionIds };

export async function dispatchClaimQuestions({
  claimId,
  actorId,
  questionIds,
  editedTexts,
  request,
}: {
  claimId: string;
  actorId: string;
  questionIds: string[];
  editedTexts?: Record<string, string>;
  request?: Request;
}): Promise<DispatchQuestionsResult> {
  const supabase = createAdminClient();
  const claim = await fetchDispatchClaim(claimId);

  if (!claim) return dispatchErrorResult(404, 'not_found', 'התיק לא נמצא');
  if (!canRequestInfo(claim.status)) {
    return dispatchErrorResult(
      409,
      'invalid_state',
      'ניתן לשלוח שאלות רק מתיק מוכן או ממתין למידע',
    );
  }

  const now = new Date().toISOString();
  const existing = await fetchExistingDispatches(claimId, questionIds);
  const { insertRows, updateRows } = planQuestionDispatches({
    claimId,
    questionIds,
    existing,
    actorId,
    now,
    editedTexts,
  });

  if (insertRows.length > 0) {
    const { error } = await supabase
      .from('question_dispatches')
      .insert(insertRows);
    if (error) throw error;
  }

  await Promise.all(
    updateRows.map((dispatch) =>
      supabase
        .from('question_dispatches')
        .update({
          last_dispatched_at: dispatch.lastDispatchedAt,
          last_dispatched_by: dispatch.lastDispatchedBy,
          edited_text: dispatch.editedText,
        })
        .eq('claim_id', claimId)
        .eq('question_id', dispatch.questionId)
        .throwOnError(),
    ),
  );

  const expiresAt = getClaimantLinkExpiry();
  await revokeActiveClaimantLinks(claimId);
  const { magicLinkUrl } = await createMagicLink({
    claimId,
    actorId,
    expiresAt,
    request,
  });

  await updateClaimToPendingInfo(claimId);
  const { error: auditError } = await supabase.from('audit_log').insert(
    buildAdjusterAudit({
      claimId,
      actorId,
      action: 'adjuster_request_info',
      targetTable: 'question_dispatches',
      details: {
        question_ids: questionIds,
        questions_count: questionIds.length,
        edited_count: Object.keys(editedTexts ?? {}).length,
        manual_link_generated: true,
        expires_at: expiresAt,
      },
    }),
  );

  if (auditError) throw auditError;

  const contactStatus = getClaimantContactStatus(claim);
  let notificationAttempted = false;

  if (contactStatus.claimant_email) {
    try {
      await inngest.send({
        name: 'claim/dispatch-questions',
        data: {
          claim_id: claimId,
          dispatch_id: buildNotificationDispatchId({
            claimId,
            date: new Date(now),
          }),
          claimant_email: contactStatus.claimant_email,
          claimant_first_name: contactStatus.claimant_first_name,
          claim_number: contactStatus.claim_number,
          magic_link_url: magicLinkUrl,
          question_count: questionIds.length,
        },
      });
      notificationAttempted = true;
    } catch (error) {
      await recordNotificationQueueFailure({
        supabase,
        claimId,
        questionIds,
        error,
      });
    }
  }

  return {
    ok: true,
    magicLinkUrl,
    expiresAt,
    contactStatus,
    dispatchedQuestionCount: questionIds.length,
    notificationAttempted,
    snapshot: await fetchClaimDetail(claimId),
  };
}

export async function regenerateClaimantLink({
  claimId,
  actorId,
  request,
}: {
  claimId: string;
  actorId: string;
  request?: Request;
}): Promise<RegenerateLinkResult> {
  const supabase = createAdminClient();
  const claim = await fetchDispatchClaim(claimId);

  if (!claim) return regenerateErrorResult(404, 'not_found', 'התיק לא נמצא');
  if (!canRequestInfo(claim.status)) {
    return regenerateErrorResult(
      409,
      'invalid_state',
      'ניתן לחדש קישור רק מתיק מוכן או ממתין למידע',
    );
  }

  const now = new Date().toISOString();
  await revokeActiveClaimantLinks(claimId, now);

  const expiresAt = getClaimantLinkExpiry();
  const { magicLinkUrl } = await createMagicLink({
    claimId,
    actorId,
    expiresAt,
    request,
  });

  const { error: auditError } = await supabase.from('audit_log').insert(
    buildAdjusterAudit({
      claimId,
      actorId,
      action: 'adjuster_request_info',
      targetTable: 'claimant_magic_links',
      details: {
        event: 'regenerate_link',
        expires_at: expiresAt,
      },
    }),
  );

  if (auditError) throw auditError;

  return {
    ok: true,
    magicLinkUrl,
    expiresAt,
    snapshot: await fetchClaimDetail(claimId),
  };
}

async function fetchDispatchClaim(
  claimId: string,
): Promise<DispatchClaimRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('claims')
    .select(
      'id, status, claim_number, claimant_email, claimant_phone, claimant_name',
    )
    .eq('id', claimId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as DbDispatchClaimRow;

  return {
    id: row.id,
    status: row.status,
    claimNumber: row.claim_number,
    claimantEmail: row.claimant_email,
    claimantPhone: row.claimant_phone,
    claimantName: row.claimant_name,
  };
}

async function fetchExistingDispatches(
  claimId: string,
  questionIds: string[],
): Promise<QuestionDispatch[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('question_dispatches')
    .select('*')
    .eq('claim_id', claimId)
    .in('question_id', questionIds);

  if (error) throw error;

  return ((data ?? []) as DbQuestionDispatchRow[]).map((row) => ({
    questionId: row.question_id,
    claimId: row.claim_id,
    firstDispatchedAt: row.first_dispatched_at,
    lastDispatchedAt: row.last_dispatched_at,
    dispatchedBy: row.dispatched_by,
    lastDispatchedBy: row.last_dispatched_by,
    editedText: row.edited_text,
    notificationSentAt: row.notification_sent_at ?? null,
    notificationAttempts: Number(row.notification_attempts ?? 0),
    notificationLastError: row.notification_last_error ?? null,
    notificationChannel: row.notification_channel ?? null,
  }));
}

async function createMagicLink({
  claimId,
  actorId,
  expiresAt,
  request,
}: {
  claimId: string;
  actorId: string;
  expiresAt: string;
  request?: Request;
}): Promise<{ token: string; magicLinkUrl: string }> {
  const supabase = createAdminClient();
  const token = generateClaimantToken();
  const tokenHash = hashClaimantToken(token);

  const { error } = await supabase.from('claimant_magic_links').insert({
    token_hash: tokenHash,
    claim_id: claimId,
    expires_at: expiresAt,
    created_by: actorId,
  });

  if (error) throw error;

  return {
    token,
    magicLinkUrl: buildClaimantMagicLinkUrl({
      baseUrl: resolveAppBaseUrl(request),
      claimId,
      token,
    }),
  };
}

async function revokeActiveClaimantLinks(
  claimId: string,
  revokedAt = new Date().toISOString(),
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('claimant_magic_links')
    .update({ revoked_at: revokedAt })
    .eq('claim_id', claimId)
    .is('used_at', null)
    .is('revoked_at', null);

  if (error) throw error;
}

async function updateClaimToPendingInfo(claimId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('claims')
    .update({ status: 'pending_info' })
    .eq('id', claimId)
    .in('status', ['ready', 'pending_info']);

  if (error) throw error;
}

async function recordNotificationQueueFailure({
  supabase,
  claimId,
  questionIds,
  error,
}: {
  supabase: ReturnType<typeof createAdminClient>;
  claimId: string;
  questionIds: string[];
  error: unknown;
}): Promise<void> {
  try {
    await supabase
      .from('question_dispatches')
      .update({
        notification_attempts: 1,
        notification_channel: 'email',
        notification_last_error: sanitizeNotificationError(error),
      })
      .eq('claim_id', claimId)
      .in('question_id', questionIds)
      .throwOnError();
  } catch {
    // Notification queue failures must not break the manual magic-link path.
  }
}

function sanitizeNotificationError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return (message || 'notification_queue_failed')
    .replace(/https?:\/\/\S+/g, '[url]')
    .slice(0, 500);
}

function dispatchErrorResult(
  status: number,
  code: string,
  message: string,
): Extract<DispatchQuestionsResult, { ok: false }> {
  return { ok: false, status, code, message };
}

function regenerateErrorResult(
  status: number,
  code: string,
  message: string,
): Extract<RegenerateLinkResult, { ok: false }> {
  return { ok: false, status, code, message };
}
