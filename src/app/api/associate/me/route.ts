import { NextResponse } from 'next/server';
import { getAssociateIdentity } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { isAssociateAuthEnabled } from '@/lib/featureFlags';

/**
 * Returns the authenticated associate's slug (and id) for client-side chrome
 * (e.g., AssociateNav). Returns 401 with no body when not signed in — the
 * client treats that as anonymous and renders nothing.
 */
export async function GET(): Promise<NextResponse> {
  if (!isAssociateAuthEnabled()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const identity = await getAssociateIdentity();
  if (!identity) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const me = await prisma.associate.findUnique({
    where: { id: identity.associateId },
    select: { id: true, slug: true, displayName: true },
  });
  if (!me) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...me });
}
