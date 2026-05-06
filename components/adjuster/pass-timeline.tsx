import type { Pass } from '@/lib/types';
import { PASS_STATUS_LABELS } from '@/lib/ui/strings-he';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PassTimeline({
  passes,
}: Readonly<{
  passes: Pass[];
}>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">ציר עיבוד</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {passes.map((pass) => (
            <li key={pass.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">Pass {pass.passNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {pass.startedAt ? formatDate(pass.startedAt) : 'טרם התחיל'}
                    {pass.completedAt
                      ? ` - ${formatDate(pass.completedAt)}`
                      : ''}
                  </p>
                </div>
                <Badge
                  variant={pass.status === 'failed' ? 'destructive' : 'outline'}
                >
                  {PASS_STATUS_LABELS[pass.status]}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                עלות: ${pass.costUsd.toFixed(4)} · קריאות LLM:{' '}
                {pass.llmCallsMade}
              </p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
