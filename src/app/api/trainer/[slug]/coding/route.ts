/**
 * GET /api/trainer/[slug]/coding — Phase 41 Plan 02 Task 1
 *
 * Trainer-only per CODING-SCORE-03 / D-07. Returns:
 *   { attempts: CodingAttemptSummary[], codingSkillScores: CodingSkillScore[] }
 *
 * Hidden-test shield: attempt fields are whitelisted explicitly (no spread,
 * no ...attempt). Hidden test fixture content (stdin, expectedStdout,
 * hiddenTestResults detail, submittedCode) never crosses this boundary.
 */

import { NextResponse } from 'next/server';
import { getCallerIdentity } from '@/lib/identity';
import { prisma } from '@/lib/prisma';
import type {
  CodingAttemptSummary,
  CodingSkillScore,
  AssociateCodingPayload,
} from '@/lib/trainer-types';

// Same pattern as sibling /api/trainer/[slug]/route.ts (T-06-04 defense-in-depth).
const SLUG_RE = /^[a-z0-9-]+$/;

const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
function validDifficulty(raw: unknown): 'easy' | 'medium' | 'hard' {
  return typeof raw === 'string' && VALID_DIFFICULTIES.has(raw)
    ? (raw as 'easy' | 'medium' | 'hard')
    : 'medium';
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  // Auth — trainer/admin only. Associates (even matching slug) get 401.
  const caller = await getCallerIdentity(); // [AUDIT-VERIFIED: P20]
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { slug } = await params;
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
  }

  try {
    const associate = await prisma.associate.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });
    if (!associate) {
      return NextResponse.json({ error: 'Associate not found' }, { status: 404 });
    }

    const [attemptRows, gapRows] = await Promise.all([
      prisma.codingAttempt.findMany({
        where: { associateId: associate.id },
        // Order newest first, cap at 20 per D-06 / plan guidance.
        orderBy: { submittedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          submittedAt: true,
          language: true,
          verdict: true,
          score: true,
          challenge: { select: { slug: true, title: true, difficulty: true } },
        },
      }),
      prisma.gapScore.findMany({
        where: {
          associateId: associate.id,
          topic: { startsWith: 'coding:' },
        },
        select: {
          skill: true,
          topic: true,
          weightedScore: true,
          sessionCount: true,
        },
      }),
    ]);

    // Explicit whitelist — never spread the Prisma row. Hidden-test fixture
    // fields on CodingAttempt (submittedCode, visibleTestResults,
    // hiddenTestResults, judge0Token) are excluded by selection; the shape
    // below additionally enforces the client contract.
    const attempts: CodingAttemptSummary[] = attemptRows.map((a) => ({
      id: a.id,
      submittedAt: a.submittedAt.toISOString(),
      challengeSlug: a.challenge?.slug ?? 'unknown',
      challengeTitle: a.challenge?.title ?? 'Untitled challenge',
      language: a.language,
      difficulty: validDifficulty(a.challenge?.difficulty),
      verdict: a.verdict,
      score: typeof a.score === 'number' ? a.score : null,
    }));

    // Aggregate by skill (multiple topics per skill → weighted mean across
    // rows, attemptCount sum of sessionCount).
    const acc = new Map<string, { weightedSum: number; countSum: number }>();
    for (const row of gapRows) {
      const bucket = acc.get(row.skill) ?? { weightedSum: 0, countSum: 0 };
      bucket.weightedSum += row.weightedScore * row.sessionCount;
      bucket.countSum += row.sessionCount;
      acc.set(row.skill, bucket);
    }
    const codingSkillScores: CodingSkillScore[] = Array.from(acc.entries()).map(
      ([skillSlug, { weightedSum, countSum }]) => ({
        skillSlug,
        score: countSum > 0 ? weightedSum / countSum : 0,
        attemptCount: countSum,
      }),
    );

    const payload: AssociateCodingPayload = { attempts, codingSkillScores };
    return NextResponse.json(payload);
  } catch (error) {
    console.error('[/api/trainer/[slug]/coding] Failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coding data' },
      { status: 500 },
    );
  }
}
