import { RefreshCw } from 'lucide-react';

import { ClaimsTable } from '@/components/dashboard/claims-table';
import { DashboardEmpty } from '@/components/dashboard/dashboard-empty';
import { FilterBar } from '@/components/dashboard/filter-bar';
import { KpiRow } from '@/components/dashboard/kpi-row';
import { mockStats, sampleClaimRows } from '@/components/dashboard/sample-rows';
import { AdjusterShell } from '@/components/layout/adjuster-shell';
import { PageHeader } from '@/components/layout/page-header';
import { VersionFooter } from '@/components/layout/version-footer';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default function DashboardPage({
  searchParams,
}: Readonly<{
  searchParams?: { empty?: string };
}>) {
  const emptyMode = searchParams?.empty === 'true';

  return (
    <AdjusterShell>
      <div className="space-y-6">
        <PageHeader
          title="תור עבודה"
          description="סקלטון ניהול תיקים לנציגי תביעות"
          actions={
            <Button type="button" variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              רענון
            </Button>
          }
        />
        <KpiRow stats={mockStats} />
        <FilterBar />
        {emptyMode ? (
          <DashboardEmpty />
        ) : (
          <ClaimsTable claims={sampleClaimRows} />
        )}
        <VersionFooter />
      </div>
    </AdjusterShell>
  );
}
