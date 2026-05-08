import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET as detailedHealthGet } from '@/app/api/health/detailed/route';
import { GET as publicHealthGet } from '@/app/api/health/route';
import { getUser } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';

vi.mock('@/lib/auth/server', () => ({
  getUser: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

const tableCounts: Record<string, number> = {
  claims: 2,
  documents: 3,
  findings: 0,
  gaps: 0,
  clarification_questions: 1,
  enrichment_cache: 0,
  audit_log: 5,
};

describe('health routes', () => {
  const originalServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    vi.mocked(getUser).mockResolvedValue(null);
    vi.mocked(createAdminClient).mockReturnValue({
      from: (table: string) => ({
        select: async () => ({
          error: null,
          count: tableCounts[table] ?? 0,
        }),
      }),
    } as unknown as ReturnType<typeof createAdminClient>);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role';
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRole;
  });

  it('keeps anonymous public health minimal', async () => {
    const response = await publicHealthGet();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true });
    expect(body.timestamp).toEqual(expect.any(String));
    expect(body).not.toHaveProperty('tables');
    expect(body).not.toHaveProperty('error');
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('rejects anonymous detailed health', async () => {
    const response = await detailedHealthGet(
      new Request('https://app.example/api/health/detailed'),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ ok: false, error: 'unauthorized' });
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('returns table checks for service-role authorization', async () => {
    const response = await detailedHealthGet(
      new Request('https://app.example/api/health/detailed', {
        headers: {
          authorization: 'Bearer test-service-role',
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.timestamp).toEqual(expect.any(String));
    expect(body.tables).toHaveLength(7);
    expect(body.tables[0]).toMatchObject({
      table: 'claims',
      ok: true,
      error: null,
      count: 2,
    });
    expect(createAdminClient).toHaveBeenCalledTimes(1);
  });
});
