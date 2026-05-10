import { notFound } from 'next/navigation';

import { fetchClaimDetail } from '@/lib/adjuster/data';
import { requireUser } from '@/lib/auth/server';
import { ActionPanel } from '@/components/adjuster/action-panel';
import { ClaimBriefTabs } from '@/components/adjuster/claim-brief-tabs';
import { ClaimHeader } from '@/components/adjuster/claim-header';
import { PassTimeline } from '@/components/adjuster/pass-timeline';
import { RefreshButton } from '@/components/adjuster/refresh-button';
import { AdjusterShell } from '@/components/layout/adjuster-shell';
import { DashboardBackLink } from '@/components/layout/dashboard-back-link';
import { PageHeader } from '@/components/layout/page-header';
import { VersionFooter } from '@/components/layout/version-footer';

export const dynamic = 'force-dynamic';

export default async function ClaimPage({
  params,
}: Readonly<{
  params: { id: string };
}>) {
  await requireUser();

  const snapshot = await fetchClaimDetail(params.id);

  if (!snapshot) {
    notFound();
  }

  return (
    <AdjusterShell>
      <div className="space-y-6">
        <PageHeader
          title={`תיק ${snapshot.claim.claimNumber}`}
          description="בריף מתאם מבוסס ממצאים, ולידציה וסינתזה"
          actions={
            <>
              <DashboardBackLink />
              <RefreshButton />
            </>
          }
        />
        <ClaimHeader snapshot={snapshot} />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <ClaimBriefTabs snapshot={snapshot} />
          <div className="space-y-6">
            <ActionPanel snapshot={snapshot} />
            <PassTimeline passes={snapshot.passes} />
          </div>
        </div>
        <VersionFooter />
      </div>
    </AdjusterShell>
  );
}
