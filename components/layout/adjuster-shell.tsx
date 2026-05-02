import { requireUser } from '@/lib/auth/server';
import { AdjusterShellClient } from '@/components/layout/adjuster-shell-client';

export async function AdjusterShell({
  children,
  className,
  publicAccess = false,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
  publicAccess?: boolean;
}>) {
  const user = publicAccess ? null : await requireUser();
  const userEmail = user?.email ?? null;

  return (
    <AdjusterShellClient className={className} userEmail={userEmail}>
      {children}
    </AdjusterShellClient>
  );
}
