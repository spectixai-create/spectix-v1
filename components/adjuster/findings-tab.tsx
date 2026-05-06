'use client';

import type { BriefFinding } from '@/lib/adjuster/types';
import { EMPTY_STATES, FINDING_CATEGORY_LABELS } from '@/lib/ui/strings-he';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const severityLabel = {
  high: 'גבוה',
  medium: 'בינוני',
  low: 'נמוך',
} as const;

export function FindingsTab({
  findings,
}: Readonly<{
  findings: BriefFinding[];
}>) {
  if (findings.length === 0) {
    return <EmptyState text={EMPTY_STATES.findings} />;
  }

  return (
    <div className="space-y-3">
      {findings.map((finding) => (
        <details
          key={finding.id}
          className="rounded-md border bg-card p-4 open:shadow-sm"
        >
          <summary className="cursor-pointer list-none space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">{finding.title}</h3>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {FINDING_CATEGORY_LABELS[finding.category] ??
                    finding.category}
                </Badge>
                <Badge
                  variant={
                    finding.severity === 'high' ? 'destructive' : 'secondary'
                  }
                >
                  {severityLabel[finding.severity]}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {finding.description}
            </p>
          </summary>
          <div className="mt-4 rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">ראיות בטוחות</p>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap font-mono text-xs">
              {JSON.stringify(finding.evidence, null, 2)}
            </pre>
          </div>
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
