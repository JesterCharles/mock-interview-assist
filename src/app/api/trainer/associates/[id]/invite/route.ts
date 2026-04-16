import { NextRequest, NextResponse } from 'next/server';
import { getCallerIdentity } from '@/lib/identity';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { checkAuthRateLimit, recordAuthEvent } from '@/lib/authRateLimit';
import { getMagicLinkEmailHtml } from '@/lib/email/auth-templates';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * POST /api/trainer/associates/[id]/invite
 * Trainer creates a Supabase user for an existing Associate and sends a magic-link invite.
 * Requires: Associate must have an email set (from Phase 17 backfill).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const caller = await getCallerIdentity();
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
    select: { id: true, slug: true, email: true, authUserId: true },
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

  // Rate limit: 20/day per trainer-issuer
  const ip = caller.email ?? 'trainer';
  const limit = checkAuthRateLimit({ email: ip, ip: 'trainer-invite', type: 'magic-link' });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Daily invite limit reached' }, { status: 429 });
  }

  // Create Supabase user + generate magic link in one step
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: associate.email,
    options: {
      redirectTo: `${SITE}/auth/callback`,
    },
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error('[invite] generateLink error:', linkError?.message ?? 'no action_link');
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }

  // Send via Resend
  try {
    await resend.emails.send({
      from: 'Next Level Mock <noreply@nextlevelmock.com>',
      to: associate.email,
      subject: 'You\'re invited to Next Level Mock',
      html: getMagicLinkEmailHtml(linkData.properties.action_link),
    });
  } catch (emailErr) {
    console.error('[invite] Resend error:', emailErr);
    return NextResponse.json({ error: 'Failed to send invite email' }, { status: 500 });
  }

  // Update lastInvitedAt
  await prisma.associate.update({
    where: { id: associate.id },
    data: { lastInvitedAt: new Date() },
  });

  await recordAuthEvent({ type: 'trainer-invite', email: associate.email, ip });

  return NextResponse.json({
    ok: true,
    slug: associate.slug,
    email: associate.email,
  });
}
