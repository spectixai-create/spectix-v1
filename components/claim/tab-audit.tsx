import { EmptyState } from '@/components/states/empty-state';
import { InfoRow } from '@/components/data-display/info-row';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SampleAuditEntry } from '@/lib/sample-data/sample-claim';

export function TabAudit({
  entries,
  empty,
}: Readonly<{
  entries: SampleAuditEntry[];
  empty: boolean;
}>) {
  if (empty) {
    return (
      <EmptyState
        title="אין אירועי ביקורת"
        description="אירועי מערכת ומשתמשים יוצגו כאן לאחר יצירת פעילות בתיק."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">יומן ביקורת</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {groupByDate(entries).map((group) => (
            <section
              key={group.date}
              aria-label={`אירועים מתאריך ${group.date}`}
            >
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                {group.date}
              </h3>
              <dl className="rounded-md border">
                {group.entries.map((entry) => (
                  <InfoRow
                    key={entry.id}
                    label={
                      <span className="num font-latin">
                        {formatTime(entry.timestamp)}
                      </span>
                    }
                    value={
                      <span>
                        <span className="font-semibold">{entry.actor}</span> -{' '}
                        {entry.action}
                      </span>
                    }
                    className="px-4"
                  />
                ))}
              </dl>
            </section>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function groupByDate(entries: SampleAuditEntry[]) {
  const groups = new Map<string, SampleAuditEntry[]>();

  for (const entry of entries) {
    const date = new Intl.DateTimeFormat('he-IL', {
      dateStyle: 'full',
      timeZone: 'UTC',
    }).format(new Date(entry.timestamp));
    groups.set(date, [...(groups.get(date) ?? []), entry]);
  }

  return Array.from(groups, ([date, groupedEntries]) => ({
    date,
    entries: groupedEntries,
  }));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(value));
}
