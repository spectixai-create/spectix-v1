import { NextResponse } from 'next/server';

import { inngest } from '@/inngest/client';
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
  if (!token) {
    return jsonError('invalid_payload', 'חסר קישור אימות', 400);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('finalize_question_responses', {
    p_token_hash: hashClaimantToken(token),
    p_claim_id: params.claim_id,
  });

  if (error) {
    const mapped = mapClaimantRpcError(error);
    return jsonError(mapped.code, mapped.message, mapped.status);
  }

  const newDocumentIds = normalizeStringArray(
    (data as { new_document_ids?: unknown } | null)?.new_document_ids,
  );

  await inngest.send({
    name: 'claim/responses.submitted',
    data: {
      claimId: params.claim_id,
      newDocumentIds,
    },
  });

  return jsonOk({ result: data });
}

function readString(body: unknown, key: string): string | null {
  if (typeof body !== 'object' || body === null || !(key in body)) return null;
  const value = (body as Record<string, unknown>)[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
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
