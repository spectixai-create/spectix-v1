import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: 'admin_auth_unconfigured',
        message:
          'Admin retry is implemented behind recovery helpers, but no repo admin auth pattern exists yet.',
      },
    },
    { status: 403 },
  );
}
