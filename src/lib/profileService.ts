import { prisma } from '@/lib/prisma';

/** Get profile by authUserId. Creates one if it doesn't exist (upsert pattern). */
export async function getOrCreateProfile(authUserId: string) {
  return prisma.profile.upsert({
    where: { authUserId },
    create: { authUserId },
    update: {},
  });
}

/** Update editable profile fields. Only updates provided fields (partial update). */
export async function updateProfile(
  authUserId: string,
  data: {
    displayName?: string | null;
    githubUsername?: string | null;
    bio?: string | null;
    learningGoals?: string | null;
    passwordSetAt?: Date | null;
  }
) {
  return prisma.profile.upsert({
    where: { authUserId },
    create: { authUserId, ...data },
    update: data,
  });
}

/**
 * Lazy backfill: if user_metadata.password_set is true but no Profile.passwordSetAt,
 * create/update Profile with passwordSetAt = now(). Per D-12.
 */
export async function lazyBackfillProfile(
  authUserId: string,
  metadata: { password_set?: boolean }
) {
  if (!metadata?.password_set) return;

  const existing = await prisma.profile.findUnique({
    where: { authUserId },
    select: { passwordSetAt: true },
  });

  if (existing?.passwordSetAt) return; // Already migrated

  await prisma.profile.upsert({
    where: { authUserId },
    create: { authUserId, passwordSetAt: new Date() },
    update: { passwordSetAt: new Date() },
  });
}
