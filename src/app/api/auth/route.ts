import { NextResponse } from 'next/server';
import { isAuthenticatedSession } from '@/lib/auth-server';

/**
 * GET — cookie truth check for client-side AuthProvider. Returns
 * { authenticated: boolean } based on nlm_session cookie. Avoids the
 * localStorage/cookie drift bug where stale localStorage triggers a
 * /login -> /signin -> /trainer -> /login redirect loop.
 */
export async function GET() {
  const authenticated = await isAuthenticatedSession();
  return NextResponse.json({ authenticated });
}

/**
 * DELETE — server-side trainer logout. Clears nlm_session cookie so
 * subsequent /signin loads don't redirect back into /trainer.
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('nlm_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}

