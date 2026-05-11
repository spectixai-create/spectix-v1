'use client';

import type { AuditLogView } from '@/lib/adjuster/types';
import {
  AUDIT_ACTION_LABELS,
  CLAIM_STATUS_LABELS,
  EMPTY_STATES,
} from '@/lib/ui/strings-he';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

type AuditDetailLine = {
  label: string;
  value: string;
};

type AuditBusinessView = {
  actionLabel: string;
  actorLabel: string;
  resultLabel: string;
  detailLines: AuditDetailLine[];
};

export function AuditTab({
  auditLog,
}: Readonly<{
  auditLog: AuditLogView[];
}>) {
  if (auditLog.length === 0) {
    return <EmptyState text={EMPTY_STATES.audit} />;
  }

  return (
    <div className="space-y-3">
      {auditLog.map((event) => {
        const view = getAuditBusinessView(event);

        return (
          <article key={event.id} className="rounded-md border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="font-medium" data-testid="audit-action-label">
                  {view.actionLabel}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formatDate(event.createdAt)} · {view.actorLabel}
                </p>
              </div>
              <Badge variant={getAuditBadgeVariant(view.resultLabel)}>
                {view.resultLabel}
              </Badge>
            </div>

            {view.detailLines.length > 0 ? (
              <dl className="mt-4 grid gap-2 text-sm md:grid-cols-[140px_1fr]">
                {view.detailLines.map((line) => (
                  <BusinessDetailLine
                    key={`${line.label}:${line.value}`}
                    line={line}
                  />
                ))}
              </dl>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                הפעולה נרשמה בהיסטוריית התיק.
              </p>
            )}

            <TechnicalAuditDetails event={event} />
          </article>
        );
      })}
    </div>
  );
}

export function getAuditBusinessView(event: AuditLogView): AuditBusinessView {
  return {
    actionLabel: AUDIT_ACTION_LABELS[event.action] ?? 'פעולת מערכת',
    actorLabel: getActorLabel(event),
    resultLabel: getAuditResultLabel(event),
    detailLines: getAuditDetailLines(event),
  };
}

function BusinessDetailLine({
  line,
}: Readonly<{
  line: AuditDetailLine;
}>) {
  return (
    <>
      <dt className="font-medium text-muted-foreground">{line.label}</dt>
      <dd className="break-words">{line.value}</dd>
    </>
  );
}

function TechnicalAuditDetails({
  event,
}: Readonly<{
  event: AuditLogView;
}>) {
  return (
    <details className="mt-4 rounded-md border bg-muted/40 p-3 text-sm">
      <summary className="cursor-pointer font-medium">פרטים טכניים</summary>
      <dl className="mt-3 grid gap-2 md:grid-cols-[130px_1fr]">
        <dt className="text-muted-foreground">פעולה פנימית</dt>
        <dd className="break-words font-latin text-xs">{event.action}</dd>
        {event.targetTable ? (
          <>
            <dt className="text-muted-foreground">טבלת יעד</dt>
            <dd className="break-words font-latin text-xs">
              {event.targetTable}
            </dd>
          </>
        ) : null}
        {event.targetId ? (
          <>
            <dt className="text-muted-foreground">מזהה יעד</dt>
            <dd className="break-words font-latin text-xs">{event.targetId}</dd>
          </>
        ) : null}
      </dl>
    </details>
  );
}

function getActorLabel(event: AuditLogView): string {
  switch (event.actorType) {
    case 'claimant':
      return 'לקוח';
    case 'user':
      return 'משתמש';
    case 'rule_engine':
    case 'llm':
    case 'gap_analyzer':
    case 'system':
      return 'מערכת';
  }
}

function getAuditResultLabel(event: AuditLogView): string {
  if (
    event.action.includes('failed') ||
    hasDetail(event.details, 'email_error')
  ) {
    return 'נכשל';
  }
  if (event.action.includes('started')) {
    return 'התחיל';
  }
  if (
    event.action.includes('completed') ||
    event.action === 'document_uploaded' ||
    event.action === 'claim_created'
  ) {
    return 'הושלם';
  }
  if (
    event.action === 'claim_status_changed' ||
    event.action === 'claim_rejected' ||
    event.action.startsWith('adjuster_decision') ||
    event.action === 'adjuster_request_info'
  ) {
    return 'עודכן';
  }

  return 'נרשם';
}

function getAuditBadgeVariant(resultLabel: string) {
  if (resultLabel === 'נכשל') return 'destructive';
  if (resultLabel === 'הושלם' || resultLabel === 'עודכן') return 'secondary';
  return 'outline';
}

