import { CalendarDays, FileText, Gauge } from 'lucide-react';
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
        <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[520px]">
          <HeaderMetric
            icon={<Gauge className="h-4 w-4" aria-hidden="true" />}
            label="ציון מוכנות"
            value={readinessScore?.score ?? 'אין'}
            className={getScoreBandClass(readinessScore?.score ?? null)}
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
