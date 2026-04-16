import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

function redirect(path: string): NextResponse {
  return NextResponse.redirect(new URL(path, SITE));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const type = searchParams.get('type');

  if (!code) {
    return redirect('/signin?error=missing-code');
  }

  const supabase = await createSupabaseServerClient();

  // Exchange PKCE code for session
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error('[auth/callback] exchangeCodeForSession error:', exchangeError.message);
    return redirect('/signin?error=invalid-link');
  }

  // Recovery flow (password reset) → update-password page
  if (type === 'recovery') {
    return redirect('/auth/update-password');
  }

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/signin?error=invalid-link');
  }

  const role = user.user_metadata?.role as string | undefined;

  // Auto-assign 'associate' role if no role set (first-time magic link users)
  if (!role) {
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, role: 'associate' },
    });
  }

  // Trainer / admin — redirect to trainer dashboard
  if (role === 'trainer' || role === 'admin') {
    return redirect(next ?? '/trainer');
  }

  // Associate — attempt authUserId linkage on first sign-in
  let associateSlug: string | null = null;

  try {
    // Check if already linked by authUserId
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let assoc = await (prisma.associate as any).findUnique({
      where: { authUserId: user.id },
      select: { id: true, slug: true, authUserId: true },
    }) as { id: number; slug: string; authUserId: string | null } | null;

    if (!assoc && user.email) {
      // Not yet linked — try to match by email
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emailMatch = await (prisma.associate as any).findUnique({
        where: { email: user.email },
        select: { id: true, slug: true, authUserId: true, email: true },
      }) as { id: number; slug: string; authUserId: string | null; email: string } | null;

      if (emailMatch && emailMatch.authUserId === null) {
        try {
          // Link authUserId on first successful exchange
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          assoc = await (prisma.associate as any).update({
            where: { id: emailMatch.id },
            data: { authUserId: user.id },
            select: { id: true, slug: true, authUserId: true },
          }) as { id: number; slug: string; authUserId: string | null };
        } catch (updateErr: unknown) {
          // Race condition: another concurrent callback already linked this row (P2002)
          if (
            typeof updateErr === 'object' &&
            updateErr !== null &&
            'code' in updateErr &&
            (updateErr as { code: string }).code === 'P2002'
          ) {
            // Re-read by authUserId — the concurrent request already linked it
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            assoc = await (prisma.associate as any).findUnique({
              where: { authUserId: user.id },
              select: { id: true, slug: true, authUserId: true },
            }) as { id: number; slug: string; authUserId: string | null } | null;
          } else {
            throw updateErr;
          }
        }
      } else if (emailMatch && emailMatch.authUserId !== null) {
        // Already linked by someone else (or was set before)
        assoc = emailMatch as { id: number; slug: string; authUserId: string | null };
      }
    }

    if (!assoc) {
      // Associate email not in system — not onboarded
      return redirect('/signin?error=not-onboarded');
    }

    associateSlug = assoc.slug;
  } catch (err) {
    console.error('[auth/callback] authUserId linkage error:', err);
    return redirect('/signin?error=invalid-link');
  }

  // Redirect to associate dashboard
  const dest = next ?? (associateSlug ? `/associate/${associateSlug}` : '/');
  return redirect(dest);
}
