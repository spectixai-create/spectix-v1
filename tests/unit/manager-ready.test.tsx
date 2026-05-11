// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ActionPanel } from '@/components/adjuster/action-panel';
import { ClaimsListTable } from '@/components/adjuster/claims-list-table';
import { ManagerOverviewDashboard } from '@/components/adjuster/manager-overview-dashboard';
import { PassTimeline } from '@/components/adjuster/pass-timeline';
import { composeClaimListResponse } from '@/lib/adjuster/service';
import type {
  ClaimDetailSnapshot,
  ClaimListResponse,
} from '@/lib/adjuster/types';
import {
  canPerformAdjusterAction,
  resolveAdjusterRole,
  type AdjusterRole,
} from '@/lib/auth/roles';
import { getSlaLabel, getSlaStatus, isStuckClaim } from '@/lib/manager/sla';
import type { Claim, Pass, SynthesisResult } from '@/lib/types';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('MANAGER-READY-001 SLA helpers', () => {
  it('maps open days to SLA labels', () => {
    expect(getSlaStatus(0, 'ready')).toBe('within_sla');
    expect(getSlaLabel(getSlaStatus(2, 'ready'))).toBe('תקין');
    expect(getSlaLabel(getSlaStatus(3, 'ready'))).toBe('מתקרב לחריגה');
    expect(getSlaLabel(getSlaStatus(4, 'ready'))).toBe('בחריגת SLA');
  });

  it('marks reviewed and rejected claims as resolved for SLA', () => {
    expect(getSlaStatus(10, 'reviewed')).toBe('resolved');
    expect(getSlaStatus(10, 'rejected_no_coverage')).toBe('resolved');
    expect(getSlaLabel(getSlaStatus(10, 'reviewed'))).toBe('טופל');
  });

  it('identifies stuck claims by open age or stale update', () => {
    const now = new Date('2026-05-11T00:00:00Z');

    expect(isStuckClaim({ daysOpen: 4, status: 'ready' }, now)).toBe(true);
    expect(
      isStuckClaim(
        {
          daysOpen: 1,
          status: 'processing',
          updatedAt: '2026-05-07T00:00:00Z',
        },
        now,
      ),
    ).toBe(true);
    expect(isStuckClaim({ daysOpen: 6, status: 'reviewed' }, now)).toBe(false);
  });
});

describe('MANAGER-READY-001 overview DTO and UI', () => {
  afterEach(() => cleanup());

  it('computes manager overview KPIs from existing claim list data', () => {
    const response = managerClaims();

    expect(response.summary).toMatchObject({
      totalOpen: 3,
      ready: 1,
      pendingInfo: 1,
      enhancedReview: 2,
      investigation: 0,
      slaBreached: 1,
      openClaimAmount: 8000,
      enhancedReviewAmount: 6000,
      claimsWithGaps: 1,
      claimsWithInconsistencies: 1,
    });
    expect(response.items.find((item) => item.id === 'c1')).toMatchObject({
      slaLabel: 'בחריגת SLA',
      handlingStatusLabel: 'מוכן להחלטה',
      isStuck: true,
    });
  });

  it('renders management KPI cards, sections, and quick links', () => {
    render(<ManagerOverviewDashboard data={managerClaims()} />);

    expect(screen.getByText('תיקים פתוחים')).toBeTruthy();
    expect(screen.getAllByText('בחריגת SLA').length).toBeGreaterThan(0);
    expect(screen.getByText('זמן טיפול ממוצע')).toBeTruthy();
    expect(screen.getByText('תיקים תקועים')).toBeTruthy();
    expect(screen.getByText('תיקים בבדיקה מוגברת')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'פתיחת תור עבודה' }),
    ).toHaveProperty('href', expect.stringContaining('/dashboard'));
    expect(
      screen.getByRole('link', { name: 'פתיחת תור שאלות' }),
    ).toHaveProperty('href', expect.stringContaining('/questions'));
    expect(
      screen.getByRole('link', { name: 'פתיחת טופס קליטה' }),
    ).toHaveProperty('href', expect.stringContaining('/new'));
  });
});

