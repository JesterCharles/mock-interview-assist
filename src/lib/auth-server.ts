import { cookies } from 'next/headers';

/**
 * Trainer session check. Reads only the nlm_session cookie.
 * Associate identity is handled by getCallerIdentity() in src/lib/identity.ts.
 */
export async function isAuthenticatedSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('nlm_session');
  return sessionCookie?.value === 'authenticated';
}
