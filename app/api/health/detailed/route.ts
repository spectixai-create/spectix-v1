import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { getUser } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXPECTED_TABLES = [
  'claims',
  'documents',
  'findings',
  'gaps',
  'clarification_questions',
  'enrichment_cache',
  'audit_log',
] as const;

export async function GET(request: Request) {
  const authorized = await isAuthorized(request);

  if (!authorized) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401 },
    );
  }

  try {
    const supabase = createAdminClient();
    const checks = await Promise.all(
      EXPECTED_TABLES.map(async (table) => {
        const { error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        return {
          table,
          ok: !error,
          error: error?.message ?? null,
          count: count ?? 0,
        };
      }),
    );
    const allOk = checks.every((check) => check.ok);

    return NextResponse.json(
      {
        ok: allOk,
        tables: checks,
        timestamp: new Date().toISOString(),
      },
      { status: allOk ? 200 : 500 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

async function isAuthorized(request: Request): Promise<boolean> {
  if (hasServiceRoleAuthorization(request)) {
    return true;
  }

  try {
    return Boolean(await getUser());
  } catch {
    return false;
  }
}

function hasServiceRoleAuthorization(request: Request): boolean {
  const expected = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;

  if (!expected || !token) {
    return false;
  }

  return safeEqual(token, expected);
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
