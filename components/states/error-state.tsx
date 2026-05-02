'use client';

import * as React from 'react';
import { AlertTriangle, CircleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function InlineError({
  message,
  className,
}: Readonly<{
  message: React.ReactNode;
  className?: string;
}>) {
  return (
    <p
      className={cn(
        'inline-flex items-center gap-2 text-sm text-destructive',
        className,
      )}
      role="alert"
    >
      <CircleAlert className="h-4 w-4" aria-hidden="true" />
      {message}
    </p>
  );
}

export function ErrorBanner({
  title = 'משהו השתבש',
  description,
  action,
  className,
}: Readonly<{
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-start text-destructive md:flex-row md:items-start md:justify-between',
        className,
      )}
      role="alert"
    >
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="space-y-1">
          <h3 className="font-semibold">{title}</h3>
          {description ? <p className="text-sm">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export class ErrorBoundary extends React.Component<
  Readonly<{ children: React.ReactNode; fallback?: React.ReactNode }>,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <ErrorBanner
            description="אפשר לרענן את הדף או לחזור למסך הקודם."
            action={
              <Button
                type="button"
                variant="outline"
                onClick={() => location.reload()}
              >
                רענון
              </Button>
            }
          />
        )
      );
    }

    return this.props.children;
  }
}
