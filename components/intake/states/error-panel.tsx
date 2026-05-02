'use client';

import { ErrorBanner } from '@/components/states/error-state';
import { Button } from '@/components/ui/button';

export function ErrorPanel({
  onRetry,
  description = 'אירעה שגיאה זמנית. נסה שוב או צור קשר עם השירות.',
}: Readonly<{
  onRetry: () => void;
  description?: string;
}>) {
  return (
    <ErrorBanner
      title="שליחת התיק נכשלה"
      description={description}
      action={
        <Button type="button" variant="outline" onClick={onRetry}>
          נסה שוב
        </Button>
      }
    />
  );
}
