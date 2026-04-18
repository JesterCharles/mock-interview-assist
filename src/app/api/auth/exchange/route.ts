import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma';
import { lazyBackfillProfile } from '@/lib/profileService';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * GET /api/auth/exchange — server-side session exchange.
 *
 * Receives tokens (implicit flow) or code (PKCE) from the client callback page.
 * Sets httpOnly cookies via the redirect response.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');
  const code = searchParams.get('code');
  const type = searchParams.get('type');

  // Accumulate cookies with full options so we can apply them to the redirect
  const pendingCookies: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            pendingCookies.push({ name, value, options });
          });
        },
      },
    }
  );

  // Helper: create redirect with all accumulated session cookies
  function redirectWith(path: string): NextResponse {
    const res = NextResponse.redirect(new URL(path, SITE));
    for (const { name, value, options } of pendingCookies) {
      res.cookies.set(name, value, options);
    }
    return res;
  }

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return redirectWith('/signin?error=invalid-link');
    } else if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) return redirectWith('/signin?error=invalid-link');
    } else {
      return redirectWith('/signin?error=missing-code');
    }

    if (type === 'recovery') {
      return redirectWith('/auth/update-password');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirectWith('/signin?error=invalid-link');

    const role = user.user_metadata?.role as string | undefined;

    if (!role) {
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, role: 'associate' },
        app_metadata: { ...user.app_metadata, role: 'associate' },
      });
    }

    // Phase 33 / SIGNIN-02: Lazy backfill + first-login gate MUST run BEFORE the role branch.
    // Previously, trainers/admins short-circuited to /trainer and bypassed the passwordSet check.

    // Lazy backfill: migrate user_metadata.password_set to Profile.passwordSetAt (per D-12)
    await lazyBackfillProfile(user.id, user.user_metadata as { password_set?: boolean });

    // First-login detection: Profile-first, metadata fallback (per D-13)
    const profile = await prisma.profile.findUnique({
      where: { authUserId: user.id },
      select: { passwordSetAt: true },
    });

    const passwordSet =
      profile?.passwordSetAt != null || user.user_metadata?.password_set === true;

    // Gate BEFORE role-based routing (per D-01 — closes SIGNIN-02 magic-link gap)
    if (!passwordSet) {
      return redirectWith('/auth/set-password');
    }

    // Role-based routing: trainers/admins → /trainer; associates fall through to authUserId linkage.
    if (role === 'trainer' || role === 'admin') {
      return redirectWith('/trainer');
    }

    // Associate — authUserId linkage
    try {
      let assoc = await prisma.associate.findUnique({
        where: { authUserId: user.id },
        select: { slug: true },
      });

      if (!assoc && user.email) {
        const emailMatch = await prisma.associate.findUnique({
          where: { email: user.email },
          select: { id: true, slug: true, authUserId: true },
        });

        if (emailMatch && emailMatch.authUserId === null) {
          try {
            assoc = await prisma.associate.update({
              where: { id: emailMatch.id },
              data: { authUserId: user.id },
              select: { slug: true },
            });
          } catch (err: unknown) {
            if (
              typeof err === 'object' && err !== null &&
              'code' in err && (err as { code: string }).code === 'P2002'
            ) {
              assoc = await prisma.associate.findUnique({
                where: { authUserId: user.id },
                select: { slug: true },
              });
            } else {
              throw err;
            }
          }
        } else if (emailMatch) {
          assoc = emailMatch;
        }
      }

      if (assoc) return redirectWith(`/associate/${assoc.slug}/dashboard`);
      return redirectWith('/signin?error=not-onboarded');
    } catch (err) {
      console.error('[exchange] authUserId linkage error:', err);
      return redirectWith('/signin?error=invalid-link');
    }
  } catch (err) {
    console.error('[exchange] Unhandled error:', err);
    return redirectWith('/signin?error=invalid-link');
  }
}
