'use client';

import type { ClaimDetailSnapshot } from '@/lib/adjuster/types';
import { BRIEF_TABS } from '@/lib/ui/strings-he';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuditTab } from '@/components/adjuster/audit-tab';
import { DocumentsTab } from '@/components/adjuster/documents-tab';
import { FindingsTab } from '@/components/adjuster/findings-tab';
import { QuestionsList } from '@/components/adjuster/questions-list';
import { ValidationTab } from '@/components/adjuster/validation-tab';

export function ClaimBriefTabs({
  snapshot,
}: Readonly<{
  snapshot: ClaimDetailSnapshot;
}>) {
  const tabCounts = {
    findings: snapshot.findings.length,
    documents: snapshot.documents.length,
    validation: snapshot.validations.length,
    audit: snapshot.auditLog.length,
  } as const;

  return (
    <Tabs defaultValue="findings" dir="rtl" className="space-y-4">
      <TabsList className="grid h-auto w-full grid-cols-2 md:w-auto md:grid-cols-4">
        <TabsTrigger value="findings">
          <TabLabel label={BRIEF_TABS.findings} count={tabCounts.findings} />
        </TabsTrigger>
        <TabsTrigger value="documents">
          <TabLabel label={BRIEF_TABS.documents} count={tabCounts.documents} />
        </TabsTrigger>
        <TabsTrigger value="validation">
          <TabLabel
            label={BRIEF_TABS.validation}
            count={tabCounts.validation}
          />
        </TabsTrigger>
        <TabsTrigger value="audit">
          <TabLabel label={BRIEF_TABS.audit} count={tabCounts.audit} />
        </TabsTrigger>
      </TabsList>
      <TabsContent value="findings" className="space-y-4">
        <FindingsTab findings={snapshot.findings} />
        <QuestionsList
          claimId={snapshot.claim.id}
          claimContact={{
            claimantEmail: snapshot.claim.claimantEmail,
            claimantPhone: snapshot.claim.claimantPhone,
          }}
          questions={snapshot.questions}
        />
      </TabsContent>
      <TabsContent value="documents">
        <DocumentsTab documents={snapshot.documents} />
      </TabsContent>
      <TabsContent value="validation">
        <ValidationTab validations={snapshot.validations} />
      </TabsContent>
      <TabsContent value="audit">
        <AuditTab auditLog={snapshot.auditLog} />
      </TabsContent>
    </Tabs>
  );
}

function TabLabel({
  label,
  count,
}: Readonly<{
  label: string;
  count: number;
}>) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <span className="font-latin text-xs text-muted-foreground">
        ({count})
      </span>
    </span>
  );
}
