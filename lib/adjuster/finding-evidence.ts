import type { BriefFinding, FindingEvidenceView } from '@/lib/adjuster/types';

export type FormattedFindingEvidence = {
  sourceLabel: string;
  documentTypeLabel: string | null;
  checkedField: string;
  expectedValue: string;
  foundValue: string;
  sourceQuote: string | null;
  explanation: string;
  recommendedAction: string;
};

const MISSING_VALUE = 'לא נמצא';

export function formatFindingEvidence(
  finding: BriefFinding,
): FormattedFindingEvidence[] {
  if (finding.evidence.length === 0) {
    return [formatClaimLevelEvidence(finding)];
  }

  return finding.evidence.map((evidence) =>
    formatEvidenceRow(finding, evidence),
  );
}

function formatEvidenceRow(
  finding: BriefFinding,
  evidence: FindingEvidenceView,
): FormattedFindingEvidence {
  return {
    sourceLabel: getSourceLabel(finding, evidence),
    documentTypeLabel: joinLabels(
      evidence.documentType,
      evidence.documentSubtype,
    ),
    checkedField: getCheckedField(evidence),
    expectedValue: evidence.expectedValue ?? MISSING_VALUE,
    foundValue:
      evidence.foundValue ??
      evidence.normalizedValue ??
      evidence.rawValue ??
      MISSING_VALUE,
    sourceQuote: evidence.sourceQuote,
    explanation: evidence.explanation ?? finding.description ?? MISSING_VALUE,
    recommendedAction:
      evidence.recommendedAction ?? deriveRecommendedAction(finding),
  };
}

function formatClaimLevelEvidence(
  finding: BriefFinding,
): FormattedFindingEvidence {
  return {
    sourceLabel: inferFallbackSource(finding),
    documentTypeLabel: null,
    checkedField: MISSING_VALUE,
    expectedValue: MISSING_VALUE,
    foundValue: MISSING_VALUE,
    sourceQuote: null,
    explanation: finding.description || MISSING_VALUE,
    recommendedAction: deriveRecommendedAction(finding),
  };
}

function getSourceLabel(
  finding: BriefFinding,
  evidence: FindingEvidenceView,
): string {
  if (evidence.documentFileName) return evidence.documentFileName;
  if (evidence.documentId) return 'מקור לא משויך למסמך';
  return inferFallbackSource(finding);
}

function inferFallbackSource(finding: BriefFinding): string {
  const text = `${finding.category} ${finding.title} ${finding.description} ${
    finding.sourceLayerId ?? ''
  }`.toLocaleLowerCase('he-IL');

  if (
    text.includes('policy') ||
    text.includes('פוליסה') ||
    text.includes('כיסוי') ||
    finding.sourceLayerId === '11.2'
  ) {
    return 'תנאי פוליסה';
  }

  if (
    text.includes('claim') ||
    text.includes('תביעה') ||
    text.includes('תאריך') ||
    text.includes('שם') ||
    text.includes('סכום')
  ) {
    return 'נתוני תביעה';
  }

  return 'לא זוהה — נדרש אימות ידני';
}

function getCheckedField(evidence: FindingEvidenceView): string {
  if (!evidence.fieldPath) return evidence.fieldName ?? MISSING_VALUE;
  if (!evidence.fieldName || evidence.fieldName === evidence.fieldPath) {
    return evidence.fieldPath;
  }

  return `${evidence.fieldName} (${evidence.fieldPath})`;
}

function deriveRecommendedAction(finding: BriefFinding): string {
  if (finding.category === 'gap') {
    return 'לבקש מהלקוח להשלים מסמך או מידע חסר לפני החלטת מומחה.';
  }
  if (finding.category === 'inconsistency') {
    return 'לאמת את הערכים מול המסמכים לפני החלטת מומחה.';
  }
  if (finding.category === 'anomaly') {
    return 'לבחון את החריגה ולתעד את מסקנת מומחה התביעות.';
  }

  return 'לבחון את הממצא ידנית לפני החלטת מומחה.';
}

function joinLabels(
  documentType: string | null,
  documentSubtype: string | null,
): string | null {
  const values = [documentType, documentSubtype].filter(
    (value): value is string => Boolean(value),
  );
  const unique = Array.from(new Set(values));
  return unique.length > 0 ? unique.join(' / ') : null;
}
