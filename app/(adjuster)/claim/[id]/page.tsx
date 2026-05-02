import { AdjusterShell } from '@/components/layout/adjuster-shell';
import { PageHeader } from '@/components/layout/page-header';
import { ClaimTabs } from '@/components/claim/claim-tabs';
import { sampleClaim } from '@/lib/sample-data/sample-claim';

export default function ClaimPage({
  params,
}: Readonly<{
  params: { id: string };
}>) {
  return (
    <AdjusterShell>
      <div className="space-y-6">
        <PageHeader title={`תיק ${params.id}`} description="בריף חקירתי" />
        <ClaimTabs sample={sampleClaim} />
      </div>
    </AdjusterShell>
  );
}
