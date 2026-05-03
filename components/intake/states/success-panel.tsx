'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

import { DocumentUploader } from '@/components/intake/document-uploader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Claim } from '@/lib/types';

export function SuccessPanel({
  claim,
}: Readonly<{
  claim?: Claim;
}>) {
  const router = useRouter();
  const displayNumber = claim?.claimNumber ?? '2024-XXXX';
  const uploadClaimId = claim?.id && isUuid(claim.id) ? claim.id : null;

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
        {uploadClaimId ? (
          <section className="w-full max-w-2xl space-y-3 text-start">
            <div className="space-y-1 text-center sm:text-start">
              <h3 className="text-lg font-semibold">מסמכים תומכים</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                אפשר להעלות עד 50 מסמכים. גודל מקסימלי 4 MB לקובץ. סוגים נתמכים:
                PDF, JPEG, PNG.
              </p>
            </div>
            <DocumentUploader claimId={uploadClaimId} />
          </section>
        ) : null}
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
