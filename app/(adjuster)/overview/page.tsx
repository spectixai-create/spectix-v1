import { fetchClaimsList } from '@/lib/adjuster/data';
import { requireUser } from '@/lib/auth/server';
import { ManagerOverviewDashboard } from '@/components/adjuster/manager-overview-dashboard';
import { AdjusterShell } from '@/components/layout/adjuster-shell';
import { PageHeader } from '@/components/layout/page-header';
import { VersionFooter } from '@/components/layout/version-footer';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  await requireUser();

  const claims = await fetchClaimsList({
    status: 'all',
    sort: 'newest',
    page: 1,
    pageSize: 100,
  });

  return (
    <AdjusterShell>
      <div className="space-y-6">
        <PageHeader
          title="דשבורד"
          description="תמונת מצב ניהולית של פעילות התיקים, SLA וסיבות בדיקה"
        />
        <ManagerOverviewDashboard data={claims} />
        <VersionFooter />
      </div>
    </AdjusterShell>
  );
}
