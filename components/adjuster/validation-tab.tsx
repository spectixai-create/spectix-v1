'use client';

import type { ClaimValidation } from '@/lib/types';
import { EMPTY_STATES, VALIDATION_STATUS_LABELS } from '@/lib/ui/strings-he';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export function ValidationTab({
  validations,
}: Readonly<{
  validations: ClaimValidation[];
}>) {
  if (validations.length === 0) {
    return <EmptyState text={EMPTY_STATES.validations} />;
  }

  return (
    <div className="space-y-3">
      {validations.map((validation) => (
        <details key={validation.id} className="rounded-md border bg-card p-4">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">שכבה {validation.layerId}</h3>
              <Badge
                variant={
                  validation.status === 'failed' ? 'destructive' : 'outline'
                }
              >
                {VALIDATION_STATUS_LABELS[validation.status]}
              </Badge>
            </div>
          </summary>
          <pre className="mt-3 overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(validation.payload, null, 2)}
          </pre>
        </details>
      ))}
    </div>
  );
}

function EmptyState({ text }: Readonly<{ text: string }>) {
  return (
    <Card>
      <CardContent className="p-6 text-center text-sm text-muted-foreground">
        {text}
      </CardContent>
    </Card>
  );
}
