import { NextRequest, NextResponse } from 'next/server';
import { getCallerIdentity } from '@/lib/identity';
import { prisma } from '@/lib/prisma';
import { checkAuthRateLimit } from '@/lib/authRateLimit';
import { inviteAssociate } from '@/lib/inviteHelper';

/**
 * POST /api/trainer/associates/[id]/invite
 * Trainer invites an existing Associate by sending a magic-link invite.
 * Requires: Associate must have an email set (from Phase 17 backfill).
 * Uses the shared inviteAssociate helper (extracted for bulk-invite reuse).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const caller = await getCallerIdentity(); // [AUDIT-VERIFIED: P20]
    if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const associateId = parseInt(id, 10);
    if (isNaN(associateId)) {
      return NextResponse.json({ error: 'Invalid associate ID' }, { status: 400 });
    }

    // Look up the associate
    const associate = await prisma.associate.findUnique({
      where: { id: associateId },
      select: { id: true, slug: true, email: true, authUserId: true, cohortId: true },
    });

    if (!associate) {
      return NextResponse.json({ error: 'Associate not found' }, { status: 404 });
    }

    if (!associate.email) {
      return NextResponse.json({ error: 'Associate has no email — set email first' }, { status: 400 });
    }

    if (associate.authUserId) {
      return NextResponse.json({ error: 'Associate already has an account' }, { status: 409 });
    }

    // Per-email rate limit: 3/hr (separate from bulk daily limit)
    const ip = caller.email ?? 'trainer';
    const limit = checkAuthRateLimit({ email: ip, ip: 'trainer-invite', type: 'magic-link' });
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Daily invite limit reached' }, { status: 429 });
    }

    const result = await inviteAssociate(
      associate.email,
      associate.cohortId ?? 0,
      caller.email ?? 'trainer'
    );

    if (result.status === 'failed') {
      return NextResponse.json({ error: result.error ?? 'Failed to send invite' }, { status: 500 });
    }

    if (result.status === 'skipped') {
      return NextResponse.json({ error: result.error ?? 'Invite skipped' }, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      slug: associate.slug,
      email: associate.email,
      status: result.status,
    });
  } catch (err) {
    console.error('[invite] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
