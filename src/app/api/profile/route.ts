import { NextResponse } from 'next/server';
import { getCallerIdentity } from '@/lib/identity';
import { getOrCreateProfile, updateProfile } from '@/lib/profileService';
import { prisma } from '@/lib/prisma';
import { z } from 'zod/v4';

const putSchema = z.object({
  displayName: z.string().max(100).nullish(),
  githubUsername: z.string().max(100).nullish(),
  bio: z.string().max(500).nullish(),
  learningGoals: z.string().max(1000).nullish(),
  passwordSetAt: z.string().nullish(),
});

export async function GET() {
  const identity = await getCallerIdentity();
  if (identity.kind === 'anonymous') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await getOrCreateProfile(identity.userId);

  // For associates, include readiness data for Learning tab (per D-08)
  let readiness = null;
  if (identity.kind === 'associate') {
    const associate = await prisma.associate.findUnique({
      where: { id: identity.associateId },
      select: {
        readinessStatus: true,
        recommendedArea: true,
        lastComputedAt: true,
      },
    });
    const sessionCount = await prisma.session.count({
      where: { associateId: identity.associateId, status: 'completed' },
    });
    const gapScores = await prisma.gapScore.findMany({
      where: { associateId: identity.associateId, topic: '' },
      select: { skill: true, weightedScore: true },
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

  return NextResponse.json({
    profile,
    role: identity.kind,
    email: identity.email,
    readiness,
  });
}

export async function PUT(request: Request) {
  const identity = await getCallerIdentity();
  if (identity.kind === 'anonymous') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { displayName, githubUsername, bio, learningGoals, passwordSetAt } = parsed.data;

  const updated = await updateProfile(identity.userId, {
    displayName: displayName ?? undefined,
    githubUsername: githubUsername ?? undefined,
    bio: bio ?? undefined,
    learningGoals: learningGoals ?? undefined,
    passwordSetAt: passwordSetAt ? new Date(passwordSetAt) : undefined,
  });

  return NextResponse.json({ profile: updated });
}
