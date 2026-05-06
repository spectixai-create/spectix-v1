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
  return (
    <Tabs defaultValue="findings" dir="rtl" className="space-y-4">
      <TabsList className="grid h-auto w-full grid-cols-2 md:w-auto md:grid-cols-4">
        <TabsTrigger value="findings">{BRIEF_TABS.findings}</TabsTrigger>
        <TabsTrigger value="documents">{BRIEF_TABS.documents}</TabsTrigger>
        <TabsTrigger value="validation">{BRIEF_TABS.validation}</TabsTrigger>
        <TabsTrigger value="audit">{BRIEF_TABS.audit}</TabsTrigger>
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
