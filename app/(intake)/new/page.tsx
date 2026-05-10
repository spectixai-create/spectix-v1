import { IntakeForm } from '@/components/intake/intake-form';
import type { IntakeDemoState } from '@/components/intake/types';
import { PageShell } from '@/components/layout/page-shell';
import { VersionFooter } from '@/components/layout/version-footer';

function getDemoState(value: string | string[] | undefined) {
  if (value === 'success' || value === 'error') {
    return value;
  }

  return undefined;
}

export default function NewClaimPage({
  searchParams,
}: Readonly<{
  searchParams?: { state?: string | string[] };
}>) {
  const initialDemoState = getDemoState(searchParams?.state);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto max-w-3xl px-4 py-4">
          <p className="font-semibold">Spectix</p>
        </div>
      </header>
      <PageShell size="md" className="max-w-3xl flex-1 space-y-6">
        <div className="space-y-2 text-start">
          <p className="text-sm font-medium text-muted-foreground">
            פתיחת תיק ציבורי
          </p>
          <h1 className="font-heb text-3xl font-semibold tracking-normal">
            פתיחת תיק חדש
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            מלא את הפרטים כדי לפתוח תיק. לאחר קבלת מספר התיק תוכל להעלות מסמכים
            תומכים.
          </p>
        </div>
        <IntakeForm initialDemoState={initialDemoState} />
      </PageShell>
      <VersionFooter className="mt-auto" />
    </div>
  );
}
