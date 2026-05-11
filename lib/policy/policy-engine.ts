import { generateFindingId } from '@/lib/synthesis/id-generation';
import type {
  ClaimSynthesisContext,
  Finding,
  FindingCategory,
  FindingEvidence,
  FindingSeverity,
} from '@/lib/synthesis/types';
import { readTheftMetadata, type StolenItem } from '@/lib/theft/metadata';

import { resolveDemoPolicy, type TravelPolicy } from './demo-policy';

export type PreliminaryCoverageStatus =
  | 'likely_covered'
  | 'needs_exclusion_review'
  | 'missing_information'
  | 'likely_not_covered'
  | 'not_checked';

type StatusImpact = Exclude<
  PreliminaryCoverageStatus,
  'not_checked' | 'likely_covered'
>;

type PolicyFindingInput = {
  title: string;
  severity: FindingSeverity;
  category: FindingCategory;
  evidence: FindingEvidence;
  impact: StatusImpact;
};

export type PolicyEvaluation = {
  policy: TravelPolicy | null;
  findings: Finding[];
  preliminaryCoverageStatus: PreliminaryCoverageStatus;
  deductible: number | null;
  deductibleLabel: string | null;
};

const ILS_EXCHANGE_RATE: Record<string, number> = {
  ILS: 1,
  USD: 3.7,
  EUR: 4,
  GBP: 4.7,
  OTHER: 1,
};

export function evaluatePolicyCoverage({
  claim,
  policy = resolveDemoPolicy(claim.policy_number),
}: {
  claim: ClaimSynthesisContext;
  policy?: TravelPolicy | null;
}): PolicyEvaluation {
  if (!policy) {
    return {
      policy: null,
      findings: [],
      preliminaryCoverageStatus: 'not_checked',
      deductible: null,
      deductibleLabel: null,
    };
  }

  const policyFindings: PolicyFindingInput[] = [];
  const theftMetadata = readTheftMetadata(claim.metadata);
  const isTheftOrBaggage =
    claim.claim_type === 'theft' || claim.claim_type === 'baggage';

  addIncidentDateChecks(policyFindings, claim, policy);
  addDestinationChecks(policyFindings, claim, policy);

  if (isTheftOrBaggage) {
    addBaggageCoverageCheck(policyFindings, policy);
  }

  if (claim.claim_type === 'theft') {
    addTheftDocumentChecks(policyFindings, policy, theftMetadata.theft_details);
    addTheftExclusionChecks(
      policyFindings,
      policy,
      theftMetadata.theft_details,
    );
    addStolenItemChecks(
      policyFindings,
      policy,
      theftMetadata.stolen_items ?? [],
    );
  }

  const preliminaryCoverageStatus = resolvePreliminaryCoverageStatus(
    policyFindings.map((finding) => finding.impact),
  );

  return {
    policy,
    findings: policyFindings.map((input) => buildFinding(input)),
    preliminaryCoverageStatus,
    deductible: policy.coverages.baggage.deductible,
    deductibleLabel: `השתתפות עצמית צפויה: ${formatAmount(policy.coverages.baggage.deductible, 'ILS')}`,
  };
}

export function derivePolicyFindings(
  claim: ClaimSynthesisContext | null | undefined,
): Finding[] {
  if (!claim) {
    return [];
  }

  return evaluatePolicyCoverage({ claim }).findings;
}

export function getPreliminaryCoverageStatusForClaim(
  claim: ClaimSynthesisContext | null | undefined,
): PreliminaryCoverageStatus {
  if (!claim) {
    return 'not_checked';
  }

  return evaluatePolicyCoverage({ claim }).preliminaryCoverageStatus;
}

function addIncidentDateChecks(
  findings: PolicyFindingInput[],
  claim: ClaimSynthesisContext,
  policy: TravelPolicy,
) {
  const incidentDate = normalizeDate(claim.incident_date);

  if (!incidentDate) {
    findings.push({
      title: 'חסר תאריך אירוע לבדיקת תקופת כיסוי',
      severity: 'high',
      category: 'coverage_validation',
      impact: 'missing_information',
      evidence: {
        field_path: 'claims.incident_date',
        expected_value: `תאריך בין ${policy.coverage_start} ל-${policy.coverage_end}`,
        found_value: 'לא נמצא',
        explanation: 'לא ניתן לבדוק את תקופת הכיסוי ללא תאריך אירוע ברור.',
        recommended_action: 'לבקש מסמך או הבהרה הכוללים את תאריך האירוע.',
      },
    });
    return;
  }

  if (
    incidentDate < policy.coverage_start ||
    incidentDate > policy.coverage_end
  ) {
    findings.push({
      title: 'תאריך האירוע מחוץ לתקופת הביטוח',
      severity: 'high',
      category: 'coverage_validation',
      impact: 'likely_not_covered',
      evidence: {
        field_path: 'policy.coverage_period',
        expected_value: `${policy.coverage_start} - ${policy.coverage_end}`,
        found_value: incidentDate,
        explanation:
          'תאריך האירוע שנמסר אינו נמצא בתוך תקופת הביטוח הרשומה בפוליסה.',
        recommended_action:
          'לאמת את תאריכי הפוליסה ותאריך האירוע לפני החלטת מומחה.',
      },
    });
  }
}

