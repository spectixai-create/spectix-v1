import Link from 'next/link';
import { PageShell } from '@/components/layout/page-shell';
import { VersionFooter } from '@/components/layout/version-footer';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PageShell className="flex max-w-4xl flex-1 flex-col items-center justify-center gap-8 text-center">
        <div className="space-y-5">
          <p className="font-latin text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Spectix
          </p>
          <h1 className="font-heb text-4xl font-semibold leading-tight tracking-normal sm:text-5xl">
            תביעות ביטוח נסיעות, מאורגנות. בדקות.
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
            Spectix מארגנת את התיק, מזהה חוסרים ואי-התאמות, ומכינה שאלות השלמה
            לתובע. ההחלטה תמיד נשארת אצל הנציג.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/new">פתח תיק חדש</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">כניסת נציג</Link>
          </Button>
        </div>
      </PageShell>
      <VersionFooter className="mt-auto" />
    </div>
  );
}
