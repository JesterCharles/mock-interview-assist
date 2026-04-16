import { NextResponse } from 'next/server';
import { getCallerIdentity } from '@/lib/identity';
import { prisma } from '@/lib/prisma';

/**
 * Returns the authenticated associate's slug (and id) for client-side chrome
 * (e.g., AssociateNav). Returns 401 with no body when not signed in — the
 * client treats that as anonymous and renders nothing.
 */
export async function GET(): Promise<NextResponse> {
  const caller = await getCallerIdentity();
  if (caller.kind !== 'associate') {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const me = await prisma.associate.findUnique({
    where: { id: caller.associateId },
    select: { id: true, slug: true, displayName: true },
  });
  if (!me) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...me });
}
