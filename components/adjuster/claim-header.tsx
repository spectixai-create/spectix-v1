import {
  CalendarDays,
  ClipboardCheck,
  FileText,
  Gauge,
  ShieldCheck,
} from 'lucide-react';
import type { ReactNode } from 'react';

import type { ClaimDetailSnapshot } from '@/lib/adjuster/types';
import { getScoreBandClass } from '@/lib/ui/status-badges';
import { getClaimTypeLabel } from '@/lib/ui/strings-he';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ClaimStatusBadge } from '@/components/adjuster/claim-status-badge';

export function ClaimHeader({
  snapshot,
}: Readonly<{
  snapshot: ClaimDetailSnapshot;
}>) {
  const { claim, readinessScore } = snapshot;

  return (
    <Card>
      <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <ClaimStatusBadge status={claim.status} />
            {claim.escalatedToInvestigator ? (
              <Badge variant="destructive">הועבר לחוקר</Badge>
            ) : null}
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-normal">
              {claim.insuredName ?? claim.claimantName ?? 'מבוטח לא ידוע'}
            </h2>
            <p className="text-sm text-muted-foreground">
              תיק {claim.claimNumber} ·{' '}
              {getClaimTypeLabel(claim.claimType, 'סוג תביעה לא סווג')}
            </p>
          </div>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:min-w-[680px] xl:grid-cols-5">
          <HeaderMetric
            icon={<Gauge className="h-4 w-4" aria-hidden="true" />}
            label="ציון מוכנות"
            value={readinessScore?.score ?? 'אין'}
            className={getScoreBandClass(readinessScore?.score ?? null)}
          />
          <HeaderMetric
            icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            label="רמת בדיקה נדרשת"
            value={getReviewLevelLabel(snapshot)}
          />
          <HeaderMetric
            icon={<ClipboardCheck className="h-4 w-4" aria-hidden="true" />}
            label="סטטוס כיסוי ראשוני"
            value={getPreliminaryCoverageStatusLabel(claim.metadata)}
          />
          <HeaderMetric
            icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
            label="תאריך אירוע"
            value={
              claim.incidentDate ? formatDate(claim.incidentDate) : 'לא צוין'
            }
          />
          <HeaderMetric
            icon={<FileText className="h-4 w-4" aria-hidden="true" />}
            label="מסמכים"
            value={snapshot.documents.length}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function HeaderMetric({
  icon,
  label,
  value,
  className,
}: Readonly<{
  icon: ReactNode;
  label: string;
  value: ReactNode;
  className?: string;
}>) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={
          className ? `mt-2 rounded-md px-2 py-1 ${className}` : 'mt-2'
        }
      >
        <span className="font-latin text-lg font-semibold">{value}</span>
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('he-IL').format(new Date(value));
}

function getReviewLevelLabel(snapshot: ClaimDetailSnapshot): string {
  const metadata = snapshot.claim.metadata;
  const explicitLevel =
    metadata && typeof metadata === 'object'
      ? readString(metadata, 'review_level')
      : null;

  if (explicitLevel === 'standard') return 'רגילה';
  if (explicitLevel === 'enhanced') return 'מוגברת';
  if (explicitLevel === 'investigator') return 'חוקר';
  if (snapshot.claim.escalatedToInvestigator) return 'חוקר';
  if (
    snapshot.claim.riskBand === 'red' ||
    snapshot.claim.riskBand === 'orange'
  ) {
    return 'מוגברת';
  }
  if (
    snapshot.claim.riskBand === 'yellow' ||
    snapshot.claim.riskBand === 'green'
  ) {
    return 'רגילה';
  }

  return 'לא נקבע';
}

function getPreliminaryCoverageStatusLabel(metadata: unknown): string {
  const value =
    metadata && typeof metadata === 'object'
      ? readString(metadata, 'preliminary_coverage_status')
      : null;

  if (value === 'likely_covered') return 'נראה מכוסה';
  if (value === 'needs_exclusion_review') return 'דורש בדיקת חריגים';
  if (value === 'missing_information') return 'חסר מידע לכיסוי';
  if (value === 'likely_not_covered') return 'לא נראה מכוסה';

  return 'לא נבדק';
}

function readString(value: object, key: string): string | null {
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === 'string' ? candidate : null;
}
