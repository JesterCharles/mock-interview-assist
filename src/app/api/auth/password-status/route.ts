import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { lazyBackfillProfile } from '@/lib/profileService';

/**
 * GET /api/auth/password-status — Profile-first trainer password gate check.
 *
 * Used by SignInTabs after a successful password login to decide whether to
 * route the user to /trainer (or nextPath) vs. /auth/set-password. This mirrors
 * the gate used in the exchange route (`/api/auth/exchange`) so magic-link and
 * password paths agree on the source of truth.
 *
 * Source of truth: Profile.passwordSetAt (per D-13). Falls back to
 * user_metadata.password_set when the Profile row has no timestamp.
 *
 * Response: `{ passwordSet: boolean }` on 200.
 *
 * Callers MUST fail-CLOSED on any non-200 response (route to /auth/set-password)
 * because middleware does not enforce this gate.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    const user = data.user;

    // Lazy backfill: migrate user_metadata.password_set to Profile.passwordSetAt (per D-12)
    await lazyBackfillProfile(user.id, user.user_metadata as { password_set?: boolean });

    // Profile-first check, metadata fallback (per D-13)
    const profile = await prisma.profile.findUnique({
      where: { authUserId: user.id },
      select: { passwordSetAt: true },
    });

    const passwordSet =
      profile?.passwordSetAt != null ||
      user.user_metadata?.password_set === true;

    return NextResponse.json({ passwordSet });
  } catch (err) {
    console.error('[password-status] Unhandled error:', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
