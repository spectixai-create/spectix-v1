'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowUpDown, Search } from 'lucide-react';

import type { ClaimListResponse } from '@/lib/adjuster/types';
import { getScoreBandClass } from '@/lib/ui/status-badges';
import {
  EMPTY_STATES,
  FINDING_CATEGORY_LABELS,
  getClaimTypeLabel,
} from '@/lib/ui/strings-he';
import type { RiskBand } from '@/lib/types';
import { Tag } from '@/components/data-display/tag';
import { RiskBadge } from '@/components/risk/risk-band';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClaimStatusBadge } from '@/components/adjuster/claim-status-badge';

const headers = [
  'מספר תיק',
  'מבוטח',
  'סוג',
  'סכום',
  'ציון',
  'רמת סיכון',
  'ממצא מוביל',
  'ימים פתוח',
  'סטטוס',
] as const;

const severityLabel = {
  high: 'גבוה',
  medium: 'בינוני',
  low: 'נמוך',
} as const;

const severityVariant = {
  high: 'destructive',
  medium: 'risk-orange',
  low: 'secondary',
} as const;

export function ClaimsListTable({
  data,
}: Readonly<{
  data: ClaimListResponse;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === 'all') {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <section className="space-y-4" aria-label="רשימת תיקים">
      <form
        className="grid gap-3 border-b pb-4 md:grid-cols-[1fr_180px_180px]"
        action={pathname}
      >
        <label className="relative block">
          <Search
            className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            name="search"
            placeholder="חיפוש לפי מספר תיק, שם, פוליסה או יעד"
            className="pr-9"
            defaultValue={searchParams.get('search') ?? ''}
          />
        </label>
        <Select
          dir="rtl"
          defaultValue={searchParams.get('status') ?? 'all'}
          onValueChange={(value) => updateParam('status', value)}
        >
          <SelectTrigger aria-label="סינון לפי סטטוס">
            <SelectValue placeholder="כל הסטטוסים" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            <SelectItem value="ready">מוכן להחלטה</SelectItem>
            <SelectItem value="pending_info">ממתין למידע</SelectItem>
            <SelectItem value="errored">שגיאת מערכת</SelectItem>
            <SelectItem value="cost_capped">תקרת עלות</SelectItem>
            <SelectItem value="reviewed">נבדק</SelectItem>
          </SelectContent>
        </Select>
        <Select
          dir="rtl"
          defaultValue={searchParams.get('sort') ?? 'newest'}
          onValueChange={(value) => updateParam('sort', value)}
        >
          <SelectTrigger aria-label="מיון תיקים">
            <SelectValue placeholder="מיון" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">חדש לישן</SelectItem>
            <SelectItem value="oldest">ישן לחדש</SelectItem>
            <SelectItem value="score_desc">ציון גבוה לנמוך</SelectItem>
            <SelectItem value="days_open_desc">ימים פתוח</SelectItem>
          </SelectContent>
        </Select>
      </form>

      <div className="overflow-x-auto rounded-md border bg-card">
        <Table className="min-w-[980px]">
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
            {data.items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={headers.length}
                  className="h-24 text-center"
                >
                  {EMPTY_STATES.claims}
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((claim) => (
                <TableRow
                  key={claim.id}
                  tabIndex={0}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => router.push(`/claim/${claim.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      router.push(`/claim/${claim.id}`);
                    }
                  }}
                >
                  <TableCell className="font-latin font-medium">
                    {claim.claimNumber}
                  </TableCell>
                  <TableCell>
                    <span className="block max-w-44 truncate font-medium">
                      {claim.insuredName ?? claim.claimantName ?? 'לא ידוע'}
                    </span>
                    {claim.escalatedToInvestigator ? (
                      <Tag tone="warning" className="mt-1">
                        הועבר לחוקר
                      </Tag>
                    ) : null}
                  </TableCell>
                  <TableCell>{getClaimTypeLabel(claim.claimType)}</TableCell>
                  <TableCell className="font-latin">
                    {formatCurrency(claim.amountClaimed, claim.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getScoreBandClass(claim.readinessScore)}
                    >
                      {claim.readinessScore ?? 'אין'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {isRiskBand(claim.riskBand) ? (
                      <RiskBadge band={claim.riskBand} />
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        לא נקבע
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {claim.topFindingCategory ? (
                      <div className="flex flex-wrap gap-2">
                        <Tag>
                          {FINDING_CATEGORY_LABELS[claim.topFindingCategory] ??
                            claim.topFindingCategory}
                        </Tag>
                        {claim.topFindingSeverity ? (
                          <Badge
                            variant={severityVariant[claim.topFindingSeverity]}
                          >
                            {severityLabel[claim.topFindingSeverity]}
                          </Badge>
                        ) : null}
                      </div>
                    ) : (
                      'אין'
                    )}
                  </TableCell>
                  <TableCell className="font-latin">{claim.daysOpen}</TableCell>
                  <TableCell>
                    <ClaimStatusBadge status={claim.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">
        מוצגים {data.items.length} מתוך {data.total} תיקים
      </p>
    </section>
  );
}

function formatCurrency(amount: number | null, currency: string): string {
  if (amount === null) return 'לא צוין';

  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function isRiskBand(value: string | null): value is RiskBand {
  return (
    value === 'green' ||
    value === 'yellow' ||
    value === 'orange' ||
    value === 'red'
  );
}
