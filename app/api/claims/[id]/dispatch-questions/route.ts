import { NextResponse } from 'next/server';

import { jsonError, jsonOk, requireApiUser } from '@/lib/adjuster/api';
import {
  dispatchClaimQuestions,
  normalizeEditedTexts,
  normalizeQuestionIds,
} from '@/lib/adjuster/dispatch';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('invalid_json', 'גוף הבקשה אינו JSON תקין', 400);
  }

  const questionIds = normalizeQuestionIds(
    typeof body === 'object' && body !== null && 'question_ids' in body
      ? (body as { question_ids?: unknown }).question_ids
      : undefined,
  );

  if (!questionIds) {
    return jsonError('invalid_questions', 'יש לבחור לפחות שאלה אחת', 400);
  }

  const editedTexts = normalizeEditedTexts(
    typeof body === 'object' && body !== null && 'edited_texts' in body
      ? (body as { edited_texts?: unknown }).edited_texts
      : undefined,
  );

  const result = await dispatchClaimQuestions({
    claimId: params.id,
    actorId: user.id,
    questionIds,
    editedTexts,
    request,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: { code: result.code, message: result.message } },
      { status: result.status },
    );
  }

  return jsonOk({
    magic_link_url: result.magicLinkUrl,
    expires_at: result.expiresAt,
    contact_status: result.contactStatus,
    dispatched_question_count: result.dispatchedQuestionCount,
    snapshot: result.snapshot,
  });
}
