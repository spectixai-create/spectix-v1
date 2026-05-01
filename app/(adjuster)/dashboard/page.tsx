import { PageShell } from '@/components/layout/page-shell';

export default function DashboardPage() {
  return (
    <PageShell>
      <div className="space-y-3 text-right">
        <h1 className="text-3xl font-semibold tracking-normal">תור עבודה</h1>
        <p className="text-muted-foreground">הדשבורד יבנה בספייק 20</p>
      </div>
    </PageShell>
  );
}
