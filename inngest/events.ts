import { EventSchemas } from 'inngest';

import type { SpectixInngestEvent } from '@/lib/types';

// fromUnion: each event has an explicit `name` field per /lib/types.ts.
export const eventSchemas = new EventSchemas().fromUnion<SpectixInngestEvent>();
