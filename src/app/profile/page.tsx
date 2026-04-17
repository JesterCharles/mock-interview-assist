import { getCallerIdentity } from '@/lib/identity';
import { getOrCreateProfile } from '@/lib/profileService';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProfileTabs } from './ProfileTabs';

export default async function ProfilePage() {
  const identity = await getCallerIdentity();
  if (identity.kind === 'anonymous') redirect('/signin');

  const profile = await getOrCreateProfile(identity.userId);

  // Readiness data for Learning tab (associates only, per D-08)
  let readiness: {
    status: string;
    recommendedArea: string | null;
    score: number | null;
    sessionCount: number;
  } | null = null;

  if (identity.kind === 'associate') {
    const associate = await prisma.associate.findUnique({
      where: { id: identity.associateId },
      select: { readinessStatus: true, recommendedArea: true },
    });
    const sessionCount = await prisma.session.count({
      where: { associateId: identity.associateId, status: 'completed' },
    });
    const gapScores = await prisma.gapScore.findMany({
      where: { associateId: identity.associateId, topic: '' },
      select: { weightedScore: true },
      orderBy: { weightedScore: 'asc' },
    });
    const avgScore =
      gapScores.length > 0
        ? Math.round(
            gapScores.reduce((s, g) => s + g.weightedScore, 0) / gapScores.length
          )
        : null;

    readiness = {
      status: associate?.readinessStatus ?? 'not_ready',
      recommendedArea: associate?.recommendedArea ?? null,
      score: avgScore,
      sessionCount,
    };
  }

  return (
    <ProfileTabs
      profile={{
        displayName: profile.displayName,
        githubUsername: profile.githubUsername,
        bio: profile.bio,
        learningGoals: profile.learningGoals,
      }}
      email={identity.email}
      role={identity.kind}
      readiness={readiness}
    />
  );
}
