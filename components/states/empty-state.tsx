import { FileSearch, Inbox, UploadCloud } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const presets = {
  claims: {
    icon: Inbox,
    title: 'אין תיקים בתור',
    description: 'כאשר תיקים חדשים יפתחו הם יופיעו כאן.',
  },
  documents: {
    icon: UploadCloud,
    title: 'אין מסמכים',
    description: 'מסמכים שיעלו לתיק יוצגו באזור זה.',
  },
  findings: {
    icon: FileSearch,
    title: 'אין ממצאים להצגה',
    description: 'ממצאים יתווספו לאחר ניתוח ראשוני של התיק.',
  },
} satisfies Record<
  string,
  { icon: LucideIcon; title: string; description: string }
>;

export type EmptyStatePreset = keyof typeof presets;

export function EmptyState({
  preset,
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon,
  className,
}: Readonly<{
  preset?: EmptyStatePreset;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
  className?: string;
}>) {
  const fallback = preset ? presets[preset] : presets.claims;
  const DisplayIcon = Icon ?? fallback.icon;

  return (
    <div
      className={cn(
        'flex min-h-48 flex-col items-center justify-center gap-4 rounded-md border border-dashed bg-card p-8 text-center',
        className,
      )}
    >
      <div className="rounded-full bg-muted p-3 text-muted-foreground">
        <DisplayIcon className="h-6 w-6" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h3 className="font-semibold">{title ?? fallback.title}</h3>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          {description ?? fallback.description}
        </p>
      </div>
      {actionLabel ? (
        <Button type="button" variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
