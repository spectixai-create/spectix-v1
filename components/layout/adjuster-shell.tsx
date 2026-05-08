import { requireUser } from '@/lib/auth/server';
import { AdjusterShellClient } from '@/components/layout/adjuster-shell-client';

export async function AdjusterShell({
  children,
  className,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  const user = await requireUser();
  const userEmail = user?.email ?? null;

  return (
    <AdjusterShellClient className={className} userEmail={userEmail}>
      {children}
    </AdjusterShellClient>
  );
}
