import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';
import { log } from '@/lib/logger';

/**
 * Middleware: refresh Supabase session BEFORE route guard on every matched request.
 *
 * | Path prefix                                 | Required role            | On violation              |
 * |---------------------------------------------|--------------------------|---------------------------|
 * | /dashboard, /interview, /review, /trainer   | admin OR trainer         | redirect /signin?next=    |
 * | /associate/* (except /associate/login)      | any authenticated user   | redirect /signin?next=    |
 * | public paths (/, /signin, /auth/callback)   | none                     | pass through              |
 *
 * CRITICAL: Always returns the `response` object from createSupabaseMiddlewareClient
 * (never creates a fresh NextResponse.next()) so refreshed session cookies are preserved.
 */

const PUBLIC_PATHS = ['/', '/signin', '/auth/callback', '/associate/login'];
const TRAINER_PATHS = ['/dashboard', '/interview', '/review', '/trainer'];
const ASSOCIATE_PATH = '/associate';

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const startedAt = Date.now();
  let decision: string = 'pass';

  // STEP 1: Always refresh Supabase session first — never skip this call.
  const { user, response } = await createSupabaseMiddlewareClient(request);

  // Extract role from Supabase user_metadata; unauthenticated users have no role.
  const role: string | null = user?.user_metadata?.role ?? (user ? 'associate' : null);

  const emitLog = (outcome: string) => {
    log.info('middleware', {
      route: pathname,
      method: request.method,
      decision: outcome,
      latency_ms: Date.now() - startedAt,
      authed: Boolean(user),
      role: role ?? null,
    });
  };

  // Public paths — return mutated response (session cookies forwarded).
  if (isPublic(pathname)) {
    decision = 'public';
    emitLog(decision);
    return response;
  }

  // STEP 2: Trainer-only paths — require admin or trainer role.
  if (TRAINER_PATHS.some((p) => matchesPrefix(pathname, p))) {
    if (role === 'trainer' || role === 'admin') {
      decision = 'trainer-pass';
      emitLog(decision);
      return response;
    }
    decision = 'redirect-signin-trainer';
    const redirectUrl = new URL('/signin', request.url);
    redirectUrl.searchParams.set('next', pathname);
    const redirect = NextResponse.redirect(redirectUrl);
    // Forward refreshed session cookies even on redirect.
    response.headers.getSetCookie().forEach((c) => redirect.headers.append('set-cookie', c));
    emitLog(decision);
    return redirect;
  }

  // STEP 3: Associate paths — any authenticated user passes.
  if (matchesPrefix(pathname, ASSOCIATE_PATH)) {
    if (user) {
      decision = 'associate-pass';
      emitLog(decision);
      return response;
    }
    decision = 'redirect-signin-associate';
    const redirectUrl = new URL('/signin', request.url);
    redirectUrl.searchParams.set('next', pathname);
    const redirect = NextResponse.redirect(redirectUrl);
    response.headers.getSetCookie().forEach((c) => redirect.headers.append('set-cookie', c));
    emitLog(decision);
    return redirect;
  }

  // STEP 3b: /coding/* (Phase 40) — any authenticated user passes (trainers + associates share this surface).
  if (matchesPrefix(pathname, '/coding')) {
    if (user) {
      decision = 'coding-pass';
      emitLog(decision);
      return response;
    }
    decision = 'redirect-signin-coding';
    const redirectUrl = new URL('/signin', request.url);
    redirectUrl.searchParams.set('next', pathname);
    const redirect = NextResponse.redirect(redirectUrl);
    response.headers.getSetCookie().forEach((c) => redirect.headers.append('set-cookie', c));
    emitLog(decision);
    return redirect;
  }

  // STEP 4: Profile — any authenticated user passes.
  if (matchesPrefix(pathname, '/profile')) {
    if (user) {
      decision = 'profile-pass';
      emitLog(decision);
      return response;
    }
    decision = 'redirect-signin-profile';
    const redirectUrl = new URL('/signin', request.url);
    redirectUrl.searchParams.set('next', pathname);
    const redirect = NextResponse.redirect(redirectUrl);
    response.headers.getSetCookie().forEach((c) => redirect.headers.append('set-cookie', c));
    emitLog(decision);
    return redirect;
  }

  // STEP 5: Set-password — any authenticated user passes.
  if (pathname === '/auth/set-password') {
    if (user) {
      decision = 'set-password-pass';
      emitLog(decision);
      return response;
    }
    decision = 'redirect-signin-set-password';
    const redirect = NextResponse.redirect(new URL('/signin', request.url));
    response.headers.getSetCookie().forEach((c) => redirect.headers.append('set-cookie', c));
    emitLog(decision);
    return redirect;
  }

  // Everything else is public.
  emitLog(decision);
  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/interview/:path*',
    '/review/:path*',
    '/trainer/:path*',
    '/associate/:path*',
    '/coding/:path*',
    '/profile/:path*',
    '/auth/set-password',
  ],
};
