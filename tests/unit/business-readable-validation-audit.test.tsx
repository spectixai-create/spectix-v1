// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AuditTab } from '@/components/adjuster/audit-tab';
import { ValidationTab } from '@/components/adjuster/validation-tab';
import type { AuditLogView } from '@/lib/adjuster/types';
import { BRIEF_TABS } from '@/lib/ui/strings-he';
import type { AuditActorType, ClaimValidation } from '@/lib/types';

describe('business-readable validation and audit tabs', () => {
  afterEach(() => cleanup());

  it('maps validation layer ids to business labels and actions', () => {
    render(
      <ValidationTab
        validations={[
          validation('11.1', 'skipped', { reason: 'no_name_fields' }),
          validation('11.2', 'completed', {
            rules: [{ status: 'pass', rule_id: 'policy_coverage' }],
          }),
          validation('11.3', 'failed', {}),
        ]}
      />,
    );

    expect(
      screen.getAllByText('בדיקת זהות ושמות במסמכים').length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText('בדיקת תאריכים ותקופת כיסוי').length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('בדיקת סכומים ומטבע').length).toBeGreaterThan(0);
    expect(screen.getAllByText('דולג').length).toBeGreaterThan(0);
    expect(
      screen.getByText('לא נמצאו במסמכים שדות שם שניתן להשוות.'),
    ).toBeTruthy();
    expect(
      screen.getByText('לבדוק ידנית את המסמכים ולהריץ מחדש אם נדרש.'),
    ).toBeTruthy();
  });

  it('does not render ordinary validation raw JSON keys by default', () => {
    const { container } = render(
      <ValidationTab
        validations={[
          validation('11.1', 'skipped', {
            reason: 'no_name_fields',
            outcome: {
              candidates: [],
              exact_matches: 0,
              fuzzy_matches: 0,
              total_name_fields: 0,
            },
          }),
        ]}
      />,
    );

    expect(container.textContent).not.toContain('reason');
    expect(container.textContent).not.toContain('outcome');
    expect(container.textContent).not.toContain('candidates');
    expect(container.textContent).not.toContain('exact_matches');
    expect(container.textContent).not.toContain('fuzzy_matches');
    expect(container.textContent).not.toContain('total_name_fields');
  });

  it('maps audit actions to Hebrew business labels and status details', () => {
    render(
      <AuditTab
        auditLog={[
          audit({
            id: 'a1',
            action: 'claim_created',
            details: { source: 'intake_form' },
          }),
          audit({
            id: 'a2',
            action: 'claim_status_changed',
            details: {
              previous_status: 'ready',
              new_status: 'rejected_no_coverage',
              change_reason: 'claim_rejected',
            },
          }),
          audit({
            id: 'a3',
            action: 'claim_rejection_email_failed',
            details: {
              reason: 'אין כיסוי',
              policy_clause: 'חריג כבודה',
              email_error: 'smtp_error',
            },
          }),
        ]}
      />,
    );

    expect(screen.getByText('תיק נפתח')).toBeTruthy();
    expect(screen.getByText('טופס פתיחת תיק')).toBeTruthy();
    expect(screen.getByText('סטטוס תיק השתנה')).toBeTruthy();
    expect(screen.getByText('מוכן להחלטה')).toBeTruthy();
    expect(screen.getByText('נדחה - ללא כיסוי')).toBeTruthy();
    expect(screen.getByText('שליחת הודעת דחייה נכשלה')).toBeTruthy();
    expect(
      screen.getByText('שליחת הודעת הדחייה נכשלה והסטטוס לא עודכן'),
    ).toBeTruthy();
  });

  it('demotes unknown internal audit event names to technical details only', () => {
    const { container } = render(
      <AuditTab
        auditLog={[
          audit({
            action: 'inngest:run-validation-pass',
            actorType: 'system',
            actorId: 'inngest:claim/pass.completed',
            details: {
              cost_usd: 0.12,
              total_tokens: 500,
              payload: { reason: 'debug' },
            },
          }),
        ]}
      />,
    );

    expect(screen.getByTestId('audit-action-label').textContent).toBe(
      'פעולת מערכת',
    );
    expect(
      screen.getByText('inngest:run-validation-pass').closest('details'),
    ).toBeTruthy();
    expect(container.textContent).not.toContain('claim/pass.completed');
    expect(container.textContent).not.toContain('cost_usd');
    expect(container.textContent).not.toContain('total_tokens');
  });

  it('uses business-facing tab labels', () => {
    expect(BRIEF_TABS.validation).toBe('בדיקות תיק');
    expect(BRIEF_TABS.audit).toBe('היסטוריית פעולות');
  });
});

function validation(
  layerId: ClaimValidation['layerId'],
  status: ClaimValidation['status'],
  payload: Record<string, unknown>,
): ClaimValidation {
  return {
    id: `validation-${layerId}`,
    claimId: 'claim-1',
    passNumber: 3,
    layerId,
    status,
    payload,
    createdAt: '2026-05-11T08:00:00Z',
  };
}

function audit({
  id = 'audit-1',
  action,
  actorType = 'user',
  actorId = 'user-1',
  details = {},
}: {
  id?: string;
  action: string;
  actorType?: AuditActorType;
  actorId?: string | null;
  details?: Record<string, unknown>;
}): AuditLogView {
  return {
    id,
    claimId: 'claim-1',
    actorType,
    actorId,
    action,
    targetTable: 'claims',
    targetId: 'claim-1',
    details,
    createdAt: '2026-05-11T08:00:00Z',
  };
}
