import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/claims/route';
import { generateClaimNumber } from '@/lib/claims/claim-number';
import { createAdminClient } from '@/lib/supabase/admin';

vi.mock('@/lib/claims/claim-number', () => ({
  generateClaimNumber: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

const claimRow = {
  id: '11111111-1111-4111-8111-111111111111',
  claim_number: '2026-001',
  status: 'intake',
  risk_band: null,
  risk_score: null,
  claim_type: 'theft',
  insured_name: 'Synthetic Smoke',
  claimant_name: 'Synthetic Smoke',
  incident_date: '2025-04-15',
  trip_start_date: '2025-04-10',
  trip_end_date: '2025-04-20',
  pre_trip_insurance: 'unknown',
  incident_location: 'Bangkok, Thailand',
  amount_claimed: 5000,
  currency: 'THB',
  currency_code: 'THB',
  summary: 'Synthetic smoke claim summary with enough length.',
  metadata: { tripPurpose: 'tourism' },
  claimant_email: 'smoke@example.com',
  claimant_phone: '0500000000',
  policy_number: 'POL-001',
  current_pass: 0,
  total_llm_cost_usd: 0,
  brief_text: null,
  brief_pass_number: null,
  brief_recommendation: null,
  brief_generated_at: null,
  escalated_to_investigator: false,
  created_at: '2026-05-08T00:00:00.000Z',
  updated_at: '2026-05-08T00:00:00.000Z',
};

describe('POST /api/claims consent audit behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateClaimNumber).mockResolvedValue('2026-001');
  });

  it('does not return success if consent_log insert fails', async () => {
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const deleteClaim = vi.fn(() => ({ eq: deleteEq }));
    const insertClaim = vi.fn(() => ({
      select: () => ({
        single: async () => ({ data: claimRow, error: null }),
      }),
    }));
    const insertConsent = vi
      .fn()
      .mockResolvedValue({ error: { message: 'consent write failed' } });

    vi.mocked(createAdminClient).mockReturnValue({
      from: (table: string) => {
        if (table === 'claims') {
          return { insert: insertClaim, delete: deleteClaim };
        }

        if (table === 'consent_log') {
          return { insert: insertConsent };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    } as unknown as ReturnType<typeof createAdminClient>);

    const response = await POST(claimRequest(validPayload()));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json).toEqual({
      ok: false,
      error: {
        code: 'consent_log_failed',
        message: 'Failed to record consent audit trail',
      },
    });
    expect(deleteClaim).toHaveBeenCalledTimes(1);
    expect(deleteEq).toHaveBeenCalledWith('id', claimRow.id);
    expect(json.data).toBeUndefined();
  });

  it('creates a pending clarification question for unknown pre-trip insurance', async () => {
    const insertConsent = vi.fn().mockResolvedValue({ error: null });
    const insertAudit = vi.fn().mockResolvedValue({ error: null });
    const insertQuestion = vi.fn(() => ({
      select: () => ({
        single: async () => ({
          data: { id: '22222222-2222-4222-8222-222222222222' },
          error: null,
        }),
      }),
    }));

    vi.mocked(createAdminClient).mockReturnValue({
      from: (table: string) => {
        if (table === 'claims') {
          return {
            insert: () => ({
              select: () => ({
                single: async () => ({ data: claimRow, error: null }),
              }),
            }),
          };
        }

        if (table === 'consent_log') {
          return { insert: insertConsent };
        }

        if (table === 'audit_log') {
          return { insert: insertAudit };
        }

        if (table === 'clarification_questions') {
          return { insert: insertQuestion };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    } as unknown as ReturnType<typeof createAdminClient>);

    const response = await POST(claimRequest(validPayload()));
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.ok).toBe(true);
    expect(insertQuestion).toHaveBeenCalledWith(
      expect.objectContaining({
        claim_id: claimRow.id,
        question: 'מתי נרכש ביטוח הנסיעה? לפני יציאתך לחו״ל או אחרי?',
        context: 'pre_trip_insurance_unknown',
        status: 'pending',
      }),
    );
  });
});

function claimRequest(data: Record<string, unknown>) {
  return new Request('https://app.example/api/claims', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

function validPayload() {
  return {
    claimantName: 'Synthetic Smoke',
    insuredName: 'Synthetic Smoke',
    claimantEmail: 'smoke@example.com',
    claimantPhone: '0500000000',
    policyNumber: 'POL-001',
    claimType: 'theft',
    incidentDate: '2025-04-15',
    tripStartDate: '2025-04-10',
    tripEndDate: '2025-04-20',
    preTripInsurance: 'unknown',
    incidentLocation: 'Bangkok, Thailand',
    amountClaimed: 5000,
    currency: 'THB',
    currencyCode: 'THB',
    summary: 'Synthetic smoke claim summary with enough length.',
    tosAccepted: true,
    privacyAccepted: true,
    metadata: { tripPurpose: 'tourism' },
  };
}
