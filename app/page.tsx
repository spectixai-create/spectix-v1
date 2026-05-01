export const dynamic = 'force-dynamic';

const buildSha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local';
const buildEnv = process.env.VERCEL_ENV ?? 'development';

export default function HomePage() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Spectix Claim Investigator — POC</h1>
      <p className="text-lg text-muted-foreground">
        סקאפולד התשתית עובד. אין כאן עדיין לוגיקה עסקית.
      </p>
      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <dt className="font-medium">Build</dt>
        <dd dir="ltr" className="font-mono">
          {buildSha}
        </dd>
        <dt className="font-medium">Env</dt>
        <dd dir="ltr" className="font-mono">
          {buildEnv}
        </dd>
        <dt className="font-medium">Spike</dt>
        <dd dir="ltr" className="font-mono">
          #00
        </dd>
      </dl>
    </main>
  );
}
