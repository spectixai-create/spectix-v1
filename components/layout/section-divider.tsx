import { cn } from '@/lib/utils';

export function SectionDivider({
  title,
  description,
  className,
}: Readonly<{
  title?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}>) {
  return (
    <div className={cn('flex items-center gap-4 py-2', className)}>
      <div className="h-px flex-1 bg-border" />
      {(title || description) && (
        <div className="shrink-0 text-center">
          {title ? <h2 className="text-sm font-semibold">{title}</h2> : null}
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      )}
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
