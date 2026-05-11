'use client';

import type { ClaimValidation } from '@/lib/types';
import { EMPTY_STATES, VALIDATION_STATUS_LABELS } from '@/lib/ui/strings-he';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

type ValidationBusinessView = {
  checkName: string;
  statusLabel: string;
  checkedDescription: string;
  businessMeaning: string;
  recommendedAction: string;
};

const VALIDATION_LAYER_META: Record<
  ClaimValidation['layerId'],
  {
    checkName: string;
    checkedDescription: string;
    defaultAction: string;
  }
> = {
  '11.1': {
    checkName: 'בדיקת זהות ושמות במסמכים',
    checkedDescription: 'בדיקה האם שמות במסמכים תואמים לשם המבוטח/התובע',
    defaultAction: 'לבקש מסמך שבו מופיע שם מלא או לבדוק ידנית את המסמך',
  },
  '11.2': {
    checkName: 'בדיקת תאריכים ותקופת כיסוי',
    checkedDescription: 'בדיקה האם תאריכי האירוע והמסמכים מאפשרים בדיקת כיסוי',
    defaultAction: 'לבקש מסמך עם תאריך אירוע או לבדוק את תקופת הפוליסה',
  },
  '11.3': {
    checkName: 'בדיקת סכומים ומטבע',
    checkedDescription: 'בדיקת סכומים, מטבעות וסכומים חריגים',
    defaultAction: 'לאמת סכומים מול קבלות ותקרות כיסוי',
  },
};

export function ValidationTab({
  validations,
}: Readonly<{
  validations: ClaimValidation[];
}>) {
  if (validations.length === 0) {
    return <EmptyState text={EMPTY_STATES.validations} />;
  }

  return (
    <div className="space-y-3">
      {validations.map((validation) => {
        const view = getValidationBusinessView(validation);

        return (
          <article
            key={validation.id}
            className="rounded-md border bg-card p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">{view.checkName}</h3>
              <Badge variant={getValidationBadgeVariant(validation.status)}>
                {view.statusLabel}
              </Badge>
            </div>

            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-[150px_1fr]">
              <dt className="font-medium text-muted-foreground">בדיקה</dt>
              <dd>{view.checkName}</dd>
              <dt className="font-medium text-muted-foreground">תוצאה</dt>
              <dd>{view.statusLabel}</dd>
              <dt className="font-medium text-muted-foreground">מה נבדק</dt>
              <dd>{view.checkedDescription}</dd>
              <dt className="font-medium text-muted-foreground">
                משמעות עסקית
              </dt>
              <dd>{view.businessMeaning}</dd>
              <dt className="font-medium text-muted-foreground">
                פעולה מומלצת
              </dt>
              <dd>{view.recommendedAction}</dd>
            </dl>

            <TechnicalValidationDetails validation={validation} />
          </article>
        );
      })}
    </div>
  );
}

export function getValidationBusinessView(
  validation: ClaimValidation,
): ValidationBusinessView {
  const meta = VALIDATION_LAYER_META[validation.layerId];

  return {
    checkName: meta.checkName,
    statusLabel:
      VALIDATION_STATUS_LABELS[validation.status] ?? validation.status,
    checkedDescription: meta.checkedDescription,
    businessMeaning: getBusinessMeaning(validation),
    recommendedAction: getRecommendedAction(validation, meta.defaultAction),
  };
}

function getBusinessMeaning(validation: ClaimValidation): string {
  if (validation.status === 'failed') {
    return 'הבדיקה לא הושלמה ולכן נדרש אימות ידני לפני החלטה.';
  }

  if (validation.status === 'skipped') {
    return getSkippedMeaning(validation);
  }

  switch (validation.layerId) {
    case '11.1': {
      const mismatches = numberAt(validation.payload, [
        'summary',
        'mismatches',
      ]);
      const fuzzyMatches = numberAt(validation.payload, [
        'summary',
        'fuzzy_matches',
      ]);
      if (mismatches > 0) {
        return 'נמצאו שמות שאינם תואמים בין מסמכי התביעה.';
      }
      if (fuzzyMatches > 0) {
        return 'נמצאה התאמת שם חלקית שמצריכה בדיקה ידנית.';
      }
      return 'שמות שחולצו מהמסמכים נבדקו מול נתוני התביעה.';
    }
    case '11.2':
      return 'תאריכי האירוע והמסמכים נבדקו מול נתוני הנסיעה והכיסוי הידועים.';
    case '11.3':
      return 'סכומים ומטבעות במסמכים נבדקו מול הערכים שחולצו מהתיק.';
  }
}

