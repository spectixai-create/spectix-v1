import { IntakeForm } from '@/components/intake/intake-form';
import type { IntakeDemoState } from '@/components/intake/types';
import { PageShell } from '@/components/layout/page-shell';

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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto max-w-3xl px-4 py-4">
          <p className="font-semibold">Spectix</p>
        </div>
      </header>
      <PageShell size="md" className="max-w-3xl space-y-6">
        <div className="space-y-2 text-start">
          <p className="text-sm font-medium text-muted-foreground">
            פתיחת תיק ציבורי
          </p>
          <h1 className="font-heb text-3xl font-semibold tracking-normal">
            פתיחת תיק חדש
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            מלא את הפרטים והעלה מסמכים ראשוניים כדי שנוכל להתחיל בבדיקת התיק.
          </p>
        </div>
        <IntakeForm initialDemoState={initialDemoState} />
      </PageShell>
    </div>
  );
}
