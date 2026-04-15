import { cookies } from 'next/headers';
import { verifyAssociateToken } from '@/lib/associateSession';
import { getAssociateById } from '@/lib/associateService';

/**
 * Trainer session check. INTENTIONALLY NOT BROADENED to cover associate
 * cookies (D-13). Associate auth is covered by the sibling helpers below.
 */
export async function isAuthenticatedSession(): Promise<boolean> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('nlm_session');

    return sessionCookie?.value === 'authenticated';
}

/**
 * Resolves the associate cookie, verifies the HMAC signature, AND compares
 * the embedded `ver` against the live `Associate.pinGeneratedAt` from the
 * database. Regenerating a PIN advances `pinGeneratedAt`, which implicitly
 * revokes all prior cookies (D-09a, Codex finding #4).
 *
 * Returns null for:
 *   - missing / malformed / tampered cookie
 *   - associate no longer exists
 *   - associate has null pinGeneratedAt (cannot validate ver)
 *   - cookie ver does not match current pinGeneratedAt (stale — revoked)
 */
async function resolveAssociate(): Promise<{ associateId: number; slug: string } | null> {
    const cookieStore = await cookies();
    const raw = cookieStore.get('associate_session')?.value;
    if (!raw) return null;

    const parsed = await verifyAssociateToken(raw);
    if (!parsed) return null;

    const associate = await getAssociateById(parsed.associateId);
    if (!associate) return null;
    if (!associate.pinGeneratedAt) return null;

    if (parsed.ver !== associate.pinGeneratedAt.toISOString()) return null;

    return { associateId: associate.id, slug: associate.slug };
}

export async function isAssociateAuthenticated(): Promise<boolean> {
    return (await resolveAssociate()) !== null;
}

export async function getAssociateIdentity(): Promise<{ associateId: number } | null> {
    const r = await resolveAssociate();
    return r ? { associateId: r.associateId } : null;
}

export async function getAssociateSession(): Promise<{ associateId: number; slug: string } | null> {
    return resolveAssociate();
}
