import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/auth/callback-link
 * Called by the client-side /auth/callback page after session is established.
 * Handles: role auto-assign, authUserId linkage, returns redirect destination.
 */
export async function POST(): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ redirect: '/signin?error=invalid-link' });
  }

  const role = user.user_metadata?.role as string | undefined;

  // Auto-assign 'associate' role if no role set
  if (!role) {
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, role: 'associate' },
    });
  }

  // Trainer / admin → trainer dashboard
  if (role === 'trainer' || role === 'admin') {
    return NextResponse.json({ redirect: '/trainer', role });
  }

  // Associate — attempt authUserId linkage
  try {
    let assoc = await prisma.associate.findUnique({
      where: { authUserId: user.id },
      select: { id: true, slug: true, authUserId: true },
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
            select: { id: true, slug: true, authUserId: true },
          });
        } catch (updateErr: unknown) {
          if (
            typeof updateErr === 'object' &&
            updateErr !== null &&
            'code' in updateErr &&
            (updateErr as { code: string }).code === 'P2002'
          ) {
            assoc = await prisma.associate.findUnique({
              where: { authUserId: user.id },
              select: { id: true, slug: true, authUserId: true },
            });
          } else {
            throw updateErr;
          }
        }
      } else if (emailMatch) {
        assoc = emailMatch;
      }
    }

    if (!assoc) {
      return NextResponse.json({ redirect: '/signin?error=not-onboarded' });
    }

    return NextResponse.json({ redirect: `/associate/${assoc.slug}`, role: role ?? 'associate' });
  } catch (err) {
    console.error('[callback-link] authUserId linkage error:', err);
    return NextResponse.json({ redirect: '/signin?error=invalid-link' });
  }
}
