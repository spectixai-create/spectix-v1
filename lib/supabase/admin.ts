/**
 * Service-role Supabase client. BYPASSES RLS.
 *
 * Use ONLY in:
 *   - Route Handlers under /app/api/**
 *   - Server Actions
 *   - Inngest functions
 *
 * NEVER import this file from a Client Component or anywhere shipped to the
 * browser. Importing it would bundle the service role key into client JS.
 *
 * The "server-only" import below makes Next.js throw a build-time error if
 * this module is ever pulled into a client component.
 */
import 'server-only';
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in environment.');
  }
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment.');
  }

  cached = createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cached;
}
