import { DraftLegalContent } from '@/components/legal/draft-legal-content';
import { PageShell } from '@/components/layout/page-shell';
import { VersionFooter } from '@/components/layout/version-footer';

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageShell size="md" className="max-w-3xl flex-1 py-10">
        <DraftLegalContent kind="terms" />
      </PageShell>
      <VersionFooter className="mt-auto" />
    </div>
  );
}
