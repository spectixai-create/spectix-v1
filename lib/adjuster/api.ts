import { NextResponse } from 'next/server';

import { getUser } from '@/lib/auth/server';
import type { ApiResult } from '@/lib/types';

export async function requireApiUser() {
  const user = await getUser();

  if (!user) {
    return {
      user: null,
      response: jsonError('unauthorized', 'נדרש להתחבר למערכת', 401),
    } as const;
  }

  return { user, response: null } as const;
}

export function jsonError(
  code: string,
  message: string,
  status: number,
): NextResponse<ApiResult<never>> {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message },
    },
    { status },
  );
}

export function jsonOk<T>(data: T, status = 200): NextResponse<ApiResult<T>> {
  return NextResponse.json(
    {
      ok: true,
      data,
    },
    { status },
  );
}
