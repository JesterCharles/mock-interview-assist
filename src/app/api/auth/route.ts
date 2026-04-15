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

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        const correctPassword = process.env.APP_PASSWORD;

        if (!correctPassword) {
            console.error('APP_PASSWORD environment variable not set');
            return NextResponse.json(
                { error: 'Authentication not configured' },
                { status: 500 }
            );
        }

        if (password === correctPassword) {
            const response = NextResponse.json({ success: true });
            
            // Set HttpOnly cookie for backend security
            response.cookies.set('nlm_session', 'authenticated', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 // 24 hours
            });
            
            return response;
        } else {
            return NextResponse.json(
                { error: 'Invalid password' },
                { status: 401 }
            );
        }
    } catch (error) {
        console.error('Auth error:', error);
        return NextResponse.json(
            { error: 'Authentication failed' },
            { status: 500 }
        );
    }
}
