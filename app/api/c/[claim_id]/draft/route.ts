import { NextResponse } from 'next/server';

import { recordClaimantTokenInvalidAttempt } from '@/lib/claimant/audit';
import { mapClaimantRpcError } from '@/lib/claimant/errors';
import { hashClaimantToken } from '@/lib/claimant/tokens';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ApiResult } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { claim_id: string } },
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('invalid_json', 'גוף הבקשה אינו JSON תקין', 400);
  }

  const token = readString(body, 'token');
  const questionId = readString(body, 'question_id');
  const responseValue =
    typeof body === 'object' && body !== null && 'response_value' in body
      ? (body as { response_value?: unknown }).response_value
      : undefined;

  if (!token || !questionId || !isObjectRecord(responseValue)) {
    return jsonError('invalid_payload', 'חסרים פרטי תשובה', 400);
  }

  if (JSON.stringify(responseValue).length > 8000) {
    return jsonError('payload_too_large', 'התשובה ארוכה מדי', 400);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('save_draft', {
    p_token_hash: hashClaimantToken(token),
    p_claim_id: params.claim_id,
    p_question_id: questionId,
    p_response_value: responseValue,
  });

  if (error) {
    const mapped = mapClaimantRpcError(error);
    await recordClaimantTokenInvalidAttempt({
      claimId: params.claim_id,
      attemptedEndpoint: '/api/c/[claim_id]/draft',
      code: mapped.code,
      supabase,
    });
    return jsonError(mapped.code, mapped.message, mapped.status);
  }

  return jsonOk({ draft: data });
}

function readString(body: unknown, key: string): string | null {
  if (typeof body !== 'object' || body === null || !(key in body)) return null;
  const value = (body as Record<string, unknown>)[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function jsonOk<T>(data: T): NextResponse<ApiResult<T>> {
  return NextResponse.json({ ok: true, data });
}

function jsonError(
  code: string,
  message: string,
  status: number,
): NextResponse<ApiResult<never>> {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}
