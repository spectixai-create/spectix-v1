import { cn } from '@/lib/utils';

export function PageShell({
  className,
  size = 'xl',
  children,
}: Readonly<{
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
}>) {
  const maxWidth = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-5xl',
    xl: 'max-w-screen-xl',
    full: 'max-w-none',
  }[size];

  return (
    <main className={cn('container mx-auto px-4 py-6', maxWidth, className)}>
      {children}
    </main>
  );
}
