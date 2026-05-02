import { cn } from '@/lib/utils';

export function InfoRow({
  label,
  value,
  className,
}: Readonly<{
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        'grid gap-1 border-b py-3 text-sm last:border-b-0 sm:grid-cols-[10rem_1fr]',
        className,
      )}
    >
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
