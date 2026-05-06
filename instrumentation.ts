export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  validateUi002bRuntimeEnv();
}

export function validateUi002bRuntimeEnv(env = process.env) {
  if (env.NODE_ENV !== 'production') return;
  if (env.NEXT_PHASE === 'phase-production-build') return;

  if ('SKIP_NOTIFICATIONS' in env) {
    throw new Error(
      'SKIP_NOTIFICATIONS env var must NOT be set in production.',
    );
  }

  if (!env.APP_BASE_URL?.trim()) {
    throw new Error('Missing required env: APP_BASE_URL');
  }
}
