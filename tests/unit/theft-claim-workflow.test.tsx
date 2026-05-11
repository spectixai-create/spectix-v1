// @vitest-environment jsdom
import * as React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ClaimsListTable } from '@/components/adjuster/claims-list-table';
import { SectionTheftDetails } from '@/components/intake/section-theft-details';
import {
  createDefaultStolenItem,
  defaultIntakeValues,
  type IntakeFormValues,
} from '@/components/intake/types';
import { Form } from '@/components/ui/form';
import { getReviewReason } from '@/lib/adjuster/service';
import type { BriefFinding, ClaimListResponse } from '@/lib/adjuster/types';
import { buildClaimPayload } from '@/lib/intake/build-payload';
import {
  deriveTheftMetadataFindings,
  generateQuestionsForFindings,
  type Finding,
} from '@/lib/synthesis';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('DEMO-PREP-002 theft intake UI', () => {
  afterEach(() => cleanup());

  it('shows theft details and stolen item sections for theft claims', () => {
    render(<TheftSectionHarness claimType="theft" />);

    expect(screen.getByText('פרטי הגניבה')).toBeTruthy();
    expect(screen.getByText('פריטים שנגנבו')).toBeTruthy();
    expect(screen.getByText('היכן היה התיק בזמן הגניבה?')).toBeTruthy();
    expect(screen.getByText('האם יש בידך אישור משטרה?')).toBeTruthy();
  });

  it('does not show theft-specific fields for non-theft claims', () => {
    render(<TheftSectionHarness claimType="medical" />);

    expect(screen.queryByText('פרטי הגניבה')).toBeNull();
    expect(screen.queryByText('פריטים שנגנבו')).toBeNull();
    expect(screen.queryByText('היכן היה התיק בזמן הגניבה?')).toBeNull();
  });

  it('lets the claimant add and remove stolen item rows', () => {
    render(<TheftSectionHarness claimType="theft" />);

    expect(screen.queryByText('פריט 1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'הוסף פריט' }));
    expect(screen.getByText('פריט 1')).toBeTruthy();
    expect(screen.getByText('שם הפריט')).toBeTruthy();
    expect(screen.getByText('יש קבלה?')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'הסר' }));
    expect(screen.queryByText('פריט 1')).toBeNull();
  });
});

describe('DEMO-PREP-002 theft metadata payload', () => {
  it('stores theft details and stolen items under claim metadata', () => {
    const payload = buildClaimPayload({
      ...baseIntakeValues(),
      claimType: 'theft',
      theftDetails: {
        ...defaultIntakeValues.theftDetails,
        bagLocationAtTheft: 'unlocked_vehicle',
        wasBagSupervised: 'no',
        policeReportFiled: 'unknown',
        policeReportAvailable: 'no',
        theftDescription: 'התיק נשאר ברכב ונגנב.',
      },
      stolenItems: [
        {
          ...createDefaultStolenItem(),
          name: 'מצלמה',
          category: 'electronics',
          claimedAmount: '2500',
          hasReceipt: 'no',
          hasProofOfOwnership: 'unknown',
          isValuable: 'yes',
        },
      ],
    });

    expect(payload.metadata).toMatchObject({
      theft_details: {
        bag_location_at_theft: 'unlocked_vehicle',
        was_bag_supervised: 'no',
        police_report_filed: 'unknown',
        police_report_available: 'no',
        theft_description: 'התיק נשאר ברכב ונגנב.',
      },
      stolen_items: [
        {
          name: 'מצלמה',
          category: 'electronics',
          claimed_amount: 2500,
          currency: 'ILS',
          has_receipt: 'no',
          has_proof_of_ownership: 'unknown',
          is_valuable: 'yes',
        },
      ],
    });
  });

  it('does not store theft metadata for non-theft claim types', () => {
    const payload = buildClaimPayload({
      ...baseIntakeValues(),
      claimType: 'medical',
    });

    expect(payload.metadata).not.toHaveProperty('theft_details');
    expect(payload.metadata).not.toHaveProperty('stolen_items');
  });
});

describe('DEMO-PREP-002 theft finding and question generation', () => {
  it('generates police report, supervision, vehicle, cash, and proof findings', () => {
    const findings = theftFindings();
    const titles = findings.map((finding) => finding.title);

    expect(titles).toEqual(
      expect.arrayContaining([
        'חסר אישור משטרה בגניבה',
        'חסר אישור משטרה',
        'התיק דווח כלא תחת השגחה',
        'גניבה מרכב / תא מטען דורשת בדיקת חריג',
        'מזומן דווח כפריט שנגנב',
        'חפץ ערך ללא הוכחת בעלות',
      ]),
    );
    expect(
      findings.find((finding) => finding.title === 'התיק דווח כלא תחת השגחה'),
    ).toMatchObject({
      category: 'risk_flag',
      severity: 'high',
    });
  });

  it('generates specific claimant questions from theft findings', () => {
    const questions = generateQuestionsForFindings(theftFindings());
    const texts = questions.map((question) => question.text);

    expect(texts).toContain(
      'נא להעלות אישור משטרה מקומית על הגניבה, הכולל שם מלא, תאריך אירוע ומיקום.',
    );
    expect(texts).toContain(
      'נא להבהיר היכן היה התיק בזמן הגניבה והאם היה תחת השגחה.',
    );
    expect(texts).toContain(
      'נא להעלות קבלה או הוכחת בעלות עבור הפריט היקר שנתבע.',
    );
  });
});

