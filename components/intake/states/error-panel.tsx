'use client';

import { ErrorBanner } from '@/components/states/error-state';
import { Button } from '@/components/ui/button';

export function ErrorPanel({
  onRetry,
}: Readonly<{
  onRetry: () => void;
}>) {
  return (
    <ErrorBanner
      title="שליחת התיק נכשלה"
      description="אירעה שגיאה זמנית. נסה שוב או צור קשר עם השירות."
      action={
        <Button type="button" variant="outline" onClick={onRetry}>
          נסה שוב
        </Button>
      }
    />
  );
}