function getSkippedMeaning(validation: ClaimValidation): string {
  const reason = stringAt(validation.payload, 'reason');

  if (validation.layerId === '11.1' && reason === 'no_name_fields') {
    return 'לא נמצאו במסמכים שדות שם שניתן להשוות.';
  }
  if (validation.layerId === '11.2' && reason === 'no_dates') {
    return 'לא נמצאו תאריכים מספיקים להפעלת בדיקות הכיסוי.';
  }
  if (validation.layerId === '11.3') {
    return 'לא נמצאו סכומים או מטבעות שניתן להשוות באופן אמין.';
  }

  return 'הבדיקה דולגה כי חסר מידע מתאים להשוואה.';
}

function getRecommendedAction(
  validation: ClaimValidation,
  defaultAction: string,
): string {
  if (validation.status === 'failed') {
    return 'לבדוק ידנית את המסמכים ולהריץ מחדש אם נדרש.';
  }

  if (validation.status === 'completed') {
    if (
      validation.layerId === '11.1' &&
      numberAt(validation.payload, ['summary', 'mismatches']) > 0
    ) {
      return 'לאמת את שם המבוטח מול מסמך רשמי או אישור משטרה.';
    }
    if (validation.layerId === '11.2') {
      const failedRules = arrayAt(validation.payload, 'rules').filter(
        (rule) => rule.status === 'fail',
      );
      if (failedRules.length > 0) {
        return 'לבקש מסמך עם תאריך אירוע או לבדוק את תקופת הפוליסה.';
      }
    }
    if (validation.layerId === '11.3') {
      const flaggedItems = arrayAt(validation.payload, 'items').filter(
        (item) => item.status === 'outlier' || item.status === 'rate_failure',
      );
      if (flaggedItems.length > 0) {
        return 'לאמת סכומים מול קבלות ותקרות כיסוי.';
      }
    }
    return 'להמשיך לפי הממצאים והראיות בתיק.';
  }

  return defaultAction;
}

function TechnicalValidationDetails({
  validation,
}: Readonly<{
  validation: ClaimValidation;
}>) {
  return (
    <details className="mt-4 rounded-md border bg-muted/40 p-3 text-sm">
      <summary className="cursor-pointer font-medium">פרטים טכניים</summary>
      <dl className="mt-3 grid gap-2 md:grid-cols-[130px_1fr]">
        <dt className="text-muted-foreground">מזהה בדיקה</dt>
        <dd className="font-latin text-xs">{validation.id}</dd>
        <dt className="text-muted-foreground">שכבה</dt>
        <dd className="font-latin text-xs">{validation.layerId}</dd>
        <dt className="text-muted-foreground">מעבר</dt>
        <dd className="font-latin text-xs">{validation.passNumber}</dd>
        <dt className="text-muted-foreground">נוצר</dt>
        <dd>{formatDate(validation.createdAt)}</dd>
      </dl>
    </details>
  );
}

function getValidationBadgeVariant(status: ClaimValidation['status']) {
  if (status === 'failed') return 'destructive';
  if (status === 'completed') return 'secondary';
  return 'outline';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function stringAt(value: Record<string, unknown>, key: string): string | null {
  const candidate = value[key];
  return typeof candidate === 'string' ? candidate : null;
}

function numberAt(value: Record<string, unknown>, path: string[]): number {
  let current: unknown = value;
  for (const segment of path) {
    if (!current || typeof current !== 'object') return 0;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === 'number' && Number.isFinite(current) ? current : 0;
}

function arrayAt(
  value: Record<string, unknown>,
  key: string,
): Array<Record<string, unknown>> {
  const candidate = value[key];
  return Array.isArray(candidate) ? candidate.filter(isRecord) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function EmptyState({ text }: Readonly<{ text: string }>) {
  return (
    <Card>
      <CardContent className="p-6 text-center text-sm text-muted-foreground">
        {text}
      </CardContent>
    </Card>
  );
}
