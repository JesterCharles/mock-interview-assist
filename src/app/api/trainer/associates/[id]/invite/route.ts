import { NextRequest, NextResponse } from 'next/server';
import { getCallerIdentity } from '@/lib/identity';
import { prisma } from '@/lib/prisma';
import { checkAuthRateLimit } from '@/lib/authRateLimit';

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
      select: { id: true, slug: true, email: true, authUserId: true, cohortId: true, lastInvitedAt: true },
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

    // Single-invite bypasses the bulk helper's cohort reassignment semantics.
    // We just want to send a magic link to an existing associate — no cohort logic.
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const { Resend } = await import('resend');
    const { getMagicLinkEmailHtml } = await import('@/lib/email/auth-templates');

    const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const resendClient = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

    // Check throttle: 5-min cooldown per associate
    if (
      associate.lastInvitedAt &&
      Date.now() - new Date(associate.lastInvitedAt).getTime() < 5 * 60 * 1000
    ) {
      return NextResponse.json({ error: 'Recently invited — wait 5 minutes' }, { status: 429 });
    }

    // Generate magic link
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: associate.email,
        options: { redirectTo: `${SITE}/auth/callback` },
      });

    if (linkError || !linkData?.properties?.action_link) {
      return NextResponse.json(
        { error: linkError?.message ?? 'Failed to generate invite link' },
        { status: 500 },
      );
    }

    // Send email
    await resendClient.emails.send({
      from: 'Next Level Mock <noreply@nextlevelmock.com>',
      to: associate.email,
      subject: "You're invited to Next Level Mock",
      html: getMagicLinkEmailHtml(linkData.properties.action_link),
    });

    // Update lastInvitedAt
    await prisma.associate.update({
      where: { id: associate.id },
      data: { lastInvitedAt: new Date() },
    });

    return NextResponse.json({
      ok: true,
      slug: associate.slug,
      email: associate.email,
      status: 'invited',
    });
  } catch (err) {
    console.error('[invite] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
