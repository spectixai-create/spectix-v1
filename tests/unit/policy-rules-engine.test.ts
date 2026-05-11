import { describe, expect, it } from 'vitest';

import { getReviewReason } from '@/lib/adjuster/service';
import type { BriefFinding } from '@/lib/adjuster/types';
import {
  evaluatePolicyCoverage,
  resolveDemoPolicy,
  type PreliminaryCoverageStatus,
} from '@/lib/policy';
import {
  generateQuestionsForFindings,
  runSynthesisForValidationRows,
  type ClaimSynthesisContext,
} from '@/lib/synthesis';

describe('POLICY-RULES-001 policy resolver', () => {
  it('returns the synthetic demo policy for known policy numbers', () => {
    expect(resolveDemoPolicy('DEMO-POLICY-TRAVEL-001')?.policy_number).toBe(
      'DEMO-POLICY-TRAVEL-001',
    );
    expect(resolveDemoPolicy('POL-DEMO-001')?.policy_number).toBe(
      'DEMO-POLICY-TRAVEL-001',
    );
  });

  it('returns null for unknown policy numbers', () => {
    expect(resolveDemoPolicy('UNKNOWN-POLICY')).toBeNull();
    expect(resolveDemoPolicy(null)).toBeNull();
  });
});

describe('POLICY-RULES-001 incident and destination checks', () => {
  it('marks missing incident date as missing information', () => {
    const evaluation = evaluatePolicyCoverage({
      claim: demoClaim({ incident_date: null }),
    });

    expect(evaluation.preliminaryCoverageStatus).toBe('missing_information');
    expect(findingTitles(evaluation)).toContain(
      'חסר תאריך אירוע לבדיקת תקופת כיסוי',
    );
  });

  it('marks incidents outside policy coverage as likely not covered', () => {
    const evaluation = evaluatePolicyCoverage({
      claim: demoClaim({ incident_date: '2026-06-10' }),
    });

    expect(evaluation.preliminaryCoverageStatus).toBe('likely_not_covered');
    expect(findingTitles(evaluation)).toContain(
      'תאריך האירוע מחוץ לתקופת הביטוח',
    );
  });

  it('does not add a destination finding when the destination matches', () => {
    const evaluation = evaluatePolicyCoverage({
      claim: demoClaim({ incident_location: 'פריז, צרפת' }),
    });

    expect(findingTitles(evaluation)).not.toContain(
      'יעד האירוע אינו תואם ליעדי הפוליסה',
    );
  });

  it('marks mismatched destination for exclusion review', () => {
    const evaluation = evaluatePolicyCoverage({
      claim: demoClaim({
        incident_location: 'Tokyo, Japan',
        metadata: { country: 'Japan' },
      }),
    });

    expect(evaluation.preliminaryCoverageStatus).toBe('needs_exclusion_review');
    expect(findingTitles(evaluation)).toContain(
      'יעד האירוע אינו תואם ליעדי הפוליסה',
    );
  });
});

describe('POLICY-RULES-001 theft document, exclusion, and item checks', () => {
  it('generates required police report finding and specific question', () => {
    const evaluation = evaluatePolicyCoverage({
      claim: demoClaim({
        metadata: theftMetadata({
          police_report_filed: 'unknown',
          police_report_available: 'no',
        }),
      }),
    });
    const questions = generateQuestionsForFindings(evaluation.findings);

    expect(findingTitles(evaluation)).toContain('חסר מסמך חובה — אישור משטרה');
    expect(questions.map((question) => question.text)).toContain(
      'נא להעלות אישור משטרה מקומית על הגניבה, הכולל שם מלא, תאריך אירוע ומיקום.',
    );
  });

  it('generates exclusion review findings for unattended bag and unlocked vehicle', () => {
    const evaluation = evaluatePolicyCoverage({
      claim: demoClaim({
        metadata: theftMetadata({
          bag_location_at_theft: 'unlocked_vehicle',
          was_bag_supervised: 'no',
        }),
      }),
    });

    expect(findingTitles(evaluation)).toEqual(
      expect.arrayContaining([
        'דורש בדיקת חריג — תיק ללא השגחה',
        'דורש בדיקת חריג — גניבה מרכב לא נעול',
      ]),
    );
    expect(evaluation.preliminaryCoverageStatus).toBe('needs_exclusion_review');
  });

  it('generates a cash exclusion finding without a claimant question', () => {
    const evaluation = evaluatePolicyCoverage({
      claim: demoClaim({
        metadata: theftMetadata({
          stolen_items: [
            item({ name: 'מזומן', category: 'cash', claimed_amount: 400 }),
          ],
        }),
      }),
    });
    const questions = generateQuestionsForFindings(evaluation.findings);

    expect(findingTitles(evaluation)).toContain('מזומן מוחרג בפוליסה');
    expect(questions).toHaveLength(0);
  });

  it('generates valuable proof and per-item limit findings', () => {
    const evaluation = evaluatePolicyCoverage({
      claim: demoClaim({
        metadata: theftMetadata({
          stolen_items: [
            item({
              name: 'מצלמה',
              category: 'electronics',
              claimed_amount: 3000,
              has_receipt: 'no',
              has_proof_of_ownership: 'unknown',
              is_valuable: 'yes',
            }),
          ],
        }),
      }),
    });

    expect(findingTitles(evaluation)).toEqual(
      expect.arrayContaining([
        'חפץ ערך דורש קבלה או הוכחת בעלות לפי הפוליסה',
        'סכום הפריט מעל תקרת הכיסוי לפריט',
      ]),
    );
  });

  it('generates a total baggage limit finding and exposes deductible information', () => {
    const evaluation = evaluatePolicyCoverage({
      claim: demoClaim({
        metadata: theftMetadata({
          stolen_items: [
            item({ name: 'תיק', category: 'bag', claimed_amount: 2600 }),
            item({ name: 'ביגוד', category: 'clothing', claimed_amount: 2700 }),
          ],
        }),
      }),
    });

    expect(findingTitles(evaluation)).toContain(
      'סכום התביעה מעל תקרת כיסוי הכבודה',
    );
    expect(evaluation.deductible).toBe(100);
    expect(evaluation.deductibleLabel).toBe('השתתפות עצמית צפויה: 100 ILS');
  });
});