function getAuditDetailLines(event: AuditLogView): AuditDetailLine[] {
  const details = event.details ?? {};
  const lines: AuditDetailLine[] = [];

  switch (event.action) {
    case 'claim_created':
      pushDetail(lines, 'מקור', getSourceLabel(stringAt(details, 'source')));
      break;
    case 'document_uploaded':
      pushDetail(
        lines,
        'מסמך',
        stringAt(details, 'file_name') ?? stringAt(details, 'fileName'),
      );
      pushDetail(lines, 'מצב', 'המסמך נקלט לתיק');
      break;
    case 'claim_synthesis_started':
      pushDetail(lines, 'פעולה', 'המערכת התחילה להכין סיכום וממצאים לתיק');
      break;
    case 'claim_synthesis_completed':
      pushDetail(lines, 'פעולה', 'המערכת השלימה הכנת סיכום וממצאים לתיק');
      break;
    case 'claim_validation_layer_started':
    case 'claim_validation_layer_completed':
    case 'claim_validation_layer_failed':
    case 'claim_validation_layer_skipped':
      pushDetail(lines, 'בדיקה', getLayerLabel(details));
      pushDetail(lines, 'משמעות', getValidationAuditMeaning(event.action));
      break;
    case 'adjuster_request_info':
      pushDetail(
        lines,
        'שאלות',
        formatCount(numberAt(details, 'questions_count'), 'שאלות נשלחו'),
      );
      break;
    case 'adjuster_decision_approve':
      pushDetail(lines, 'החלטה', 'התיק אושר על ידי מתאם תביעות');
      addStatusChange(lines, details);
      break;
    case 'adjuster_decision_reject':
    case 'claim_rejected':
      pushDetail(lines, 'סיבת דחייה', stringAt(details, 'reason'));
      pushDetail(lines, 'בסיס בפוליסה', stringAt(details, 'policy_clause'));
      pushDetail(
        lines,
        'הודעה ללקוח',
        booleanAt(details, 'customer_message_sent') === true
          ? 'נשלחה'
          : 'לא נשלחה',
      );
      addStatusChange(lines, details);
      break;
    case 'claim_status_changed':
      addStatusChange(lines, details);
      pushDetail(
        lines,
        'סיבה',
        getChangeReasonLabel(stringAt(details, 'change_reason')),
      );
      break;
    case 'claim_rejection_email_failed':
      pushDetail(lines, 'סיבת דחייה', stringAt(details, 'reason'));
      pushDetail(lines, 'בסיס בפוליסה', stringAt(details, 'policy_clause'));
      pushDetail(lines, 'תוצאה', 'שליחת הודעת הדחייה נכשלה והסטטוס לא עודכן');
      break;
  }

  if (lines.length === 0) {
    addStatusChange(lines, details);
  }

  return lines;
}

function addStatusChange(
  lines: AuditDetailLine[],
  details: Record<string, unknown>,
) {
  const previous =
    stringAt(details, 'previous_status') ?? stringAt(details, 'from_status');
  const next =
    stringAt(details, 'new_status') ?? stringAt(details, 'to_status');

  pushDetail(lines, 'סטטוס קודם', formatClaimStatus(previous));
  pushDetail(lines, 'סטטוס חדש', formatClaimStatus(next));
}

function getLayerLabel(details: Record<string, unknown>): string | null {
  const layerId = stringAt(details, 'layer_id') ?? stringAt(details, 'layerId');
  if (layerId === '11.1') return 'בדיקת זהות ושמות במסמכים';
  if (layerId === '11.2') return 'בדיקת תאריכים ותקופת כיסוי';
  if (layerId === '11.3') return 'בדיקת סכומים ומטבע';
  return layerId ? 'בדיקת תיק' : null;
}

function getValidationAuditMeaning(action: string): string {
  if (action.endsWith('_started')) return 'בדיקת התיק התחילה';
  if (action.endsWith('_failed')) return 'בדיקת התיק נכשלה ונדרש אימות ידני';
  if (action.endsWith('_skipped')) return 'בדיקת התיק דולגה בגלל מידע חסר';
  return 'בדיקת התיק הושלמה ונשמרה בתיק';
}

function getSourceLabel(source: string | null): string | null {
  if (!source) return null;
  if (source === 'intake_form') return 'טופס פתיחת תיק';
  return 'מערכת';
}

function getChangeReasonLabel(reason: string | null): string | null {
  if (!reason) return null;
  if (reason === 'claim_rejected') return 'דחיית תיק';
  return 'עדכון סטטוס';
}

function formatClaimStatus(status: string | null): string | null {
  if (!status) return null;
  return (
    CLAIM_STATUS_LABELS[status as keyof typeof CLAIM_STATUS_LABELS] ?? status
  );
}

function pushDetail(
  lines: AuditDetailLine[],
  label: string,
  value: string | null | undefined,
) {
  if (!value) return;
  lines.push({ label, value });
}

function formatCount(value: number | null, label: string): string | null {
  if (value === null) return null;
  return `${value} ${label}`;
}

function stringAt(
  details: Record<string, unknown>,
  key: string,
): string | null {
  const value = details[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function numberAt(
  details: Record<string, unknown>,
  key: string,
): number | null {
  const value = details[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function booleanAt(
  details: Record<string, unknown>,
  key: string,
): boolean | null {
  const value = details[key];
  return typeof value === 'boolean' ? value : null;
}

function hasDetail(
  details: Record<string, unknown> | null,
  key: string,
): boolean {
  return Boolean(details && key in details);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
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
