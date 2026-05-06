import { NextResponse } from 'next/server';

import { jsonError, jsonOk, requireApiUser } from '@/lib/adjuster/api';
import { fetchClaimDetail } from '@/lib/adjuster/data';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const snapshot = await fetchClaimDetail(params.id);
  if (!snapshot) {
    return jsonError('not_found', 'התיק לא נמצא', 404);
  }

  return jsonOk({ snapshot });
}
