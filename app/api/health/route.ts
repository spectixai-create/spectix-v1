/**
 * Temporary health check route — used to verify the Spike #00 deployment.
 * MUST be removed (or gated behind a key) before Spike #01 lands.
 *
 * Returns 200 with { ok: true, tables: [...] } when Supabase admin client can
 * read the public schema. Returns 500 with { ok: false, error } otherwise.
 */
import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Probe each expected table by selecting count(*). Service role bypasses RLS.
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

    const allOk = checks.every((c) => c.ok);

    return NextResponse.json(
      {
        ok: allOk,
        tables: checks,
        timestamp: new Date().toISOString(),
      },
      { status: allOk ? 200 : 500 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
