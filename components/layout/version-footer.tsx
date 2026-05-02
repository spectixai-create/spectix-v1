import { getVersionString } from '@/lib/version';
import { cn } from '@/lib/utils';

export function VersionFooter({
  className,
}: Readonly<{
  className?: string;
}>) {
  const commitSha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? 'dev';

  return (
    <footer
      className={cn(
        'w-full px-4 py-4 text-center font-latin text-xs text-muted-foreground sm:text-sm',
        className,
      )}
      title={commitSha}
      aria-label="גרסת מערכת"
    >
      {getVersionString()}
    </footer>
  );
}
