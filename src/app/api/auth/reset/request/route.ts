import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkAuthRateLimit, recordAuthEvent } from '@/lib/authRateLimit';
import { getResetEmailHtml } from '@/lib/email/auth-templates';
import { prisma } from '@/lib/prisma';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

const BodySchema = z.object({
  email: z.string().email(),
});

function getClientIp(req: NextRequest): string {
  if (process.env.NLM_TRUSTED_PROXY === 'true') {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
      const first = forwarded.split(',')[0].trim();
      if (first) return first;
    }
  }
  return 'unknown';
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Parse + validate body
  let email: string;
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: true }); // silently succeed — don't leak validation errors
    }
    email = parsed.data.email.toLowerCase().trim();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const ip = getClientIp(req);

  // Rate limit check
  const limit = checkAuthRateLimit({ email, ip, type: 'reset' });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Generate reset link via Supabase admin (server-side only — service role key)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  });

  // Record the event regardless of whether the email exists
  await recordAuthEvent({ type: 'reset', email, ip });

  // Abuse flag logic — ORDERING IS CRITICAL:
  // 1. Query count BEFORE recording the flag (so this flag doesn't self-dedupe)
  // 2. Check if a flag already exists in last 24h
  // 3. If not, record the flag and send admin email
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentResets = await prisma.authEvent.count({
    where: {
      email,
      type: 'reset',
      createdAt: { gte: oneDayAgo },
    },
  });

  if (recentResets >= 5) {
    // Check for existing abuse flag in last 24h (deduplicate admin email)
    const existingFlag = await prisma.authEvent.findFirst({
      where: {
        email,
        type: 'reset-abuse-flag',
        createdAt: { gte: oneDayAgo },
      },
    });

    if (!existingFlag) {
      // Record the abuse flag first
      await recordAuthEvent({
        type: 'reset-abuse-flag',
        email,
        ip,
        metadata: { flagCount: recentResets },
      });

      // Send admin notification
      const adminEmails = (process.env.ADMIN_EMAILS ?? '')
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);

      if (adminEmails.length > 0) {
        try {
          await resend.emails.send({
            from: 'Next Level Mock <noreply@nextlevelmock.com>',
            to: adminEmails,
            subject: `Password reset abuse flag: ${email}`,
            html: `<p>Abuse flag triggered for <strong>${email}</strong>.</p>
<p>Reset requests in last 24h: <strong>${recentResets}</strong></p>
<p>IP: ${ip}</p>
<p>Timestamp: ${new Date().toISOString()}</p>`,
          });
        } catch (err) {
          console.error('[reset/request] Failed to send admin abuse email:', err);
        }
      }
    }
  }

  // If link generation succeeded, send the reset email via Resend
  if (!linkError && linkData?.properties?.action_link) {
    const actionLink = linkData.properties.action_link;
    try {
      await resend.emails.send({
        from: 'Next Level Mock <noreply@nextlevelmock.com>',
        to: email,
        subject: 'Reset your Next Level Mock password',
        html: getResetEmailHtml(actionLink),
      });
    } catch (err) {
      console.error('[reset/request] Failed to send reset email:', err);
    }
  }

  // Always return 200 — never leak whether the email/account exists
  return NextResponse.json({ ok: true });
}
