'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function SuccessPanel({
  claimNumber,
}: Readonly<{
  claimNumber?: string;
}>) {
  const router = useRouter();
  const displayNumber = claimNumber ?? '2024-XXXX';

  return (
    <Card className="border-risk-green/30 bg-risk-green-bg">
      <CardContent className="flex min-h-96 flex-col items-center justify-center gap-5 p-8 text-center">
        <CheckCircle2
          className="h-14 w-14 text-risk-green"
          aria-hidden="true"
        />
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-normal">
            התקבל. תודה.
          </h1>
          <p className="max-w-xl leading-7 text-muted-foreground">
            התיק שלך התקבל ומספר שיוך ייווצר תוך מספר דקות. ניצור איתך קשר אם
            יידרשו פרטים נוספים.
          </p>
        </div>
        <div
          className="rounded-md border bg-background px-4 py-3"
          data-testid="success-panel"
        >
          <span>מספר תיק: </span>
          <span className="num font-latin" data-testid="claim-number">
            {displayNumber}
          </span>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push('/new')}
        >
          פתח תיק חדש
        </Button>
      </CardContent>
    </Card>
  );
}
