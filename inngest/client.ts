/**
 * Inngest client. The webhook route at /api/inngest registers all functions
 * exported from /inngest/functions/index.ts with this client.
 *
 * In local dev: run `pnpm inngest:dev` in a separate terminal. The dev server
 * connects to http://localhost:3000/api/inngest. INNGEST_DEV=1 is auto-set.
 *
 * In production (Vercel): INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY must be set.
 */
import { Inngest } from 'inngest';

import { eventSchemas } from './events';

if (
  process.env.NODE_ENV === 'production' &&
  process.env.SPECTIX_FORCE_DOCUMENT_FAILURE === 'true'
) {
  throw new Error(
    'SPECTIX_FORCE_DOCUMENT_FAILURE must not be enabled in production. ' +
      'Remove from Vercel env vars or set NODE_ENV != production.',
  );
}

export const inngest = new Inngest({
  id: 'spectix-poc',
  schemas: eventSchemas,
});
