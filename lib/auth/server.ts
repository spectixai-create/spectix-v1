/**
 * Auth helpers for Server Components and route handlers.
 *
 * IMPORTANT: getSession() vs getUser() — different semantics:
 *   getSession() — reads session from cookie WITHOUT server validation.
 *     Fast (~5ms). Trusts cookie integrity. Use in middleware.
 *   getUser() — validates JWT against Supabase server (~50-100ms).
 *     Use in Server Components and route handlers where security matters.
 *
 * Pages calling these helpers MUST set:
 *   export const dynamic = 'force-dynamic'
 * Otherwise Next.js may attempt static generation and call helpers
 * with no request context.
 */

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import { createClient as createServerClient } from '@/lib/supabase/server';

export async function getSession() {
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}

function getAccessTokenFromAuthCookie(): string | null {
  const authCookie = cookies()
    .getAll()
    .find(
      (cookie) =>
        cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token'),
    );

  if (!authCookie) return null;

  try {
    const decodedCookie = decodeURIComponent(authCookie.value);
    const serializedSession = decodedCookie.startsWith('base64-')
      ? Buffer.from(
          decodedCookie.slice('base64-'.length),
          'base64url',
        ).toString('utf8')
      : decodedCookie;
    const parsedSession = JSON.parse(serializedSession) as {
      access_token?: unknown;
    };

    return typeof parsedSession.access_token === 'string'
      ? parsedSession.access_token
      : null;
  } catch {
    return null;
  }
}

export async function getUser() {
  const cookieAccessToken = getAccessTokenFromAuthCookie();
  const supabase = createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token ?? cookieAccessToken;

  if (!accessToken) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase public environment variables');
  }

  const authClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
  } = await authClient.auth.getUser(accessToken);

  return user;
}

/**
 * Throws Next.js redirect signal if no user.
 * MUST be called only in Server Components or route handlers.
 * MUST NOT be wrapped in try/catch (would swallow redirect signal).
 */
export async function requireUser() {
  const user = await getUser();

  if (!user) {
    const headersList = headers();
    const pathname = headersList.get('x-pathname') ?? '/dashboard';
    redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }

  return user;
}
