'use client';

import { useRouter } from 'next/navigation';
import { ArrowUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { RiskBadge } from '@/components/risk/risk-band';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SampleClaimRow } from '@/components/dashboard/sample-rows';

const statusVariant: Record<
  SampleClaimRow['status'],
  React.ComponentProps<typeof Badge>['variant']
> = {
  פתוח: 'secondary',
  בעיבוד: 'risk-yellow',
  'ממתין לתשובה': 'risk-orange',
  סיים: 'risk-green',
};

const headers = [
  'מספר תיק',
  'מבוטח',
  'מדינה',
  'סכום',
  'סיכון',
  'Pass Status',
  'סטטוס',
  'תאריך',
] as const;

export function ClaimsTable({
  claims,
}: Readonly<{
  claims: SampleClaimRow[];
}>) {
  const router = useRouter();

  function openClaim(id: string) {
    router.push(`/claim/${id}`);
  }

  return (
    <section className="space-y-3" aria-label="טבלת תיקים">
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table className="min-w-[920px]">
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header}>
                  <span className="inline-flex items-center gap-1">
                    {header}
                    <ArrowUpDown
                      className="h-3.5 w-3.5 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {claims.map((claim) => (
              <TableRow
                key={claim.id}
                tabIndex={0}
                data-testid={`claim-row-${claim.id}`}
                aria-label={`פתיחת תיק ${claim.id}`}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => openClaim(claim.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openClaim(claim.id);
                  }
                }}
              >
                <TableCell className="num font-latin font-medium">
                  {claim.id}
                </TableCell>
                <TableCell>
                  <span
                    className="block max-w-44 truncate font-medium"
                    title={claim.claimantName}
                  >
                    {claim.claimantName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {claim.claimType}
                  </span>
                </TableCell>
                <TableCell>{claim.country}</TableCell>
                <TableCell>
                  <span className="num block font-latin">
                    ₪{formatAmount(claim.amountIls)}
                  </span>
                  <span className="num block font-latin text-xs text-muted-foreground">
                    {claim.originalAmount}
                  </span>
                </TableCell>
                <TableCell>
                  <RiskBadge band={claim.riskBand} />
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      claim.passStatus.includes('בעיבוד')
                        ? 'risk-yellow'
                        : 'outline'
                    }
                    className={cn(
                      claim.passStatus === 'ממתין לתשובה' &&
                        'border-risk-orange text-risk-orange',
                    )}
                  >
                    {claim.passStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[claim.status]}>
                    {claim.status}
                  </Badge>
                </TableCell>
                <TableCell className="num font-latin">
                  {formatDate(claim.date)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function formatAmount(value: number) {
  return new Intl.NumberFormat('he-IL').format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}
