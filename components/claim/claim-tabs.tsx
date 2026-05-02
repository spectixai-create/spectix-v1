'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TabAudit } from '@/components/claim/tab-audit';
import { TabBrief } from '@/components/claim/tab-brief';
import { TabDocuments } from '@/components/claim/tab-documents';
import { TabTimeline } from '@/components/claim/tab-timeline';
import type { SampleClaim } from '@/lib/sample-data/sample-claim';

const tabKeys = ['brief', 'timeline', 'documents', 'audit'] as const;
type ClaimTabKey = (typeof tabKeys)[number];

const labels: Record<ClaimTabKey, string> = {
  brief: 'בריף',
  timeline: 'ציר Pass-ים',
  documents: 'מסמכים',
  audit: 'יומן ביקורת',
};

function isClaimTabKey(value: string | null): value is ClaimTabKey {
  return value !== null && (tabKeys as readonly string[]).includes(value);
}

export function ClaimTabs({ sample }: Readonly<{ sample: SampleClaim }>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const emptyMode = searchParams.get('empty') === 'true';
  const activeTab = isClaimTabKey(tab) ? tab : 'brief';

  function handleTabChange(nextTab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', nextTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="space-y-5"
      dir="rtl"
    >
      <TabsList className="h-auto flex-wrap justify-start gap-1">
        {tabKeys.map((key) => (
          <TabsTrigger key={key} value={key}>
            {labels[key]}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="brief">
        <TabBrief sample={sample} />
      </TabsContent>
      <TabsContent value="timeline">
        <TabTimeline passes={sample.passes} />
      </TabsContent>
      <TabsContent value="documents">
        <TabDocuments documents={sample.documents} empty={emptyMode} />
      </TabsContent>
      <TabsContent value="audit">
        <TabAudit entries={sample.auditEntries} empty={emptyMode} />
      </TabsContent>
    </Tabs>
  );
}
