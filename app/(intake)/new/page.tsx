import { PageShell } from '@/components/layout/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function NewClaimPage() {
  return (
    <PageShell className="flex min-h-screen max-w-2xl flex-col justify-center">
      <div className="space-y-6 text-right">
        <div className="space-y-3">
          <Badge variant="risk-orange">כתום</Badge>
          <h1 className="font-heb text-3xl font-semibold tracking-normal">
            פתיחת תיק חדש
          </h1>
          <p className="text-muted-foreground">
            הטופס יבנה בספייק 02 לאחר עיצוב
          </p>
        </div>
        <div className="space-y-2 rounded-md border bg-card p-4 text-card-foreground">
          <p>
            תיק <span className="num font-latin">2024-001</span> - סכום{' '}
            <span className="num font-latin">₪1,234.56</span>
          </p>
          <p>
            מזהה בדיקה{' '}
            <span className="ltr-isolate font-latin text-sm">
              https://example.com/claims/INTAKE-2024-001
            </span>
          </p>
        </div>
        <Button>שלח</Button>
      </div>
    </PageShell>
  );
}
