import { cn } from '@/lib/utils';

export function PageShell({
  className,
  children,
}: Readonly<{
  className?: string;
  children: React.ReactNode;
}>) {
  return (
    <main
      className={cn('container mx-auto max-w-screen-xl px-4 py-6', className)}
    >
      {children}
    </main>
  );
}
