// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { IntakeSummaryPanel } from '@/components/adjuster/intake-summary-panel';
import type { ClaimDetailSnapshot } from '@/lib/adjuster/types';
import {
  deriveClaimConsistencyFindings,
  generateQuestionsForFindings,
  runSynthesisForValidationRows,
  type ClaimDocumentSummary,
  type ClaimSynthesisContext,
} from '@/lib/synthesis';
import type { Claim } from '@/lib/types';

describe('CLAIM-CONSISTENCY-001 deterministic findings', () => {
  it('flags theft claims with medical documents and no theft-supporting documents', () => {
    const findings = deriveClaimConsistencyFindings(
      claim({
        documents: [
          documentSummary({
            file_name: 'medical-summary.pdf',
            document_type: 'medical_report',
            document_subtype: 'discharge_summary',
          }),
        ],
      }),
    );

    expect(findingTitles(findings)).toContain(
      'סוג המסמכים אינו תואם לסוג התביעה',
    );
    expect(findings[0]?.evidence[0]).toMatchObject({
      field_path: 'claims.claim_type',
      expected_value: 'מסמכי גניבה / כבודה / אישור משטרה / רשימת פריטים',
      found_value: expect.stringContaining('medical-summary.pdf'),
    });
  });

  it('flags theft claims whose summary describes a medical accident', () => {
    const findings = deriveClaimConsistencyFindings(
      claim({ summary: 'נפילה במלון בזמן טיול וכאב חזק ברגל' }),
    );

    expect(findingTitles(findings)).toContain(
      'תיאור האירוע אינו תואם לסוג התביעה',
    );
  });

  it('flags theft claims whose theft description describes a medical accident', () => {
    const findings = deriveClaimConsistencyFindings(
      claim({
        summary: 'תיק נגנב בזמן טיול',
        metadata: theftMetadata({
          theft_details: {
            ...baseTheftDetails(),
            theft_description: 'נפילה במלון בזמן טיול',
          },
        }),
      }),
    );
    const finding = findings.find(
      (item) => item.title === 'תיאור האירוע אינו תואם לסוג התביעה',
    );

    expect(finding).toBeTruthy();
    expect(finding?.evidence[0]).toMatchObject({
      field_path: 'claims.metadata.theft_details.theft_description',
      found_value: 'נפילה במלון בזמן טיול',
    });
  });

  it('flags material mismatch between claim amount and stolen item total', () => {
    const findings = deriveClaimConsistencyFindings(
      claim({
        amount_claimed: 2000,
        currency: 'ILS',
        metadata: theftMetadata({
          stolen_items: [stolenItem({ name: 'מצלמה', claimed_amount: 3000 })],
        }),
      }),
    );

    expect(findingTitles(findings)).toContain(
      'סכום התביעה אינו תואם לסכום הפריטים',
    );
  });

  it('does not flag document mismatch when theft-supporting documents are present', () => {
    const findings = deriveClaimConsistencyFindings(
      claim({
        documents: [
          documentSummary({
            file_name: 'police-report.pdf',
            document_type: 'police_report',
            document_subtype: 'police_report',
          }),
          documentSummary({
            id: 'doc-2',
            file_name: 'receipt.pdf',
            document_type: 'receipt',
            document_subtype: 'general_receipt',
          }),
        ],
      }),
    );

    expect(findingTitles(findings)).not.toContain(
      'סוג המסמכים אינו תואם לסוג התביעה',
    );
  });

  it('feeds consistency findings into synthesis output', () => {
    const output = runSynthesisForValidationRows(
      [],
      [],
      claim({
        summary: 'נפילה במלון בזמן טיול',
        documents: [
          documentSummary({
            document_type: 'medical_report',
            document_subtype: 'medical_visit',
          }),
        ],
      }),
    );

    expect(output.findings.map((finding) => finding.title)).toEqual(
      expect.arrayContaining([
        'סוג המסמכים אינו תואם לסוג התביעה',
        'תיאור האירוע אינו תואם לסוג התביעה',
      ]),
    );
  });
});

describe('CLAIM-CONSISTENCY-001 question generation', () => {
  it.each([
    [
      'סוג המסמכים אינו תואם לסוג התביעה',
      'התאמת מסמכים לסוג תביעה',
      'upload_document_or_answer',
    ],
    ['תיאור האירוע אינו תואם לסוג התביעה', 'אימות סוג תביעה', 'answer'],
    ['סכום התביעה אינו תואם לסכום הפריטים', 'אימות סכום תביעה', 'answer'],
  ] as const)('%s -> %s', (title, label, action) => {
    const questions = generateQuestionsForFindings([
      {
        id: `finding-${title}`,
        category: 'inconsistency',
        severity: 'high',
        title,
        description: title,
        evidence: [],
      },
    ]);

    expect(questions[0]).toMatchObject({
      customer_label: label,
      required_action: action,
    });
  });
});

