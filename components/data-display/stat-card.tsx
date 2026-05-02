import type { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  trend,
  className,
}: Readonly<{
  label: string;
  value: React.ReactNode;
  helper?: string;
  icon?: LucideIcon;
  trend?: React.ReactNode;
  className?: string;
}>) {
  return (
    <Card className={className}>
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-normal">{value}</p>
          {helper ? (
            <p className="text-xs text-muted-foreground">{helper}</p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-3">
          {Icon ? (
            <div className="rounded-md bg-muted p-2 text-muted-foreground">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
          ) : null}
          {trend ? <div className="text-xs">{trend}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}
