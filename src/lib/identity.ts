import type { NextRequest } from 'next/server';
import { verifyAssociateToken } from '@/lib/associateSession';

/**
 * Caller identity enumeration — cookie-only, synchronous, NO DB access.
 *
 * This helper is used by middleware, so it MUST NOT touch the database.
 * Version comparison (cookie ver vs Associate.pinGeneratedAt) is enforced
 * downstream in server-component / route-handler helpers that live in
 * `auth-server.ts`. Middleware only needs to know "which auth system do
 * you belong to, if any?" — a stale cookie still resolves to `associate`
 * at this layer and is rejected at the guarded surface.
 *
 * Trainer cookie takes precedence when both are present (D-10).
 */
export type CallerIdentity =
  | { type: 'trainer' }
  | { type: 'associate'; associateId: number; ver: string }
  | { type: 'anonymous' };

export async function getCallerIdentity(request: NextRequest): Promise<CallerIdentity> {
  // Trainer precedence (D-10): nlm_session wins over associate_session.
  const trainer = request.cookies.get('nlm_session');
  if (trainer?.value === 'authenticated') {
    return { type: 'trainer' };
  }

  const associate = request.cookies.get('associate_session');
  if (associate?.value) {
    const parsed = await verifyAssociateToken(associate.value);
    if (parsed) {
      return { type: 'associate', associateId: parsed.associateId, ver: parsed.ver };
    }
  }

  return { type: 'anonymous' };
}