function addDestinationChecks(
  findings: PolicyFindingInput[],
  claim: ClaimSynthesisContext,
  policy: TravelPolicy,
) {
  const destination = getDestinationForPolicyCheck(claim);

  if (!destination) {
    findings.push({
      title: 'חסר יעד נסיעה לבדיקת כיסוי',
      severity: 'high',
      category: 'coverage_validation',
      impact: 'missing_information',
      evidence: {
        field_path: 'claims.incident_location',
        expected_value: policy.destinations.join(', '),
        found_value: 'לא נמצא',
        explanation:
          'לא ניתן לבדוק התאמה ליעדי הפוליסה ללא יעד או מיקום אירוע.',
        recommended_action: 'לבקש הבהרה לגבי המדינה/העיר שבה אירע המקרה.',
      },
    });
    return;
  }

  if (!matchesPolicyDestination(destination, policy.destinations)) {
    findings.push({
      title: 'יעד האירוע אינו תואם ליעדי הפוליסה',
      severity: 'high',
      category: 'coverage_validation',
      impact: 'needs_exclusion_review',
      evidence: {
        field_path: 'policy.destinations',
        expected_value: policy.destinations.join(', '),
        found_value: destination,
        explanation:
          'יעד האירוע שנמסר אינו תואם ליעדים הרשומים בפוליסת ההדגמה.',
        recommended_action:
          'לאמת את יעד הנסיעה מול תנאי הפוליסה לפני החלטת מומחה.',
      },
    });
  }
}

function addBaggageCoverageCheck(
  findings: PolicyFindingInput[],
  policy: TravelPolicy,
) {
  if (policy.coverages.baggage.covered) {
    return;
  }

  findings.push({
    title: 'כיסוי כבודה אינו פעיל בפוליסה',
    severity: 'high',
    category: 'coverage_validation',
    impact: 'likely_not_covered',
    evidence: {
      field_path: 'policy.coverages.baggage.covered',
      expected_value: 'כיסוי כבודה פעיל',
      found_value: 'לא נמצא כיסוי כבודה פעיל',
      explanation:
        'התביעה סווגה כגניבה/כבודה אך בפוליסה לא מוגדר כיסוי כבודה פעיל.',
      recommended_action: 'לאמת את תנאי הפוליסה לפני החלטת מומחה.',
    },
  });
}

function addTheftDocumentChecks(
  findings: PolicyFindingInput[],
  policy: TravelPolicy,
  theftDetails: ReturnType<typeof readTheftMetadata>['theft_details'],
) {
  if (!policy.required_documents.theft.includes('police_report')) {
    return;
  }

  const filed = theftDetails?.police_report_filed;
  const available = theftDetails?.police_report_available;

  if (filed === 'yes' && available === 'yes') {
    return;
  }

  findings.push({
    title: 'חסר מסמך חובה — אישור משטרה',
    severity: 'high',
    category: 'document_requirement',
    impact: 'missing_information',
    evidence: {
      field_path: 'policy.required_documents.theft.police_report',
      expected_value: 'אישור משטרה מקומית',
      found_value: 'לא נמצא',
      explanation: 'לפי פוליסת ההדגמה, בתביעת גניבה נדרש אישור משטרה.',
      recommended_action:
        'לבקש אישור משטרה מקומית או הסבר מדוע לא הוגשה תלונה.',
    },
  });
}

