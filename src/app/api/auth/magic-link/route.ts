import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma';
import { checkAuthRateLimit, recordAuthEvent } from '@/lib/authRateLimit';
import { getMagicLinkEmailHtml } from '@/lib/email/auth-templates';

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
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    email = parsed.data.email.toLowerCase().trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const ip = getClientIp(req);

  // Rate limit: 3/hr/email + 10/hr/IP
  const limit = checkAuthRateLimit({ email, ip, type: 'magic-link' });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Only send magic links to emails with an existing Associate row.
  // Prevents Supabase from auto-creating auth users for unregistered emails.
  // Still return 200 to avoid leaking whether the email exists.
  const associate = await prisma.associate.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true },
  });
  if (!associate) {
    await recordAuthEvent({ type: 'magic-link-no-associate', email, ip });
    return NextResponse.json({ ok: true });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  // Generate magic link via Supabase admin (PKCE flow)
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (linkError || !linkData?.properties?.action_link) {
    // Do NOT reveal whether the user exists — always return 200
    console.error('[magic-link] generateLink error:', linkError?.message ?? 'no action_link');
    await recordAuthEvent({ type: 'magic-link', email, ip });
    return NextResponse.json({ ok: true });
  }

  const actionLink = linkData.properties.action_link;

  // Send via Resend with branded template
  try {
    await resend.emails.send({
      from: 'Next Level Mock <noreply@nextlevelmock.com>',
      to: email,
      subject: 'Sign in to Next Level Mock',
      html: getMagicLinkEmailHtml(actionLink),
    });
  } catch (emailErr) {
    console.error('[magic-link] Resend error:', emailErr);
    // Still return 200 — no user leak on email failure
  }

  // Record to AuthEvent table
  await recordAuthEvent({ type: 'magic-link', email, ip });

  return NextResponse.json({ ok: true });
}
