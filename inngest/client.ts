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

/**
 * Spike #00: empty event registry — no typed schemas attached yet.
 *
 * Later spikes will introduce typed events with EventSchemas().fromRecord<...>(),
 * following the convention of dot-separated lowercase event names
 * (e.g. "claim/intake.uploaded").
 */
export const inngest = new Inngest({
  id: 'spectix-poc',
});