function addTheftExclusionChecks(
  findings: PolicyFindingInput[],
  policy: TravelPolicy,
  theftDetails: ReturnType<typeof readTheftMetadata>['theft_details'],
) {
  if (
    policy.exclusions.includes('unattended_baggage') &&
    theftDetails?.was_bag_supervised === 'no'
  ) {
    findings.push({
      title: 'דורש בדיקת חריג — תיק ללא השגחה',
      severity: 'high',
      category: 'policy_exclusion',
      impact: 'needs_exclusion_review',
      evidence: {
        field_path: 'policy.exclusions.unattended_baggage',
        expected_value: 'התיק היה תחת השגחה',
        found_value: 'התיק דווח כלא תחת השגחה',
        explanation: 'נסיבות שמירה על התיק עשויות להפעיל חריג בפוליסה.',
        recommended_action:
          'לבחון את נסיבות השמירה מול תנאי הפוליסה לפני החלטת מומחה.',
      },
    });
  }

  if (
    policy.exclusions.includes('theft_from_unlocked_vehicle') &&
    theftDetails?.bag_location_at_theft === 'unlocked_vehicle'
  ) {
    findings.push({
      title: 'דורש בדיקת חריג — גניבה מרכב לא נעול',
      severity: 'high',
      category: 'policy_exclusion',
      impact: 'needs_exclusion_review',
      evidence: {
        field_path: 'policy.exclusions.theft_from_unlocked_vehicle',
        expected_value: 'הגניבה אינה מרכב לא נעול',
        found_value: 'דווח על גניבה מרכב לא נעול',
        explanation: 'גניבה מרכב לא נעול עשויה להיות מוחרגת בפוליסה.',
        recommended_action: 'לבדוק את חריג הגניבה מרכב לפני החלטת מומחה.',
      },
    });
  }
}

function addStolenItemChecks(
  findings: PolicyFindingInput[],
  policy: TravelPolicy,
  stolenItems: StolenItem[],
) {
  if (stolenItems.length === 0) {
    return;
  }

  const totalAmount = stolenItems.reduce(
    (sum, item) => sum + toIlsAmount(item),
    0,
  );
  const cashAmount = stolenItems
    .filter((item) => item.category === 'cash')
    .reduce((sum, item) => sum + toIlsAmount(item), 0);

  if (
    policy.exclusions.includes('cash') &&
    !policy.coverages.cash.covered &&
    cashAmount > 0
  ) {
    findings.push({
      title: 'מזומן מוחרג בפוליסה',
      severity: 'high',
      category: 'coverage_validation',
      impact:
        cashAmount >= totalAmount * 0.5
          ? 'likely_not_covered'
          : 'needs_exclusion_review',
      evidence: {
        field_path: 'policy.coverages.cash.covered',
        expected_value: 'כיסוי מזומן פעיל',
        found_value: `מזומן נתבע בסך ${formatAmount(cashAmount, 'ILS')}`,
        explanation: 'פוליסת ההדגמה אינה כוללת כיסוי למזומן.',
        recommended_action: 'לבחון את חריג המזומן בפוליסה לפני החלטת מומחה.',
      },
    });
  }

  for (const item of stolenItems) {
    addProofRequirementCheck(findings, policy, item);
    addPerItemLimitCheck(findings, policy, item);
  }

  if (totalAmount > policy.coverages.baggage.limit_total) {
    findings.push({
      title: 'סכום התביעה מעל תקרת כיסוי הכבודה',
      severity: 'high',
      category: 'coverage_validation',
      impact: 'needs_exclusion_review',
      evidence: {
        field_path: 'policy.coverages.baggage.limit_total',
        expected_value: `תקרת כבודה ${formatAmount(policy.coverages.baggage.limit_total, 'ILS')}`,
        found_value: `סכום פריטים ${formatAmount(totalAmount, 'ILS')}`,
        explanation: 'סכום הפריטים המדווחים גבוה מתקרת כיסוי הכבודה בפוליסה.',
        recommended_action:
          'לאמת את הסכומים מול קבלות ותקרות הכיסוי לפני החלטת מומחה.',
      },
    });
  }
}

