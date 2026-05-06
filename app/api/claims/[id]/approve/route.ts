import { NextResponse } from 'next/server';

import { jsonOk, requireApiUser } from '@/lib/adjuster/api';
import { approveClaim } from '@/lib/adjuster/data';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const result = await approveClaim(params.id, user.id);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: { code: result.code, message: result.message } },
      { status: result.status },
    );
  }

  return jsonOk({ snapshot: result.snapshot });
}
