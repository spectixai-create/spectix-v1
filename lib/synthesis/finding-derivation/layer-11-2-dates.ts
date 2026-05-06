import { generateFindingId } from '../id-generation';
import type { ClaimValidationRow, Finding } from '../types';
import { arrayAt, collectEvidence } from './evidence';

type Rule = {
  rule_id?: string;
  status?: string;
  reason?: string;
  evidence?: unknown;
};

const RULE_FINDINGS: Record<
  string,
  {
    severity: Finding['severity'];
    category: Finding['category'];
    title: string;
    description: string;
  }
> = {
  policy_coverage: {
    severity: 'high',
    category: 'gap',
    title: 'אירוע מחוץ לתקופת כיסוי',
    description: 'תאריך האירוע אינו נמצא בתוך תקופת הכיסוי הידועה.',
  },
  submission_timing: {
    severity: 'medium',
    category: 'inconsistency',
    title: 'תאריך הגשה לפני אירוע',
    description: 'תאריך הגשת התביעה מוקדם מתאריך האירוע.',
  },
  travel_containment: {
    severity: 'medium',
    category: 'inconsistency',
    title: 'תאריך אירוע לא בתוך תאריכי טיסה/מלון',
    description: 'תאריך האירוע אינו תואם את טווחי הנסיעה או השהייה.',
  },
  document_age: {
    severity: 'low',
    category: 'inconsistency',
    title: 'תאריך מסמך לפני אירוע',
    description: 'תאריך יצירת מסמך מוקדם מתאריך האירוע.',
  },
};

export function deriveDateFindings(row: ClaimValidationRow): Finding[] {
  const payload = row.payload;
  const evidence = collectEvidence(payload);

  if (row.status === 'failed') {
    return [
      finding({
        category: 'gap',
        severity: 'high',
        title: 'בדיקת תאריכים כשלה',
        description: 'שכבת בדיקת התאריכים נכשלה ולכן נדרש בירור ידני.',
        evidence,
      }),
    ];
  }

  if (row.status === 'skipped' && payload.reason === 'no_dates') {
    return [
      finding({
        category: 'gap',
        severity: 'medium',
        title: 'חסרים תאריכים לבדיקת תקופת כיסוי',
        description: 'לא נמצאו תאריכים מספיקים להפעלת בדיקות הכיסוי.',
        evidence,
      }),
    ];
  }

  const rules = arrayAt<Rule>(payload, 'rules');
  return rules
    .filter((rule) => rule.status === 'fail' && rule.rule_id)
    .flatMap((rule) => {
      const template = RULE_FINDINGS[rule.rule_id as string];
      if (!template) return [];
      return [
        finding({
          ...template,
          evidence:
            collectEvidence(rule).length > 0 ? collectEvidence(rule) : evidence,
        }),
      ];
    });
}

function finding(input: Omit<Finding, 'id' | 'source_layer_id'>): Finding {
  const seed = {
    category: input.category,
    source_layer_id: '11.2',
    severity: input.severity,
    title: input.title,
    evidence: input.evidence,
  } as const;

  return {
    ...input,
    id: generateFindingId(seed),
    source_layer_id: '11.2',
  };
}
