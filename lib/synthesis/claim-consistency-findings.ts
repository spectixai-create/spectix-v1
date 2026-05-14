import { readTheftMetadata } from '@/lib/theft/metadata';

import { generateFindingId } from './id-generation';
import type {
  ClaimDocumentSummary,
  ClaimSynthesisContext,
  Finding,
} from './types';

const MEDICAL_DOCUMENT_TYPES = new Set([
  'medical_report',
  'medical_visit',
  'discharge_summary',
  'medical_receipt',
  'pharmacy_receipt',
  'prescription',
  'medical_record_12mo',
  'medical_evacuation',
]);

const THEFT_SUPPORTING_DOCUMENT_TYPES = new Set([
  'police_report',
  'receipt',
  'general_receipt',
  'incident_affidavit',
  'photos',
  'serial_or_imei',
  'witnesses',
  'id_or_passport',
]);

const MEDICAL_SUMMARY_KEYWORDS = [
  'נפילה',
  'פציעה',
  'טיפול רפואי',
  'רופא',
  'בית חולים',
  'אשפוז',
  'תרופות',
  'כאב',
  'כאבים',
  'שבר',
  'fall',
  'injury',
  'medical',
  'doctor',
  'hospital',
  'treatment',
  'medicine',
  'pain',
  'fracture',
];

export function deriveClaimConsistencyFindings(
  claim: ClaimSynthesisContext | null | undefined,
): Finding[] {
  if (!claim || claim.claim_type !== 'theft') return [];

  return [
    ...deriveDocumentTypeMismatchFindings(claim),
    ...deriveSummaryMismatchFindings(claim),
    ...deriveAmountMismatchFindings(claim),
  ];
}

function deriveDocumentTypeMismatchFindings(
  claim: ClaimSynthesisContext,
): Finding[] {
  const documents = claim.documents ?? [];
  if (documents.length === 0) return [];

  const classifiedDocuments = documents.filter((document) =>
    Boolean(document.document_type || document.document_subtype),
  );
  const medicalDocuments = classifiedDocuments.filter(isMedicalDocument);
  if (medicalDocuments.length === 0) return [];

  const theftSupportingDocuments = classifiedDocuments.filter(
    isTheftSupportingDocument,
  );
  const medicalMajority =
    medicalDocuments.length > Math.max(0, classifiedDocuments.length / 2);

  if (theftSupportingDocuments.length > 0 && !medicalMajority) return [];

  return [
    finding({
      title: 'סוג המסמכים אינו תואם לסוג התביעה',
      severity: 'high',
      category: 'inconsistency',
      description:
        'התביעה סווגה כגניבה, אך המסמכים שהועלו נראים כמסמכים רפואיים.',
      fieldPath: 'claims.claim_type',
      expectedValue: 'מסמכי גניבה / כבודה / אישור משטרה / רשימת פריטים',
      foundValue: describeDocuments(medicalDocuments),
      explanation:
        'התביעה סווגה כגניבה, אך המסמכים שהועלו נראים כמסמכים רפואיים.',
      recommendedAction:
        'לאמת האם סוג התביעה שגוי או לבקש מסמכי גניבה רלוונטיים.',
      source: 'נתוני תביעה ומסמכים',
      document: medicalDocuments[0],
    }),
  ];
}

function deriveSummaryMismatchFindings(
  claim: ClaimSynthesisContext,
): Finding[] {
  const summary = claim.summary?.trim();
  if (!summary) return [];

  const normalizedSummary = summary.toLocaleLowerCase('he-IL');
  const hasMedicalKeyword = MEDICAL_SUMMARY_KEYWORDS.some((keyword) =>
    normalizedSummary.includes(keyword.toLocaleLowerCase('he-IL')),
  );

  if (!hasMedicalKeyword) return [];

  return [
    finding({
      title: 'תיאור האירוע אינו תואם לסוג התביעה',
      severity: 'high',
      category: 'inconsistency',
      description: 'התיאור נראה מתאים לאירוע רפואי/תאונתי ולא לתביעת גניבה.',
      fieldPath: 'claims.summary',
      expectedValue: 'תיאור אירוע גניבה',
      foundValue: concise(summary),
      explanation: 'התיאור נראה מתאים לאירוע רפואי/תאונתי ולא לתביעת גניבה.',
      recommendedAction: 'לאמת עם המבוטח את סוג התביעה או לעדכן את סוג התביעה.',
      source: 'נתוני תביעה',
    }),
  ];
}

