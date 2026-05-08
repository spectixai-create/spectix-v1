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

const ADJUSTER_PATHS = ['/dashboard', '/claim', '/questions', '/design-system'];
const CLAIMANT_RATE_LIMIT_WINDOW_MS = 60_000;
const CLAIMANT_RATE_LIMIT_MAX = 90;
const claimantRateLimit = new Map<string, { count: number; resetAt: number }>();

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

function isClaimantPublicPath(pathname: string): boolean {
  return pathname.startsWith('/c/') || pathname.startsWith('/api/c/');
}

function rateLimitKey(request: NextRequest): string {
  const forwarded = request.headers
    .get('x-forwarded-for')
    ?.split(',')[0]
    ?.trim();
  const directIp = (request as NextRequest & { ip?: string }).ip;
  return forwarded || directIp || 'unknown';
}

function isRateLimited(request: NextRequest): boolean {
  const now = Date.now();
  const key = rateLimitKey(request);
  const current = claimantRateLimit.get(key);

  if (!current || current.resetAt <= now) {
    claimantRateLimit.set(key, {
      count: 1,
      resetAt: now + CLAIMANT_RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  current.count += 1;
  return current.count > CLAIMANT_RATE_LIMIT_MAX;
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

  if (isClaimantPublicPath(pathname) && isRateLimited(request)) {
    return pathname.startsWith('/api/')
      ? NextResponse.json(
          {
            ok: false,
            error: { code: 'rate_limited', message: 'יותר מדי בקשות' },
          },
          { status: 429 },
        )
      : new NextResponse('יותר מדי בקשות', { status: 429 });
  }

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
  matcher: [
    '/api/c/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
