import Link from 'next/link';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <PageShell className="flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 text-center">
      <div className="space-y-3">
        <p className="font-latin text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Spectix
        </p>
        <h1 className="text-4xl font-semibold tracking-normal sm:text-5xl">
          Spectix
        </h1>
        <p className="text-muted-foreground">
          מערכת ניהול וחקירת תביעות ביטוח נסיעות
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/new">פתיחת תיק חדש</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">מסך נציג</Link>
        </Button>
      </div>
    </PageShell>
  );
}
