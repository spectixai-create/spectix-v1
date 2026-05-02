import { type NextRequest, NextResponse } from 'next/server';

import { isSafeNext } from '@/lib/auth/safe-redirect';
import { createMiddlewareClient } from '@/lib/supabase/middleware';

/**
 * Auth middleware — runs on Edge runtime.
 *
 * Excludes /api/* routes (Inngest, health, future webhooks bypass auth).
 * Inngest auth uses signing keys, not cookies.
 *
 * Uses getSession() (cookie-only check) for speed.
 * If session looks valid, downstream pages call getUser() to validate.
 */

const ADJUSTER_PATHS = ['/dashboard', '/claim', '/questions'];

function isAdjusterPath(pathname: string): boolean {
  return ADJUSTER_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  const parsedCookieFound = request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith('sb-') &&
        cookie.name.includes('-auth-token') &&
        cookie.value.length > 0,
    );

  if (parsedCookieFound) return true;

  const rawCookieHeader = request.headers.get('cookie') ?? '';
  return /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.[^=;]+)?=/.test(rawCookieHeader);
}

function redirectWithRefreshedCookies(
  url: URL,
  request: NextRequest,
  response: NextResponse,
) {
  const redirectResponse = NextResponse.redirect(url);

  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  const hasRawAuthCookie = hasSupabaseAuthCookie(request);
  const supabase = createMiddlewareClient(request, response);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;
  const hasSessionCookie = Boolean(session) || hasRawAuthCookie;

  if (pathname === '/login' && session) {
    return redirectWithRefreshedCookies(
      new URL('/dashboard', request.url),
      request,
      response,
    );
  }

  if (isAdjusterPath(pathname) && !hasSessionCookie) {
    const loginUrl = new URL('/login', request.url);

    if (isSafeNext(pathname)) {
      loginUrl.searchParams.set('next', pathname);
    }

    return redirectWithRefreshedCookies(loginUrl, request, response);
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
