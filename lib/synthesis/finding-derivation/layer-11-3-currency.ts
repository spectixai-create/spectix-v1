import { generateFindingId } from '../id-generation';
import type { ClaimValidationRow, Finding } from '../types';
import { arrayAt, collectEvidence, numberAt } from './evidence';

type CurrencyItem = {
  status?: string;
  evidence?: unknown;
};

export function deriveCurrencyFindings(row: ClaimValidationRow): Finding[] {
  const payload = row.payload;
  const evidence = collectEvidence(payload);

  if (row.status === 'failed') {
    return [
      finding({
        category: 'gap',
        severity: 'high',
        title: 'בדיקת מטבעות כשלה',
        description: 'שכבת בדיקת המטבעות נכשלה ולכן נדרש בירור ידני.',
        evidence,
      }),
    ];
  }

  const items = arrayAt<CurrencyItem>(payload, 'items');
  const findings: Finding[] = [];
  const hasOutlier =
    numberAt(payload, ['summary', 'outliers']) > 0 ||
    items.some((item) => item.status === 'outlier');
  const hasRateFailure =
    numberAt(payload, ['summary', 'rate_failure']) > 0 ||
    items.some((item) => item.status === 'rate_failure');

  if (hasOutlier) {
    const outlierEvidence = collectEvidence(
      items.filter((item) => item.status === 'outlier'),
    );
    findings.push(
      finding({
        category: 'anomaly',
        severity: 'medium',
        title: 'סכום חריג בקבלה',
        description: 'נמצא סכום חריג ביחס לסכומים האחרים בתביעה.',
        evidence: outlierEvidence.length > 0 ? outlierEvidence : evidence,
      }),
    );
  }

  if (hasRateFailure) {
    const rateEvidence = collectEvidence(
      items.filter((item) => item.status === 'rate_failure'),
    );
    findings.push(
      finding({
        category: 'gap',
        severity: 'low',
        title: 'לא ניתן לאמת שער חליפין',
        description: 'חסרה המרת מטבע אמינה עבור אחד הסכומים.',
        evidence: rateEvidence.length > 0 ? rateEvidence : evidence,
      }),
    );
  }

  return findings;
}

function finding(input: Omit<Finding, 'id' | 'source_layer_id'>): Finding {
  const seed = {
    category: input.category,
    source_layer_id: '11.3',
    severity: input.severity,
    title: input.title,
    evidence: input.evidence,
  } as const;

  return {
    ...input,
    id: generateFindingId(seed),
    source_layer_id: '11.3',
  };
}
