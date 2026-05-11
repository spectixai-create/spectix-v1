import { generateFindingId } from './id-generation';
import type { ClaimSynthesisContext, Finding } from './types';
import {
  getOptionLabel,
  readTheftMetadata,
  stolenItemCategoryOptions,
  theftBagLocationOptions,
  yesNoUnknownOptions,
  type StolenItem,
  type TheftDetails,
} from '@/lib/theft/metadata';

const HIGH_VALUE_THRESHOLD_ILS = 1000;
const ILS_RATE: Record<string, number> = {
  ILS: 1,
  USD: 3.7,
  EUR: 4,
  GBP: 4.6,
  OTHER: 1,
};

export function deriveTheftMetadataFindings(
  claim: ClaimSynthesisContext | null | undefined,
): Finding[] {
  if (!claim || claim.claim_type !== 'theft') return [];

  const { theft_details: details, stolen_items: items } = readTheftMetadata(
    claim.metadata,
  );
  const findings: Finding[] = [];

  if (details) {
    findings.push(...deriveTheftDetailsFindings(details));
  }

  findings.push(...deriveStolenItemFindings(items ?? []));

  return findings;
}

function deriveTheftDetailsFindings(details: TheftDetails): Finding[] {
  const findings: Finding[] = [];

  if (
    details.police_report_filed === 'no' ||
    details.police_report_filed === 'unknown'
  ) {
    findings.push(
      finding({
        category: 'document_requirement',
        severity: 'high',
        title: 'חסר אישור משטרה בגניבה',
        description: 'בתביעת גניבה חסר אישור או דיווח משטרה מקומית.',
        fieldPath: 'claims.metadata.theft_details.police_report_filed',
        expectedValue: 'תלונה במשטרה מקומית',
        foundValue: triStateLabel(details.police_report_filed),
        explanation: 'אישור משטרה הוא מסמך מרכזי לבדיקת אירוע גניבה.',
        recommendedAction:
          'לבקש אישור משטרה מקומית או הסבר מדוע לא הוגשה תלונה',
      }),
    );
  }

  if (
    details.police_report_available === 'no' ||
    details.police_report_available === 'unknown'
  ) {
    findings.push(
      finding({
        category: 'document_requirement',
        severity: 'high',
        title: 'חסר אישור משטרה',
        description: 'המבוטח סימן שאין אישור משטרה זמין או שהמידע לא ידוע.',
        fieldPath: 'claims.metadata.theft_details.police_report_available',
        expectedValue: 'אישור משטרה זמין להעלאה',
        foundValue: triStateLabel(details.police_report_available),
        explanation: 'חסר מסמך בסיסי לבדיקת נסיבות הגניבה.',
        recommendedAction:
          'לבקש אישור משטרה מקומית הכולל שם מלא, תאריך אירוע ומיקום',
      }),
    );
  }

  if (details.was_bag_supervised === 'no') {
    findings.push(
      finding({
        category: 'risk_flag',
        severity: 'high',
        title: 'התיק דווח כלא תחת השגחה',
        description: 'נסיבות השמירה על התיק דורשות בדיקת חריגים בפוליסה.',
        fieldPath: 'claims.metadata.theft_details.was_bag_supervised',
        expectedValue: 'התיק היה תחת השגחה',
        foundValue: triStateLabel(details.was_bag_supervised),
        explanation: 'תיק שלא היה תחת השגחה עשוי להשפיע על בדיקת הכיסוי.',
        recommendedAction:
          'לבדוק האם נסיבות השמירה על התיק עומדות בתנאי הפוליסה',
      }),
    );
  }

  if (
    details.bag_location_at_theft === 'locked_vehicle' ||
    details.bag_location_at_theft === 'unlocked_vehicle'
  ) {
    findings.push(
      finding({
        category: 'policy_exclusion',
        severity:
          details.bag_location_at_theft === 'unlocked_vehicle'
            ? 'high'
            : 'medium',
        title: 'גניבה מרכב / תא מטען דורשת בדיקת חריג',
        description: 'מיקום הגניבה מצריך בדיקת תנאי כיסוי לגניבה מרכב.',
        fieldPath: 'claims.metadata.theft_details.bag_location_at_theft',
        expectedValue: 'נסיבות שאינן דורשות חריג רכב',
        foundValue: getOptionLabel(
          theftBagLocationOptions,
          details.bag_location_at_theft,
        ),
        explanation: 'גניבה מרכב או תא מטען עשויה להיות כפופה לחריגים.',
        recommendedAction: 'לבדוק חריגים בפוליסה לגבי גניבה מרכב',
      }),
    );
  }

  return findings;
}

