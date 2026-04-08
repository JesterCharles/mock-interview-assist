import { cookies } from 'next/headers';

export async function isAuthenticatedSession() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('nlm_session');
    
    return sessionCookie?.value === 'authenticated';
}
