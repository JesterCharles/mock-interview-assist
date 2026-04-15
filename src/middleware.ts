import { NextRequest, NextResponse } from 'next/server';
import { getCallerIdentity } from '@/lib/identity';

/**
 * Per-identity permission table (D-11, D-12).
 *
 * | Path prefix                                 | Required identity         | On violation              |
 * |---------------------------------------------|---------------------------|---------------------------|
 * | /dashboard, /interview, /review, /trainer   | trainer                   | redirect /login           |
 * | /associate/* (except /associate/login)      | trainer OR associate      | redirect /associate/login |
 * | /associate/login                            | public                    | —                         |
 *
 * Middleware is cookie-only — NO DB work. Version-check (cookie ver vs
 * Associate.pinGeneratedAt) is enforced at the guarded surface (server
 * components / route handlers) via auth-server helpers (D-09a).
 */

// /interview covers /interview AND /interview/new (the renamed setup wizard).
// /dashboard kept as a guarded path so the legacy redirect page itself stays
// trainer-only — anonymous hits still redirect to /login first.
const TRAINER_PATHS = ['/dashboard', '/interview', '/review', '/trainer'];
const ASSOCIATE_PATH = '/associate';
const PUBLIC_ASSOCIATE_PATHS = ['/associate/login'];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Public associate paths — allow unconditionally.
  if (PUBLIC_ASSOCIATE_PATHS.some((p) => matchesPrefix(pathname, p))) {
    return NextResponse.next();
  }

  const identity = await getCallerIdentity(request);

  // 2. Trainer-only paths.
  if (TRAINER_PATHS.some((p) => matchesPrefix(pathname, p))) {
    if (identity.type === 'trainer') return NextResponse.next();
    // Associate cookies do NOT pass trainer gates (D-12 — prevent Pitfall 1).
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Associate-gated paths (anything under /associate/* not in public list).
  if (matchesPrefix(pathname, ASSOCIATE_PATH)) {
    if (identity.type === 'trainer' || identity.type === 'associate') {
      return NextResponse.next();
    }
    const loginUrl = new URL('/associate/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Everything else is public.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/interview/:path*',
    '/review/:path*',
    '/trainer/:path*',
    '/associate/:path*',
  ],
};
