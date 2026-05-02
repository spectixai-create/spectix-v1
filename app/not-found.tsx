import { FileQuestion } from 'lucide-react';

import { VersionFooter } from '@/components/layout/version-footer';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center">
          <FileQuestion
            className="h-14 w-14 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-normal">
              הדף לא נמצא
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              הקישור שגוי או שהדף הוסר.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2">
            <Button asChild className="min-h-11">
              <a href="/dashboard">חזרה לדשבורד</a>
            </Button>
            <Button asChild variant="secondary" className="min-h-11">
              <a href="/new">פתיחת תיק חדש</a>
            </Button>
          </div>
        </div>
      </main>
      <VersionFooter className="mt-auto" />
    </div>
  );
}
