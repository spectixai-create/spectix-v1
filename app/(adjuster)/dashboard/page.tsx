import { fetchClaimsList } from '@/lib/adjuster/data';
import type { ClaimListQuery } from '@/lib/adjuster/types';
import { requireUser } from '@/lib/auth/server';
import { ClaimsListTable } from '@/components/adjuster/claims-list-table';
import { RefreshButton } from '@/components/adjuster/refresh-button';
import { AdjusterShell } from '@/components/layout/adjuster-shell';
import { PageHeader } from '@/components/layout/page-header';
import { VersionFooter } from '@/components/layout/version-footer';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: Readonly<{
  searchParams?: {
    status?: string;
    sort?: string;
    search?: string;
    page?: string;
    pageSize?: string;
  };
}>) {
  await requireUser();

  const query: ClaimListQuery = {
    status: (searchParams?.status ?? 'all') as ClaimListQuery['status'],
    sort: (searchParams?.sort ?? 'newest') as ClaimListQuery['sort'],
    search: searchParams?.search,
    page: Number(searchParams?.page ?? 1),
    pageSize: Number(searchParams?.pageSize ?? 25),
  };
  const claims = await fetchClaimsList(query);

  return (
    <AdjusterShell>
      <div className="space-y-6">
        <PageHeader
          title="תור עבודה"
          description="תיקים מוכנים לעיון מתאם, בקשות מידע והחלטות כיסוי"
          actions={<RefreshButton />}
        />
        <ClaimsListTable data={claims} />
        <VersionFooter />
      </div>
    </AdjusterShell>
  );
}
