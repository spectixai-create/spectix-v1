import { getVersionString } from '@/lib/version';
import { cn } from '@/lib/utils';

export function VersionFooter({
  className,
  internal = false,
}: Readonly<{
  className?: string;
  internal?: boolean;
}>) {
  const commitSha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? 'dev';
  const label = internal ? getVersionString() : 'Spectix • 2026';

  return (
    <footer
      className={cn(
        'w-full px-4 py-4 text-center font-latin text-xs text-muted-foreground sm:text-sm',
        className,
      )}
      title={internal ? commitSha : undefined}
      aria-label="גרסת מערכת"
    >
      {label}
    </footer>
  );
}