function addProofRequirementCheck(
  findings: PolicyFindingInput[],
  policy: TravelPolicy,
  item: StolenItem,
) {
  const requiresProof =
    (item.is_valuable === 'yes' || item.category === 'jewelry') &&
    policy.coverages.valuables.requires_receipt;
  const requiresElectronicsProof =
    item.category === 'electronics' &&
    policy.coverages.electronics.requires_receipt;

  if (!requiresProof && !requiresElectronicsProof) {
    return;
  }

  if (item.has_receipt === 'yes' || item.has_proof_of_ownership === 'yes') {
    return;
  }

  findings.push({
    title: 'חפץ ערך דורש קבלה או הוכחת בעלות לפי הפוליסה',
    severity: 'high',
    category: 'document_requirement',
    impact: 'missing_information',
    evidence: {
      field_path: 'policy.coverages.valuables.requires_receipt',
      expected_value: 'קבלה או הוכחת בעלות',
      found_value: `${item.name || 'פריט ללא שם'} ללא קבלה/הוכחת בעלות`,
      explanation: 'חפצי ערך ואלקטרוניקה דורשים הוכחת בעלות לפי פוליסת ההדגמה.',
      recommended_action: 'לבקש קבלה או הוכחת בעלות עבור הפריט היקר.',
    },
  });
}

function addPerItemLimitCheck(
  findings: PolicyFindingInput[],
  policy: TravelPolicy,
  item: StolenItem,
) {
  const amount = toIlsAmount(item);

  if (!amount) {
    return;
  }

  const limit = getPerItemLimit(policy, item);

  if (amount <= limit) {
    return;
  }

  findings.push({
    title: 'סכום הפריט מעל תקרת הכיסוי לפריט',
    severity: 'high',
    category: 'coverage_validation',
    impact: 'needs_exclusion_review',
    evidence: {
      field_path: getPerItemLimitFieldPath(item),
      expected_value: `תקרת פריט ${formatAmount(limit, 'ILS')}`,
      found_value: `סכום נתבע ${formatAmount(amount, 'ILS')}`,
      explanation: 'הסכום הנתבע עבור פריט יחיד גבוה מתקרת הכיסוי הרלוונטית.',
      recommended_action:
        'לאמת את סכום הפריט מול קבלה ותקרת הכיסוי לפני החלטת מומחה.',
    },
  });
}

function resolvePreliminaryCoverageStatus(
  impacts: StatusImpact[],
): PreliminaryCoverageStatus {
  if (impacts.includes('likely_not_covered')) {
    return 'likely_not_covered';
  }

  if (impacts.includes('needs_exclusion_review')) {
    return 'needs_exclusion_review';
  }

  if (impacts.includes('missing_information')) {
    return 'missing_information';
  }

  return 'likely_covered';
}

function buildFinding(input: PolicyFindingInput): Finding {
  return {
    id: generateFindingId({
      source: 'policy-v1',
      title: input.title,
      evidence: input.evidence,
    }),
    title: input.title,
    description: input.evidence.explanation ?? input.title,
    severity: input.severity,
    category: input.category,
    evidence: [input.evidence],
  };
}

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const match = value.match(/^\d{4}-\d{2}-\d{2}/);

  return match?.[0] ?? null;
}

function getDestinationForPolicyCheck(
  claim: ClaimSynthesisContext,
): string | null {
  const metadataCountry = readString(claim.metadata?.country);

  return metadataCountry ?? claim.incident_location ?? null;
}

function matchesPolicyDestination(
  destination: string,
  policyDestinations: string[],
): boolean {
  const normalizedDestination = normalizeText(destination);

  return policyDestinations.some((policyDestination) => {
    const normalizedPolicyDestination = normalizeText(policyDestination);

    return (
      normalizedDestination === normalizedPolicyDestination ||
      normalizedDestination.includes(normalizedPolicyDestination) ||
      normalizedPolicyDestination.includes(normalizedDestination)
    );
  });
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase('he-IL');
}

function toIlsAmount(item: StolenItem): number {
  const amount = Number(item.claimed_amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  const currency = item.currency || 'ILS';

  return amount * (ILS_EXCHANGE_RATE[currency] ?? ILS_EXCHANGE_RATE.OTHER);
}

function getPerItemLimit(policy: TravelPolicy, item: StolenItem): number {
  if (item.category === 'electronics') {
    return policy.coverages.electronics.limit_per_item;
  }

  if (item.category === 'jewelry' || item.is_valuable === 'yes') {
    return policy.coverages.valuables.limit_per_item;
  }

  return policy.coverages.baggage.limit_per_item;
}

function getPerItemLimitFieldPath(item: StolenItem): string {
  if (item.category === 'electronics') {
    return 'policy.coverages.electronics.limit_per_item';
  }

  if (item.category === 'jewelry' || item.is_valuable === 'yes') {
    return 'policy.coverages.valuables.limit_per_item';
  }

  return 'policy.coverages.baggage.limit_per_item';
}

function formatAmount(amount: number, currency: string): string {
  return `${Math.round(amount).toLocaleString('he-IL')} ${currency}`;
}
