import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATHS = ['/dashboard', '/interview', '/review', '/trainer'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect matching paths
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (!isProtected) return NextResponse.next();

  const session = request.cookies.get('nlm_session');
  if (session?.value === 'authenticated') return NextResponse.next();

  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/dashboard/:path*', '/interview/:path*', '/review/:path*', '/trainer/:path*'],
};