describe('POLICY-RULES-001 preliminary coverage status', () => {
  it.each([
    [
      'unknown policy',
      demoClaim({ policy_number: 'UNKNOWN-POLICY' }),
      'not_checked',
    ],
    ['clean claim', demoClaim(), 'likely_covered'],
    [
      'missing police report',
      demoClaim({
        metadata: theftMetadata({
          police_report_available: 'no',
        }),
      }),
      'missing_information',
    ],
    [
      'exclusion review before missing info when both are present',
      demoClaim({
        metadata: theftMetadata({
          was_bag_supervised: 'no',
          police_report_available: 'no',
        }),
      }),
      'needs_exclusion_review',
    ],
    [
      'outside coverage overrides all statuses',
      demoClaim({ incident_date: '2026-06-10' }),
      'likely_not_covered',
    ],
  ] satisfies Array<
    [string, ClaimSynthesisContext, PreliminaryCoverageStatus]
  >)('%s -> %s', (_label, claim, expectedStatus) => {
    expect(evaluatePolicyCoverage({ claim }).preliminaryCoverageStatus).toBe(
      expectedStatus,
    );
  });
});

describe('POLICY-RULES-001 synthesis and dashboard integration', () => {
  it('adds policy findings to synthesis output while preserving specific questions', () => {
    const output = runSynthesisForValidationRows(
      [],
      [],
      demoClaim({
        metadata: theftMetadata({
          police_report_available: 'no',
          stolen_items: [
            item({
              name: 'שעון',
              category: 'jewelry',
              claimed_amount: 1800,
              has_receipt: 'no',
              has_proof_of_ownership: 'unknown',
              is_valuable: 'yes',
            }),
          ],
        }),
      }),
    );

    expect(output.findings.map((finding) => finding.title)).toEqual(
      expect.arrayContaining([
        'חסר מסמך חובה — אישור משטרה',
        'חפץ ערך דורש קבלה או הוכחת בעלות לפי הפוליסה',
      ]),
    );
    expect(output.questions.map((question) => question.customer_label)).toEqual(
      expect.arrayContaining(['אישור משטרה', 'הוכחת בעלות לפריט יקר']),
    );
  });

  it('maps policy findings to a business-readable dashboard review reason', () => {
    expect(
      getReviewReason(
        briefFinding('coverage_validation', 'high', 'מזומן מוחרג בפוליסה'),
      ),
    ).toBe('מזומן מוחרג בפוליסה');
    expect(
      getReviewReason(
        briefFinding(
          'coverage_validation',
          'high',
          'סכום הפריט מעל תקרת הכיסוי לפריט',
        ),
      ),
    ).toBe('סכום הפריט מעל תקרת הכיסוי לפריט');
  });
});

function findingTitles(evaluation: ReturnType<typeof evaluatePolicyCoverage>) {
  return evaluation.findings.map((finding) => finding.title);
}

function demoClaim(
  overrides: Partial<ClaimSynthesisContext> = {},
): ClaimSynthesisContext {
  const metadata = overrides.metadata ?? theftMetadata();

  return {
    id: 'claim-policy-test',
    claim_type: 'theft',
    policy_number: 'DEMO-POLICY-TRAVEL-001',
    incident_date: '2026-05-10',
    incident_location: 'פריז, צרפת',
    metadata,
    amount_claimed: 500,
    currency: 'ILS',
    ...overrides,
  };
}

function theftMetadata(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const stolenItems = Array.isArray(overrides.stolen_items)
    ? overrides.stolen_items
    : [item()];

  return {
    country: 'צרפת',
    theft_details: {
      bag_location_at_theft: 'near_customer',
      was_bag_supervised: 'yes',
      was_forced_entry: 'unknown',
      police_report_filed: 'yes',
      police_report_available: 'yes',
      stolen_valuables: 'no',
      stolen_electronics: 'no',
      stolen_cash: 'no',
      compensation_from_other_source: 'unknown',
      theft_description: 'תיאור דמו בטוח.',
      ...overrides,
    },
    stolen_items: stolenItems,
  };
}

function item(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: 'תיק',
    category: 'bag',
    claimed_amount: 500,
    currency: 'ILS',
    purchase_year: 2025,
    has_receipt: 'yes',
    has_proof_of_ownership: 'yes',
    is_valuable: 'no',
    notes: null,
    ...overrides,
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
