import { cn } from '@/lib/utils';

export function Tag({
  children,
  tone = 'neutral',
  className,
}: Readonly<{
  children: React.ReactNode;
  tone?: 'neutral' | 'info' | 'success' | 'warning';
  className?: string;
}>) {
  const tones = {
    neutral: 'border-border bg-muted text-foreground',
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
