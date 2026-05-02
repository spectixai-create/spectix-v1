import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function SkeletonLine({
  className,
}: Readonly<{
  className?: string;
}>) {
  return (
    <div
      className={cn('h-3 animate-pulse rounded-sm bg-muted', className)}
      aria-hidden="true"
    />
  );
}

export function SkeletonBlock({
  className,
}: Readonly<{
  className?: string;
}>) {
  return (
    <div
      className={cn('h-24 animate-pulse rounded-md bg-muted', className)}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className }: Readonly<{ className?: string }>) {
  return (
    <Card className={className} aria-busy="true" aria-label="טוען תוכן">
      <CardHeader className="space-y-3">
        <SkeletonLine className="h-4 w-1/3" />
        <SkeletonLine className="w-2/3" />
      </CardHeader>
      <CardContent className="space-y-3">
        <SkeletonBlock />
        <SkeletonLine />
        <SkeletonLine className="w-4/5" />
      </CardContent>
    </Card>
  );
}

export function Spinner({
  label = 'טוען',
  className,
}: Readonly<{
  label?: string;
  className?: string;
}>) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm', className)}>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function PageLoading({
  title = 'טוען נתונים',
  description = 'המידע יופיע בעוד רגע',
}: Readonly<{
  title?: string;
  description?: string;
}>) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
      <Loader2
        className="h-8 w-8 animate-spin text-muted-foreground"
        aria-hidden="true"
      />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