describe('DEMO-PREP-002 dashboard review reason', () => {
  afterEach(() => cleanup());

  it('maps highest-priority theft findings to short review reasons', () => {
    const reason = getReviewReason(
      briefFinding(
        'policy_exclusion',
        'high',
        'גניבה מרכב / תא מטען דורשת בדיקת חריג',
      ),
    );

    expect(reason).toBe('דורש בדיקת חריג — גניבה מרכב');
  });

  it('renders the work-queue review reason column', () => {
    render(<ClaimsListTable data={claimList()} />);

    expect(screen.getByText('סיבת בדיקה')).toBeTruthy();
    expect(screen.getByText('חפץ ערך ללא קבלה')).toBeTruthy();
  });
});

function TheftSectionHarness({ claimType }: Readonly<{ claimType: string }>) {
  const form = useForm<IntakeFormValues>({
    defaultValues: {
      ...defaultIntakeValues,
      claimType,
    },
  });

  return (
    <Form {...form}>
      <SectionTheftDetails control={form.control} watch={form.watch} />
    </Form>
  );
}

function baseIntakeValues(): IntakeFormValues {
  return {
    ...defaultIntakeValues,
    fullName: 'Demo Theft User',
    email: 'demo@example.com',
    phone: '0500000000',
    policyNumber: 'POL-1',
    occupation: 'מעצב',
    tripStartDate: '2026-05-01',
    tripEndDate: '2026-05-10',
    preTripInsurance: 'yes',
    claimType: 'theft',
    incidentDate: '2026-05-05',
    country: 'FR',
    city: 'פריז',
    amountClaimed: '3500',
    currencyCode: 'ILS',
    incidentDescription: 'התיק נגנב במהלך נסיעה קצרה בעיר.',
    tripPurpose: 'tourism',
    tosAccepted: true,
  };
}

function theftFindings(): Finding[] {
  return deriveTheftMetadataFindings({
    id: 'claim-1',
    claim_type: 'theft',
    amount_claimed: 3500,
    currency: 'ILS',
    metadata: {
      theft_details: {
        bag_location_at_theft: 'unlocked_vehicle',
        was_bag_supervised: 'no',
        was_forced_entry: 'unknown',
        police_report_filed: 'unknown',
        police_report_available: 'no',
        stolen_valuables: 'yes',
        stolen_electronics: 'yes',
        stolen_cash: 'yes',
        compensation_from_other_source: 'unknown',
        theft_description: 'תיאור בטוח לבדיקה',
      },
      stolen_items: [
        {
          name: 'מצלמה',
          category: 'electronics',
          claimed_amount: 2500,
          currency: 'ILS',
          purchase_year: 2023,
          has_receipt: 'no',
          has_proof_of_ownership: 'unknown',
          is_valuable: 'yes',
          notes: null,
        },
        {
          name: 'מזומן',
          category: 'cash',
          claimed_amount: 500,
          currency: 'ILS',
          purchase_year: null,
          has_receipt: 'unknown',
          has_proof_of_ownership: 'unknown',
          is_valuable: 'unknown',
          notes: null,
        },
      ],
    },
  });
}

function finding(
  category: Finding['category'],
  severity: Finding['severity'],
  title: string,
): Finding {
  return {
    id: title,
    category,
    severity,
    title,
    description: title,
    evidence: [],
  };
}

function briefFinding(
  category: BriefFinding['category'],
  severity: BriefFinding['severity'],
  title: string,
): BriefFinding {
  return {
    id: title,
    category,
    severity,
    title,
    description: title,
    evidence: [],
    sourceLayerId: null,
  };
}

function claimList(): ClaimListResponse {
  return {
    items: [
      {
        id: 'claim-1',
        claimNumber: '2026-100',
        status: 'pending_info',
        claimantName: 'מבוטח בדיקה',
        insuredName: 'מבוטח בדיקה',
        claimType: 'theft',
        incidentLocation: 'פריז',
        amountClaimed: 2500,
        currency: 'ILS',
        readinessScore: 70,
        riskBand: 'orange',
        riskScore: 40,
        topFindingCategory: 'document_requirement',
        topFindingSeverity: 'high',
        reviewReason: 'חפץ ערך ללא קבלה',
        daysOpen: 1,
        escalatedToInvestigator: false,
        createdAt: '2026-05-10T00:00:00Z',
        updatedAt: '2026-05-10T00:00:00Z',
      },
    ],
    page: 1,
    pageSize: 25,
    total: 1,
    summary: {
      totalOpen: 1,
      ready: 0,
      pendingInfo: 1,
      highRisk: 1,
    },
  };
}