describe('MANAGER-READY-001 dashboard indicators', () => {
  afterEach(() => cleanup());

  it('shows SLA and handling-state columns while preserving review reason', () => {
    render(<ClaimsListTable data={managerClaims()} />);

    expect(screen.getByText('SLA')).toBeTruthy();
    expect(screen.getByText('מצב טיפול')).toBeTruthy();
    expect(screen.getByText('סיבת בדיקה')).toBeTruthy();
    expect(screen.getAllByText('בחריגת SLA').length).toBeGreaterThan(0);
    expect(screen.getAllByText('מוכן להחלטה').length).toBeGreaterThan(0);
    expect(screen.getAllByText('חסר מסמך').length).toBeGreaterThan(0);
  });
});

describe('MANAGER-READY-001 roles', () => {
  afterEach(() => cleanup());

  it('resolves supported roles from auth metadata and defaults safely', () => {
    expect(
      resolveAdjusterRole({ app_metadata: { adjuster_role: 'manager' } }),
    ).toBe('manager');
    expect(resolveAdjusterRole({ user_metadata: { role: 'rep' } })).toBe('rep');
    expect(resolveAdjusterRole({ app_metadata: { role: 'unknown' } })).toBe(
      'claims_specialist',
    );
  });

  it('enforces the demo permission matrix', () => {
    const roles: AdjusterRole[] = [
      'rep',
      'claims_specialist',
      'manager',
      'investigator',
      'admin',
    ];

    expect(
      roles.every((role) => canPerformAdjusterAction(role, 'view_claim')),
    ).toBe(true);
    expect(canPerformAdjusterAction('rep', 'request_info')).toBe(true);
    expect(canPerformAdjusterAction('rep', 'approve')).toBe(false);
    expect(canPerformAdjusterAction('rep', 'reject')).toBe(false);
    expect(canPerformAdjusterAction('rep', 'escalate')).toBe(false);
    expect(canPerformAdjusterAction('claims_specialist', 'approve')).toBe(true);
    expect(canPerformAdjusterAction('claims_specialist', 'reject')).toBe(true);
    expect(canPerformAdjusterAction('claims_specialist', 'escalate')).toBe(
      true,
    );
    expect(canPerformAdjusterAction('manager', 'override')).toBe(true);
    expect(canPerformAdjusterAction('investigator', 'request_info')).toBe(
      false,
    );
    expect(canPerformAdjusterAction('investigator', 'approve')).toBe(false);
    expect(canPerformAdjusterAction('admin', 'user_admin')).toBe(true);
  });

  it('disables restricted action buttons and shows the permission explanation', () => {
    render(<ActionPanel snapshot={snapshot()} role="rep" />);

    expect(button('אישור').disabled).toBe(true);
    expect(button('דחייה').disabled).toBe(true);
    expect(button('העברה לחוקר').disabled).toBe(true);
    expect(screen.getByText('אין הרשאה לביצוע פעולה זו')).toBeTruthy();
  });

  it('keeps specialist staging usability for claim actions', () => {
    render(<ActionPanel snapshot={snapshot()} role="claims_specialist" />);

    expect(button('אישור').disabled).toBe(false);
    expect(button('דחייה').disabled).toBe(false);
    expect(button('העברה לחוקר').disabled).toBe(false);
    expect(screen.queryByText('אין הרשאה לביצוע פעולה זו')).toBeNull();
  });
});

describe('MANAGER-READY-001 debug separation', () => {
  afterEach(() => cleanup());

  it('moves processing cost and LLM call counts under technical details', () => {
    render(<PassTimeline passes={[pass()]} />);

    expect(screen.queryByText('cost_usd')).toBeNull();
    expect(screen.queryByText('total_tokens')).toBeNull();
    const technical = screen.getByText('פרטים טכניים').closest('details');
    expect(technical).toBeTruthy();
    expect(technical?.textContent).toContain('עלות פנימית');
    expect(technical?.textContent).toContain('קריאות LLM');
  });
});

