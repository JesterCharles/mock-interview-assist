import { supabaseAdmin } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { recordAuthEvent } from '@/lib/authRateLimit';
import { getMagicLinkEmailHtml } from '@/lib/email/auth-templates';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

export type InviteResult = {
  status: 'invited' | 'reassigned' | 'skipped' | 'failed';
  error?: string;
};

export function generateSlug(email: string): string {
  const local = email
    .split('@')[0]
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
    .slice(0, 20);
  const suffix = crypto.randomBytes(2).toString('hex'); // 4 hex chars
  return `${local || 'user'}-${suffix}`;
}

/**
 * Invite an associate by email to a cohort.
 *
 * Logic:
 * 1. Look up existing associate by email.
 * 2. If same cohort → skip (already there).
 * 3. If recently invited (< 5 min) → skip (throttle).
 * 4. Create or update associate record (upsert cohortId).
 * 5. generateLink via Supabase admin.
 * 6. Send email via Resend.
 * 7. Update lastInvitedAt.
 * 8. Record auth event.
 * 9. Return { status: 'invited' | 'reassigned' }.
 */
export async function inviteAssociate(
  email: string,
  cohortId: number,
  trainerIdentifier: string,
): Promise<InviteResult> {
  // Step 1: Find existing associate
  const existing = await prisma.associate.findUnique({
    where: { email },
    select: { id: true, slug: true, cohortId: true, lastInvitedAt: true },
  });

  let isNew = false;
  let associateEmail = email;

  if (existing) {
    // Step 2: Same cohort — skip
    if (existing.cohortId === cohortId) {
      return { status: 'skipped', error: 'Already in target cohort' };
    }

    // Step 3: Throttle check
    if (
      existing.lastInvitedAt &&
      Date.now() - existing.lastInvitedAt.getTime() < THROTTLE_MS
    ) {
      return { status: 'skipped', error: 'Recently invited -- throttled' };
    }

    // Step 4a: Update cohortId
    await prisma.associate.update({
      where: { id: existing.id },
      data: { cohortId },
    });
    isNew = false;
  } else {
    // Step 4b: Create new associate — handle P2002 slug collision with one retry
    let created = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await prisma.associate.create({
          data: {
            email,
            slug: generateSlug(email),
            cohortId,
          },
        });
        created = true;
        break;
      } catch (err: unknown) {
        const isPrismaUniqueViolation =
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code: string }).code === 'P2002';
        if (isPrismaUniqueViolation && attempt === 0) {
          // Retry once with a fresh slug
          continue;
        }
        throw err;
      }
    }
    if (!created) {
      return { status: 'failed', error: 'Failed to create associate record' };
    }
    isNew = true;
  }

  // Step 5: Generate magic link via Supabase admin
  const { data: linkData, error: linkError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: associateEmail,
      options: {
        redirectTo: `${SITE}/auth/callback`,
      },
    });

  if (linkError || !linkData?.properties?.action_link) {
    return {
      status: 'failed',
      error: linkError?.message ?? 'Failed to generate invite link',
    };
  }

  // Step 6: Send email via Resend
  try {
    await resend.emails.send({
      from: 'Next Level Mock <noreply@nextlevelmock.com>',
      to: associateEmail,
      subject: "You're invited to Next Level Mock",
      html: getMagicLinkEmailHtml(linkData.properties.action_link),
    });
  } catch (emailErr) {
    return { status: 'failed', error: String(emailErr) };
  }

  // Step 7: Update lastInvitedAt
  await prisma.associate.update({
    where: { email: associateEmail },
    data: { lastInvitedAt: new Date() },
  });

  // Step 8: Record auth event
  await recordAuthEvent({
    type: 'trainer-invite',
    email: associateEmail,
    ip: trainerIdentifier,
  });

  // Step 9: Return result
  return { status: isNew ? 'invited' : 'reassigned' };
}
