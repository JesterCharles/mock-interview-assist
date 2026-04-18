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

/**
 * Per-topic weight cap for the skill aggregate — Phase 41 WR-02 / IN-01.
 *
 * `GapScore.sessionCount` has divergent semantics across source paths:
 *   • interview path (`saveGapScores`) — distinct completed-session count
 *   • coding path (`persistCodingSignalToGapScore`) — raw attempt count
 *
 * Without a cap, an associate can farm the trainer-visible skill score by
 * submitting many easy-or-identical coding attempts against one topic (the
 * difficulty multipliers block easy-score farming, but attempt-count farming
 * sneaks in via the `weightedScore × sessionCount` weighting below). Capping
 * each topic row's weight at 10 preserves signal (more reps = more confidence)
 * while bounding any single topic's influence on the cross-topic mean.
 *
 * The cap is applied to the *weighting* only — `attemptCount` returned to the
 * client is still the raw sum (useful for the trainer UI to surface volume).
 */
const MAX_WEIGHT_PER_TOPIC = 10;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  // Auth — trainer/admin only. Associates (even matching slug) get 403.
  // Anonymous → 401 (not signed in), authenticated non-trainer → 403 (forbidden).
  // HTTP semantics per Phase 41 WR-01.
  const caller = await getCallerIdentity(); // [AUDIT-VERIFIED: P20]
  if (caller.kind === 'anonymous') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    //
    // WR-02/IN-01: cap the per-topic weight at MAX_WEIGHT_PER_TOPIC to prevent
    // attempt-count farming via the coding path (where sessionCount is a raw
    // attempt tally, not a distinct-session count). `attemptCount` returned to
    // the client remains the raw sum for UI volume display.
    const acc = new Map<
      string,
      { weightedSum: number; weightSum: number; attemptSum: number }
    >();
    for (const row of gapRows) {
      const bucket =
        acc.get(row.skill) ?? { weightedSum: 0, weightSum: 0, attemptSum: 0 };
      const cappedWeight = Math.min(row.sessionCount, MAX_WEIGHT_PER_TOPIC);
      bucket.weightedSum += row.weightedScore * cappedWeight;
      bucket.weightSum += cappedWeight;
      bucket.attemptSum += row.sessionCount;
      acc.set(row.skill, bucket);
    }
    const codingSkillScores: CodingSkillScore[] = Array.from(acc.entries()).map(
      ([skillSlug, { weightedSum, weightSum, attemptSum }]) => ({
        skillSlug,
        score: weightSum > 0 ? weightedSum / weightSum : 0,
        attemptCount: attemptSum,
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
