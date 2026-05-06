'use client';

import type { AuditLogView } from '@/lib/adjuster/types';
import { AUDIT_ACTION_LABELS, EMPTY_STATES } from '@/lib/ui/strings-he';
import { Card, CardContent } from '@/components/ui/card';

export function AuditTab({
  auditLog,
}: Readonly<{
  auditLog: AuditLogView[];
}>) {
  if (auditLog.length === 0) {
    return <EmptyState text={EMPTY_STATES.audit} />;
  }

  return (
    <div className="space-y-3">
      {auditLog.map((event) => (
        <details key={event.id} className="rounded-md border bg-card p-4">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">
                  {AUDIT_ACTION_LABELS[event.action] ?? event.action}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(event.createdAt)} · {event.actorType}
                </p>
              </div>
              <span className="font-latin text-xs text-muted-foreground">
                {event.actorId ?? 'system'}
              </span>
            </div>
          </summary>
          <pre className="mt-3 overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(event.details ?? {}, null, 2)}
          </pre>
        </details>
      ))}
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
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
