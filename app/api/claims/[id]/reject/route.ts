import { NextResponse } from 'next/server';

import { jsonError, jsonOk, requireApiUser } from '@/lib/adjuster/api';
import { rejectClaim } from '@/lib/adjuster/data';
import { validateRejectionPayload } from '@/lib/adjuster/service';

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

  const rejection = validateRejectionPayload(body);

  if (!rejection) {
    return jsonError(
      'invalid_rejection',
      'נדרשים נימוק דחייה, בסיס פוליסה ונוסח הודעה ללקוח',
      400,
    );
  }

  const result = await rejectClaim(params.id, user.id, rejection);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: { code: result.code, message: result.message } },
      { status: result.status },
    );
  }

  return jsonOk({ snapshot: result.snapshot });
}