function managerClaims(): ClaimListResponse {
  return composeClaimListResponse({
    claims: [
      claim({
        id: 'c1',
        claimNumber: '2026-101',
        status: 'ready',
        amountClaimed: 1000,
        riskBand: 'orange',
        createdAt: '2026-05-07T00:00:00Z',
        updatedAt: '2026-05-07T00:00:00Z',
      }),
      claim({
        id: 'c2',
        claimNumber: '2026-102',
        status: 'pending_info',
        amountClaimed: 2000,
        createdAt: '2026-05-10T00:00:00Z',
        updatedAt: '2026-05-10T00:00:00Z',
      }),
      claim({
        id: 'c3',
        claimNumber: '2026-103',
        status: 'processing',
        amountClaimed: 5000,
        riskBand: 'red',
        createdAt: '2026-05-08T00:00:00Z',
        updatedAt: '2026-05-08T00:00:00Z',
      }),
      claim({
        id: 'c4',
        claimNumber: '2026-104',
        status: 'reviewed',
        amountClaimed: 7000,
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-06T00:00:00Z',
      }),
    ],
    synthesisResults: [
      finding('c1', 'document_requirement', 'high', 'חסר מסמך'),
      finding('c3', 'inconsistency', 'medium', 'אי-התאמה במסמך'),
    ],
    query: { status: 'all', sort: 'newest', page: 1, pageSize: 25 },
    now: new Date('2026-05-11T00:00:00Z'),
  });
}

function claim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 'c1',
    claimNumber: '2026-101',
    status: 'ready',
    riskBand: null,
    riskScore: null,
    claimType: 'theft',
    insuredName: 'מבוטח בדיקה',
    claimantName: 'מבוטח בדיקה',
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
    policyNumber: 'DEMO-POLICY-TRAVEL-001',
    currentPass: 3,
    totalLlmCostUsd: 0,
    briefText: null,
    briefPassNumber: null,
    briefRecommendation: null,
    briefGeneratedAt: null,
    escalatedToInvestigator: false,
    createdAt: '2026-05-10T00:00:00Z',
    updatedAt: '2026-05-10T00:00:00Z',
    ...overrides,
  };
}

function finding(
  claimId: string,
  category: string,
  severity: 'low' | 'medium' | 'high',
  title: string,
): SynthesisResult {
  return {
    id: `${claimId}-${category}`,
    claimId,
    passNumber: 3,
    kind: 'finding',
    payload: {
      id: `${claimId}-${category}`,
      category,
      severity,
      title,
      description: title,
      evidence: [{ field_path: 'metadata.test' }],
    },
    createdAt: '2026-05-11T00:00:00Z',
  };
}

function snapshot(): ClaimDetailSnapshot {
  return {
    claim: claim({ id: 'claim-1', claimNumber: '2026-201' }),
    passes: [],
    documents: [],
    validations: [],
    findings: [],
    questions: [
      {
        id: 'q1',
        text: 'נא להשלים מסמך',
        relatedFindingId: null,
        expectedAnswerType: 'text',
        requiredAction: 'upload_document',
        customerLabel: 'מסמך',
        context: null,
        dispatch: null,
      },
    ],
    readinessScore: null,
    synthesisResults: [],
    auditLog: [],
  };
}

function pass(): Pass {
  return {
    id: 'pass-1',
    claimId: 'claim-1',
    passNumber: 1,
    status: 'completed',
    startedAt: '2026-05-11T08:00:00Z',
    completedAt: '2026-05-11T08:05:00Z',
    riskBand: null,
    findingsCount: 0,
    gapsCount: 0,
    llmCallsMade: 3,
    costUsd: 0.12,
    createdAt: '2026-05-11T08:00:00Z',
  };
}

function button(name: string): HTMLButtonElement {
  return screen.getByRole('button', { name }) as HTMLButtonElement;
}