describe('CLAIM-CONSISTENCY-001 intake summary panel', () => {
  afterEach(() => cleanup());

  it('renders intake details, theft metadata, stolen items, totals, and mismatch note', () => {
    const { container } = render(
      <IntakeSummaryPanel snapshot={claimDetailSnapshot()} />,
    );

    expect(screen.getByText('פרטי התביעה שנמסרו בטופס')).toBeTruthy();
    expect(screen.getByText('גניבה')).toBeTruthy();
    expect(screen.getByText('נפילה במלון בזמן טיול')).toBeTruthy();
    expect(screen.getByText('POL-001')).toBeTruthy();
    expect(screen.getByText('רומא, איטליה')).toBeTruthy();
    expect(screen.getByText('פרטי הגניבה')).toBeTruthy();
    expect(screen.getByText('ברכב לא נעול')).toBeTruthy();
    expect(screen.getByText('פריטים שנגנבו')).toBeTruthy();
    expect(screen.getByText('מצלמה')).toBeTruthy();
    expect(screen.getAllByText('אלקטרוניקה').length).toBeGreaterThan(0);
    expect(container.textContent).toContain('סך הכל פריטים: 3,000 ILS');
    expect(screen.getByText(/קיים פער בין סכום התביעה/)).toBeTruthy();
    expect(container.textContent).not.toContain('theft_details');
    expect(container.textContent).not.toContain('stolen_items');
    expect(container.textContent).not.toContain('{');
  });
});

function findingTitles(
  findings: ReturnType<typeof deriveClaimConsistencyFindings>,
) {
  return findings.map((finding) => finding.title);
}

function claim(
  overrides: Partial<ClaimSynthesisContext> = {},
): ClaimSynthesisContext {
  return {
    id: 'claim-consistency-test',
    claim_type: 'theft',
    policy_number: 'POL-001',
    incident_date: '2026-05-10',
    incident_location: 'רומא, איטליה',
    summary: 'תיק נגנב בזמן טיול',
    metadata: theftMetadata(),
    amount_claimed: 3000,
    currency: 'ILS',
    documents: [],
    ...overrides,
  };
}

function documentSummary(
  overrides: Partial<ClaimDocumentSummary> = {},
): ClaimDocumentSummary {
  return {
    id: 'doc-1',
    file_name: 'document.pdf',
    document_type: 'other',
    document_subtype: 'incident_affidavit',
    ...overrides,
  };
}

function theftMetadata(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const stolenItems = Array.isArray(overrides.stolen_items)
    ? overrides.stolen_items
    : [stolenItem()];

  return {
    country: 'איטליה',
    theft_details: baseTheftDetails(),
    stolen_items: stolenItems,
    ...overrides,
  };
}

function baseTheftDetails() {
  return {
    bag_location_at_theft: 'unlocked_vehicle',
    was_bag_supervised: 'no',
    was_forced_entry: 'no',
    police_report_filed: 'no',
    police_report_available: 'no',
    stolen_valuables: 'yes',
    stolen_electronics: 'yes',
    stolen_cash: 'no',
    compensation_from_other_source: 'no',
    theft_description: 'התיק נגנב מרכב לא נעול.',
  };
}

function stolenItem(overrides: Record<string, unknown> = {}) {
  return {
    name: 'מצלמה',
    category: 'electronics',
    claimed_amount: 3000,
    currency: 'ILS',
    purchase_year: 2025,
    has_receipt: 'no',
    has_proof_of_ownership: 'no',
    is_valuable: 'yes',
    notes: null,
    ...overrides,
  };
}

function claimDetailSnapshot(): ClaimDetailSnapshot {
  const baseClaim: Claim = {
    id: 'claim-1',
    claimNumber: '2026-001',
    status: 'pending_info',
    riskBand: null,
    riskScore: null,
    claimType: 'theft',
    insuredName: 'Synthetic Test',
    claimantName: 'Synthetic Test',
    incidentDate: '2026-05-10',
    tripStartDate: '2026-05-01',
    tripEndDate: '2026-05-15',
    preTripInsurance: 'yes',
    incidentLocation: 'רומא, איטליה',
    amountClaimed: 2000,
    currency: 'ILS',
    currencyCode: 'ILS',
    summary: 'נפילה במלון בזמן טיול',
    metadata: theftMetadata(),
    claimantEmail: null,
    claimantPhone: null,
    policyNumber: 'POL-001',
    currentPass: 3,
    totalLlmCostUsd: 0,
    briefText: null,
    briefPassNumber: null,
    briefRecommendation: null,
    briefGeneratedAt: null,
    escalatedToInvestigator: false,
    createdAt: '2026-05-10T00:00:00Z',
    updatedAt: '2026-05-10T00:00:00Z',
  };

  return {
    claim: baseClaim,
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
