/**
 * Fail-fast env var check. Runs as the first step of `pnpm build` so Vercel
 * surfaces a clear, named error instead of a cryptic runtime failure.
 *
 * Required vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ANTHROPIC_API_KEY
 *
 * Optional in dev (warned only): INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY.
 * Required in production (Vercel): all of the above.
 *
 * Run with: pnpm check-env
 */

const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
] as const;

const REQUIRED_IN_PROD = ['INNGEST_EVENT_KEY', 'INNGEST_SIGNING_KEY'] as const;

const isProd =
  process.env.VERCEL_ENV === 'production' ||
  process.env.VERCEL_ENV === 'preview' ||
  process.env.NODE_ENV === 'production';

const missing: string[] = [];
const warnings: string[] = [];

for (const name of REQUIRED) {
  if (!process.env[name] || process.env[name]?.trim() === '') {
    missing.push(name);
  }
}

for (const name of REQUIRED_IN_PROD) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    if (isProd) {
      missing.push(name);
    } else {
      warnings.push(name);
    }
  }
}

if (warnings.length > 0) {
  console.warn(
    `[check-env] dev-mode warning — these are required in production but not set: ${warnings.join(
      ', ',
    )}`,
  );
}

if (missing.length > 0) {
  console.error(
    '\n[check-env] FAILED — missing required environment variables:',
  );
  for (const name of missing) {
    console.error(`  - ${name}`);
  }
  console.error(
    '\nSet them in .env.local for local dev, or in Vercel Project Settings → Environment Variables for deploys.\n',
  );
  process.exit(1);
}

console.log('[check-env] ok');