function deriveAmountMismatchFindings(claim: ClaimSynthesisContext): Finding[] {
  const claimAmount = claim.amount_claimed;
  if (!claimAmount || claimAmount <= 0) return [];

  const { stolen_items: items } = readTheftMetadata(claim.metadata);
  const comparableItems = (items ?? []).filter((item) =>
    isComparableCurrency(item.currency, claim.currency),
  );
  if (comparableItems.length === 0) return [];

  const itemTotal = comparableItems.reduce(
    (total, item) => total + (item.claimed_amount ?? 0),
    0,
  );
  if (itemTotal <= 0) return [];

  const absoluteDifference = Math.abs(claimAmount - itemTotal);
  const relativeDifference =
    absoluteDifference / Math.max(claimAmount, itemTotal);

  if (absoluteDifference <= 100 && relativeDifference <= 0.05) return [];

  const currency = claim.currency ?? comparableItems[0]?.currency ?? 'ILS';

  return [
    finding({
      title: 'סכום התביעה אינו תואם לסכום הפריטים',
      severity: 'medium',
      category: 'inconsistency',
      description: 'יש פער בין הסכום הכללי שנתבע לבין סכום הפריטים שנרשמו.',
      fieldPath: 'claims.amount_claimed',
      expectedValue: 'סכום התביעה תואם לסכום הפריטים',
      foundValue: `סכום תביעה ${formatAmount(
        claimAmount,
        currency,
      )} מול סכום פריטים ${formatAmount(itemTotal, currency)}`,
      explanation: 'יש פער בין הסכום הכללי שנתבע לבין סכום הפריטים שנרשמו.',
      recommendedAction: 'לבדוק האם הסכום הכללי או רשימת הפריטים דורשים תיקון.',
      source: 'נתוני תביעה ורשימת פריטים שנגנבו',
    }),
  ];
}

function finding(input: {
  title: string;
  severity: Finding['severity'];
  category: Finding['category'];
  description: string;
  fieldPath: string;
  expectedValue: string;
  foundValue: string;
  explanation: string;
  recommendedAction: string;
  source: string;
  document?: ClaimDocumentSummary;
}): Finding {
  const seed = {
    category: input.category,
    severity: input.severity,
    title: input.title,
    field_path: input.fieldPath,
    found_value: input.foundValue,
  } as const;

  return {
    id: generateFindingId(seed),
    category: input.category,
    severity: input.severity,
    title: input.title,
    description: input.description,
    evidence: [
      {
        document_id: input.document?.id,
        document_type: input.document?.document_type,
        document_subtype: input.document?.document_subtype,
        source_quote: input.source,
        field_path: input.fieldPath,
        expected_value: input.expectedValue,
        found_value: input.foundValue,
        explanation: input.explanation,
        recommended_action: input.recommendedAction,
      },
    ],
  };
}

function isMedicalDocument(document: ClaimDocumentSummary): boolean {
  return hasDocumentValue(document, MEDICAL_DOCUMENT_TYPES);
}

function isTheftSupportingDocument(document: ClaimDocumentSummary): boolean {
  return hasDocumentValue(document, THEFT_SUPPORTING_DOCUMENT_TYPES);
}

function hasDocumentValue(
  document: ClaimDocumentSummary,
  allowedValues: Set<string>,
): boolean {
  return [document.document_type, document.document_subtype]
    .filter((value): value is string => Boolean(value))
    .some((value) => allowedValues.has(value));
}

function describeDocuments(documents: ClaimDocumentSummary[]): string {
  const values = documents.map((document) => {
    const name = document.file_name ?? 'מסמך ללא שם';
    const type = [document.document_type, document.document_subtype]
      .filter(Boolean)
      .join(' / ');

    return type ? `${name} (${type})` : name;
  });

  return `מסמכים רפואיים בתביעת גניבה: ${values.join(', ')}`;
}

function isComparableCurrency(
  itemCurrency: string | null,
  claimCurrency: string | null,
): boolean {
  const normalizedItemCurrency = itemCurrency ?? 'ILS';
  const normalizedClaimCurrency = claimCurrency ?? 'ILS';

  return normalizedItemCurrency === normalizedClaimCurrency;
}

function formatAmount(amount: number, currency: string | null): string {
  return `${amount.toLocaleString('he-IL')} ${currency ?? ''}`.trim();
}

function concise(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 160) return trimmed;
  return `${trimmed.slice(0, 157)}...`;
}
