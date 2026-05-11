import { NextResponse } from 'next/server';

import { jsonError, jsonOk, requireApiUser } from '@/lib/adjuster/api';
import { escalateClaim } from '@/lib/adjuster/data';
import {
  ADJUSTER_PERMISSION_DENIED_MESSAGE,
  canPerformAdjusterAction,
  resolveAdjusterRole,
} from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const { user, response } = await requireApiUser();
  if (!user) return response;
  if (!canPerformAdjusterAction(resolveAdjusterRole(user), 'escalate')) {
    return jsonError('forbidden', ADJUSTER_PERMISSION_DENIED_MESSAGE, 403);
  }

  const result = await escalateClaim(params.id, user.id);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: { code: result.code, message: result.message } },
      { status: result.status },
    );
  }

  return jsonOk({ snapshot: result.snapshot });
}
