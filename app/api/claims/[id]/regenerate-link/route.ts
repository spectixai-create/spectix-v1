import { NextResponse } from 'next/server';

import { jsonOk, requireApiUser } from '@/lib/adjuster/api';
import { regenerateClaimantLink } from '@/lib/adjuster/dispatch';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const result = await regenerateClaimantLink({
    claimId: params.id,
    actorId: user.id,
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
    snapshot: result.snapshot,
  });
}
