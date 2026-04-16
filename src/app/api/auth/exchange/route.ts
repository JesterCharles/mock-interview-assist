import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * GET /api/auth/exchange — server-side session exchange.
 *
 * Receives tokens (implicit flow) or code (PKCE) from the client callback page.
 * Sets httpOnly cookies via the response and redirects to the appropriate page.
 * This is necessary because @supabase/ssr middleware creates httpOnly cookies
 * that client-side JavaScript cannot write.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');
  const code = searchParams.get('code');
  const type = searchParams.get('type');

  // Build a Supabase server client that writes cookies to our response
  const response = NextResponse.next();
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
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  try {
    if (code) {
      // PKCE flow
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(new URL('/signin?error=invalid-link', SITE));
      }
    } else if (accessToken && refreshToken) {
      // Implicit flow — set session from tokens
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        return NextResponse.redirect(new URL('/signin?error=invalid-link', SITE));
      }
    } else {
      return NextResponse.redirect(new URL('/signin?error=missing-code', SITE));
    }

    // Recovery flow → update-password page
    if (type === 'recovery') {
      const redirect = NextResponse.redirect(new URL('/auth/update-password', SITE));
      response.cookies.getAll().forEach(c => redirect.cookies.set(c.name, c.value));
      return redirect;
    }

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL('/signin?error=invalid-link', SITE));
    }

    const role = user.user_metadata?.role as string | undefined;

    // Auto-assign 'associate' role if none set
    if (!role) {
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, role: 'associate' },
      });
    }

    // Determine redirect destination
    let dest = '/';

    if (role === 'trainer' || role === 'admin') {
      dest = '/trainer';
    } else {
      // Associate — attempt authUserId linkage
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

        if (assoc) {
          dest = `/associate/${assoc.slug}`;
        } else {
          dest = '/signin?error=not-onboarded';
        }
      } catch (err) {
        console.error('[exchange] authUserId linkage error:', err);
        dest = '/signin?error=invalid-link';
      }
    }

    // Redirect with session cookies
    const redirect = NextResponse.redirect(new URL(dest, SITE));
    response.cookies.getAll().forEach(c => redirect.cookies.set(c.name, c.value));
    return redirect;

  } catch (err) {
    console.error('[exchange] Unhandled error:', err);
    return NextResponse.redirect(new URL('/signin?error=invalid-link', SITE));
  }
}
