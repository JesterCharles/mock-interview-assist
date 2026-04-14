/**
 * Readiness Classification Service
 *
 * Computes readiness status per associate from stored GapScore and Session data.
 * Pre-computed on session save so dashboard reads are instant (DASH-05).
 *
 * Classification cascade (ORDER MATTERS — Pitfall 1):
 *   1. ready:     avg >= threshold AND trend >= 0 AND sessions >= 3
 *   2. improving: sessions >= 3 AND trend > 0 (strictly positive) AND avg < threshold
 *   3. not_ready: everything else
 *
 * Trend: linear regression slope over last 3 session overall scores (oldest→newest).
 * Returns -1 when fewer than 3 sessions exist (treated as insufficient data).
 *
 * Recommended area: lowest weighted GapScore where topic != "" (non-empty = topic-level).
 * Falls back to lowest skill-level score when no topic-level scores exist.
 * Returns null when < 3 sessions.
 */

import { prisma } from '@/lib/prisma';

export type ReadinessStatus = 'ready' | 'improving' | 'not_ready';

export interface ReadinessResult {
  status: ReadinessStatus;
  recommendedArea: string | null;
  lastComputedAt: Date;
}

/**
 * Compute the linear regression slope of the last 3 session overall scores.
 *
 * Sessions are queried in DESC order (newest first), then reversed to
 * chronological order [oldest, middle, newest] for x=[0,1,2].
 *
 * Overall score is derived as: average of overallTechnicalScore and
 * overallSoftSkillScore. If both are null, defaults to 0.
 *
 * Returns -1 when fewer than 3 sessions exist (insufficient data).
 *
 * NOTE: computeTrend should only be called from inside computeReadiness,
 * after the 3-session gate has been checked. Do not call it independently
 * (Pitfall 2: associating a trend with <3-session associates).
 */
export async function computeTrend(associateId: number): Promise<number> {
  const recentSessions = await prisma.session.findMany({
    where: { associateId },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { overallTechnicalScore: true, overallSoftSkillScore: true, createdAt: true },
  });

  if (recentSessions.length < 3) return -1;

  // Reverse to chronological order: [oldest, middle, newest] → x = [0, 1, 2]
  const chronological = [...recentSessions].reverse();

  const scores = chronological.map((s) => {
    const tech = s.overallTechnicalScore ?? 0;
    const soft = s.overallSoftSkillScore ?? 0;
    // Average technical and soft skill scores for a single composite score
    if (s.overallTechnicalScore !== null && s.overallSoftSkillScore !== null) {
      return (tech + soft) / 2;
    }
    // If only one is available, use it
    return s.overallTechnicalScore ?? s.overallSoftSkillScore ?? 0;
  });

  const n = scores.length; // always 3
  const xMean = 1; // (0 + 1 + 2) / 3 = 1
  const yMean = scores.reduce((a, b) => a + b, 0) / n;

  const numerator = scores.reduce((sum, y, x) => sum + (x - xMean) * (y - yMean), 0);
  const denominator = scores.reduce((sum, _, x) => sum + (x - xMean) ** 2, 0);

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Compute readiness status for a single associate.
 *
 * @param associateId - Associate primary key (Int)
 * @param threshold   - Score threshold (0–100), default is 75
 * @returns ReadinessResult with status, recommendedArea, and timestamp
 */
export async function computeReadiness(
  associateId: number,
  threshold: number,
): Promise<ReadinessResult> {
  // Gate: < 3 sessions → not_ready immediately, no recommendation (Pitfall 2)
  const sessionCount = await prisma.session.count({ where: { associateId } });
  if (sessionCount < 3) {
    return { status: 'not_ready', recommendedArea: null, lastComputedAt: new Date() };
  }

  // Fetch skill-level GapScores (topic = "" is the skill-level aggregate)
  const skillGapScores = await prisma.gapScore.findMany({
    where: { associateId, topic: '' },
    orderBy: { weightedScore: 'asc' },
  });

  // Compute weighted average across skill-level scores
  const avg =
    skillGapScores.length > 0
      ? skillGapScores.reduce((sum, g) => sum + g.weightedScore, 0) / skillGapScores.length
      : 0;

  // Compute trend (3-session gate already passed above)
  const trend = await computeTrend(associateId);

  // Classification cascade — ORDER MATTERS (Pitfall 1):
  // Check 'ready' BEFORE 'improving' to avoid misclassifying above-threshold+positive-trend as 'improving'
  let status: ReadinessStatus;
  if (avg >= threshold && trend >= 0) {
    status = 'ready';
  } else if (trend > 0 && avg < threshold) {
    // strictly positive trend + below threshold = improving (Open Question 3: use > 0, not >= 0)
    status = 'improving';
  } else {
    status = 'not_ready';
  }

  // Recommended area: lowest weighted topic-level gap score (topic != "")
  // Falls back to lowest skill-level score if no topic records exist
  const lowestTopic = await prisma.gapScore.findFirst({
    where: { associateId, topic: { not: '' } },
    orderBy: { weightedScore: 'asc' },
  });

  let recommendedArea: string | null = lowestTopic?.topic ?? null;
  if (recommendedArea === null && skillGapScores.length > 0) {
    // Fall back to lowest skill name (already ordered ASC by weightedScore)
    recommendedArea = skillGapScores[0].skill;
  }

  return {
    status,
    recommendedArea,
    lastComputedAt: new Date(),
  };
}

/**
 * Recompute readiness for all associates and update their records.
 *
 * Synchronous batch — safe for MVP (<200 associates).
 * If scale grows, move to background task (e.g., BullMQ, Supabase Edge Function).
 *
 * Called from:
 * - Settings PUT handler when trainer changes the readiness threshold
 */
export async function recomputeAllReadiness(threshold: number): Promise<void> {
  const associates = await prisma.associate.findMany({ select: { id: true } });
  for (const { id } of associates) {
    const result = await computeReadiness(id, threshold);
    await prisma.associate.update({
      where: { id },
      data: {
        readinessStatus: result.status,
        recommendedArea: result.recommendedArea,
        lastComputedAt: result.lastComputedAt,
      },
    });
  }
}

/**
 * Compute readiness for a single associate and persist to the Associate record.
 *
 * This is the function called from the session save pipeline, after gap scores
 * have been written (Phase 4 → Phase 5 in the save pipeline).
 *
 * @param associateId - Associate primary key
 * @param threshold   - Score threshold (0–100), default is 75
 */
export async function updateAssociateReadiness(
  associateId: number,
  threshold: number,
): Promise<void> {
  const result = await computeReadiness(associateId, threshold);
  await prisma.associate.update({
    where: { id: associateId },
    data: {
      readinessStatus: result.status,
      recommendedArea: result.recommendedArea,
      lastComputedAt: result.lastComputedAt,
    },
  });
}
