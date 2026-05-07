export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  validateUi002cRuntimeEnv();
}

export function validateUi002bRuntimeEnv(env = process.env) {
  validateUi002cRuntimeEnv(env);
}

export function validateUi002cRuntimeEnv(env = process.env) {
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
  if (!env.RESEND_API_KEY?.trim()) {
    throw new Error('Missing required env: RESEND_API_KEY');
  }
  if (!env.RESEND_WEBHOOK_SECRET?.trim()) {
    throw new Error('Missing required env: RESEND_WEBHOOK_SECRET');
  }
}
