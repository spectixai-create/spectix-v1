import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { RiskBadge } from '@/components/risk/risk-band';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { SamplePass } from '@/lib/sample-data/sample-claim';

const eventIcons = {
  complete: CheckCircle2,
  warning: AlertTriangle,
  progress: Circle,
};

const eventTone = {
  complete: 'text-risk-green',
  warning: 'text-risk-orange',
  progress: 'text-muted-foreground',
};

export function TabTimeline({
  passes,
}: Readonly<{
  passes: SamplePass[];
}>) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">
          ציר זמן הטיפול בתיק - מה השתנה בין pass-ים
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          כל בלוק מציג את תוצאת ה-pass ואת השינויים שנוספו לבריף.
        </p>
      </div>
      <div className="relative space-y-4 ps-6 before:absolute before:bottom-4 before:start-2 before:top-4 before:w-px before:bg-border">
        {passes.map((pass) => (
          <Card
            key={pass.id}
            className={cn(
              'relative',
              pass.status === 'skipped' && 'bg-muted/40 text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'absolute start-[-1.15rem] top-6 h-3 w-3 rounded-full border-2 border-background',
                pass.status === 'skipped' ? 'bg-muted' : 'bg-primary',
              )}
              aria-hidden="true"
            />
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    Pass {pass.passNumber} - {pass.title}
                  </h3>
                  <p className="num font-latin text-sm text-muted-foreground">
                    {formatTime(pass.startedAt)} - {formatTime(pass.endedAt)} ·{' '}
                    {pass.durationSeconds} שניות
                  </p>
                </div>
                {pass.status === 'skipped' ? (
                  <Badge variant="secondary">דולג</Badge>
                ) : (
                  <RiskBadge band={pass.riskBand} />
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="outline">ממצאים: {pass.findingsCount}</Badge>
                <Badge variant="outline">חסרים: {pass.gapsCount}</Badge>
              </div>
              {pass.skipReason ? (
                <p className="rounded-md bg-background p-3 text-sm">
                  {pass.skipReason}
                </p>
              ) : null}
              <ul className="space-y-2">
                {pass.events.map((event) => {
                  const Icon = eventIcons[event.type];

                  return (
                    <li key={event.text} className="flex gap-2 text-sm">
                      <Icon
                        className={cn(
                          'mt-0.5 h-4 w-4 shrink-0',
                          eventTone[event.type],
                        )}
                        aria-hidden="true"
                      />
                      <span>{event.text}</span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(value));
}