function deriveStolenItemFindings(items: StolenItem[]): Finding[] {
  const findings: Finding[] = [];

  items.forEach((item, index) => {
    const label = item.name || `פריט ${index + 1}`;
    const itemPath = `claims.metadata.stolen_items.${index}`;

    if (item.category === 'cash') {
      findings.push(
        finding({
          category: 'coverage_validation',
          severity: 'medium',
          title: 'מזומן דווח כפריט שנגנב',
          description: 'דווח על מזומן כחלק מרשימת הפריטים שנגנבו.',
          fieldPath: `${itemPath}.category`,
          expectedValue: 'פריט עם תנאי כיסוי רגילים',
          foundValue: `${label} — ${getOptionLabel(
            stolenItemCategoryOptions,
            item.category,
          )}`,
          explanation: 'כיסוי למזומן כפוף בדרך כלל לתנאים ותקרות ייעודיים.',
          recommendedAction: 'לבדוק תנאי כיסוי למזומן בפוליסה',
        }),
      );
    }

    if (
      item.is_valuable === 'yes' &&
      item.has_receipt !== 'yes' &&
      item.has_proof_of_ownership !== 'yes'
    ) {
      findings.push(
        finding({
          category: 'document_requirement',
          severity: 'high',
          title: 'חפץ ערך ללא הוכחת בעלות',
          description: 'דווח על חפץ ערך ללא קבלה או הוכחת בעלות.',
          fieldPath: `${itemPath}.is_valuable`,
          expectedValue: 'קבלה או הוכחת בעלות לחפץ ערך',
          foundValue: `${label} — קבלה: ${triStateLabel(
            item.has_receipt,
          )}, בעלות: ${triStateLabel(item.has_proof_of_ownership)}`,
          explanation: 'חפצי ערך דורשים תיעוד בעלות לפני החלטת מומחה.',
          recommendedAction: 'לבקש קבלה או הוכחת בעלות עבור הפריט היקר שנתבע',
        }),
      );
    }

    if (
      toIlsAmount(item.claimed_amount, item.currency) >
        HIGH_VALUE_THRESHOLD_ILS &&
      item.has_receipt !== 'yes'
    ) {
      findings.push(
        finding({
          category: 'document_requirement',
          severity: 'medium',
          title: 'פריט בסכום גבוה ללא קבלה',
          description: 'ברשימת הפריטים יש פריט בסכום גבוה ללא קבלה.',
          fieldPath: `${itemPath}.claimed_amount`,
          expectedValue: 'קבלה עבור פריט בסכום גבוה',
          foundValue: `${label} — ${formatAmount(
            item.claimed_amount,
            item.currency,
          )}`,
          explanation: 'סכום גבוה ללא קבלה מקשה על הכנת התיק להחלטת מומחה.',
          recommendedAction: 'לבקש קבלות או הוכחות בעלות עבור הפריטים שנתבעו',
        }),
      );
    }
  });

  return dedupeFindings(findings);
}

function finding(input: {
  category: Finding['category'];
  severity: Finding['severity'];
  title: string;
  description: string;
  fieldPath: string;
  expectedValue: string;
  foundValue: string;
  explanation: string;
  recommendedAction: string;
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
        field_path: input.fieldPath,
        expected_value: input.expectedValue,
        found_value: input.foundValue,
        explanation: input.explanation,
        recommended_action: input.recommendedAction,
      },
    ],
  };
}

function triStateLabel(value: string | null | undefined): string {
  return getOptionLabel(yesNoUnknownOptions, value);
}

function toIlsAmount(amount: number | null, currency: string | null): number {
  if (!amount || amount <= 0) return 0;
  return amount * (ILS_RATE[currency ?? 'ILS'] ?? ILS_RATE.OTHER);
}

function formatAmount(amount: number | null, currency: string | null): string {
  if (!amount) return 'לא צוין';
  return `${amount.toLocaleString('he-IL')} ${currency ?? ''}`.trim();
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();

  return findings.filter((finding) => {
    const key = `${finding.title}:${finding.evidence[0]?.field_path ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
