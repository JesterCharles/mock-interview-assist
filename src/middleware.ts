import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';

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

  // STEP 1: Always refresh Supabase session first — never skip this call.
  const { user, response } = await createSupabaseMiddlewareClient(request);

  // Public paths — return mutated response (session cookies forwarded).
  if (isPublic(pathname)) {
    return response;
  }

  // Extract role from Supabase user_metadata; unauthenticated users have no role.
  const role: string | null = user?.user_metadata?.role ?? (user ? 'associate' : null);

  // STEP 2: Trainer-only paths — require admin or trainer role.
  if (TRAINER_PATHS.some((p) => matchesPrefix(pathname, p))) {
    if (role === 'trainer' || role === 'admin') {
      return response;
    }
    const redirectUrl = new URL('/signin', request.url);
    redirectUrl.searchParams.set('next', pathname);
    const redirect = NextResponse.redirect(redirectUrl);
    // Forward refreshed session cookies even on redirect.
    response.headers.getSetCookie().forEach((c) => redirect.headers.append('set-cookie', c));
    return redirect;
  }

  // STEP 3: Associate paths — any authenticated user passes.
  if (matchesPrefix(pathname, ASSOCIATE_PATH)) {
    if (user) {
      return response;
    }
    const redirectUrl = new URL('/signin', request.url);
    redirectUrl.searchParams.set('next', pathname);
    const redirect = NextResponse.redirect(redirectUrl);
    response.headers.getSetCookie().forEach((c) => redirect.headers.append('set-cookie', c));
    return redirect;
  }

  // STEP 4: Profile — any authenticated user passes.
  if (matchesPrefix(pathname, '/profile')) {
    if (user) {
      return response;
    }
    const redirectUrl = new URL('/signin', request.url);
    redirectUrl.searchParams.set('next', pathname);
    const redirect = NextResponse.redirect(redirectUrl);
    response.headers.getSetCookie().forEach((c) => redirect.headers.append('set-cookie', c));
    return redirect;
  }

  // Everything else is public.
  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/interview/:path*',
    '/review/:path*',
    '/trainer/:path*',
    '/associate/:path*',
    '/profile/:path*',
  ],
};
