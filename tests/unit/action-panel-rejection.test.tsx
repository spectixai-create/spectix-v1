// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ActionPanel } from '@/components/adjuster/action-panel';
import type { ClaimDetailSnapshot } from '@/lib/adjuster/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe('PR95 rejection action safety', () => {
  afterEach(() => cleanup());

  it('opens a required rejection dialog and blocks submit until all fields are filled', () => {
    render(<ActionPanel snapshot={snapshot()} />);

    fireEvent.click(screen.getByRole('button', { name: 'דחייה' }));

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByLabelText('סיבת דחייה')).toBeTruthy();
    expect(screen.getByLabelText('סעיף או חריג רלוונטי בפוליסה')).toBeTruthy();
    expect(screen.getByLabelText('נוסח הודעה ללקוח')).toBeTruthy();

    const submit = screen.getByRole('button', {
      name: 'אישור דחייה ושליחה ללקוח',
    }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('סיבת דחייה'), {
      target: { value: 'אין כיסוי לפי תנאי הפוליסה' },
    });
    expect(submit.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('סעיף או חריג רלוונטי בפוליסה'), {
      target: { value: 'חריג כבודה ללא השגחה' },
    });
    expect(submit.disabled).toBe(false);
  });
});

function snapshot(): ClaimDetailSnapshot {
  return {
    claim: {
      id: 'claim-1',
      claimNumber: '2026-001',
      status: 'ready',
      riskBand: null,
      riskScore: null,
      claimType: 'theft',
      insuredName: 'דנה כהן',
      claimantName: 'דנה כהן',
      incidentDate: '2026-05-01',
      tripStartDate: '2026-04-25',
      tripEndDate: '2026-05-05',
      preTripInsurance: 'yes',
      incidentLocation: 'פריז',
      amountClaimed: 1000,
      currency: 'ILS',
      currencyCode: 'ILS',
      summary: null,
      metadata: null,
      claimantEmail: 'claimant@example.com',
      claimantPhone: null,
      policyNumber: 'POL-1',
      currentPass: 3,
      totalLlmCostUsd: 0,
      briefText: null,
      briefPassNumber: null,
      briefRecommendation: null,
      briefGeneratedAt: null,
      escalatedToInvestigator: false,
      createdAt: '2026-05-10T00:00:00Z',
      updatedAt: '2026-05-10T00:00:00Z',
    },
    passes: [],
    documents: [],
    validations: [],
    findings: [],
    questions: [],
    readinessScore: null,
    synthesisResults: [],
    auditLog: [],
  };
}
