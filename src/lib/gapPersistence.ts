/**
 * Gap Persistence Layer -- bridges gapService (pure algorithm) with Prisma DB.
 *
 * saveGapScores: queries sessions -> computeGapScores -> upserts to GapScore table
 * getGapScores: reads GapScore records with 3-session gate
 */

import { prisma } from '@/lib/prisma';
import { computeGapScores } from '@/lib/gapService';
import type { InterviewSession, QuestionAssessment } from '@/lib/types';

/**
 * Difficulty multiplier applied to coding-signal mappedScore BEFORE it enters
 * the GapScore table. Prevents easy-attempt farming from inflating readiness
 * (CODING-SCORE-02, Phase 41 D-02).
 *
 * Locked values:
 *   easy   × 0.7
 *   medium × 1.0
 *   hard   × 1.3
 *
 * Tune via code review only — never via env (kept a constant on purpose).
 */
export const DIFFICULTY_MULTIPLIERS: Record<'easy' | 'medium' | 'hard', number> = {
  easy: 0.7,
  medium: 1.0,
  hard: 1.3,
};

/** Shape of the `CodingSkillSignal` row fields this function consumes. */
export interface CodingSignalForGap {
  attemptId: string;
  skillSlug: string;
  signalType: 'pass' | 'partial' | 'fail' | 'compile_error' | 'timeout';
  weight: number;
  mappedScore: number;
}

/** Subset of `CodingChallenge` this function needs. */
export interface CodingChallengeForGap {
  difficulty: 'easy' | 'medium' | 'hard';
  language: string;
}

export interface GapScoreResult {
  gated: boolean;
  sessionCount: number;
  requiredSessions?: number; // only present when gated
  scores: Array<{
    skill: string;
    topic: string;
    weightedScore: number;
    sessionCount: number;
    lastUpdated: Date;
  }>;
}

const REQUIRED_SESSIONS = 3;

/**
 * Compute and persist gap scores for an associate.
 *
 * 1. Query all completed sessions for this associate (newest first)
 * 2. Convert Prisma Session records to InterviewSession-compatible objects
 * 3. Call computeGapScores from gapService.ts
 * 4. Pre-fetch existing rows once (prior weightedScore lookup + cleanup ids)
 * 5. Upsert each result into the GapScore table (captures prevWeightedScore)
 * 6. Clean up stale GapScore records no longer in computed results
 */
export async function saveGapScores(associateId: number): Promise<void> {
  // 1. Query completed sessions for this associate, newest first (Codex #5: filter status, #6: sort by date)
  const dbSessions = await prisma.session.findMany({
    where: { associateId, status: 'completed' },
    orderBy: { date: 'desc' },
  });

  if (dbSessions.length === 0) return;

  // 2. Convert to InterviewSession-compatible objects
  const sessions: InterviewSession[] = dbSessions.map((s) => ({
    id: s.id,
    candidateName: s.candidateName ?? '',
    interviewerName: s.interviewerName ?? '',
    date: s.date,
    status: s.status as InterviewSession['status'],
    questionCount: s.questionCount,
    selectedWeeks: s.selectedWeeks as number[],
    overallTechnicalScore: s.overallTechnicalScore ?? undefined,
    overallSoftSkillScore: s.overallSoftSkillScore ?? undefined,
    technicalFeedback: s.technicalFeedback ?? undefined,
    softSkillFeedback: s.softSkillFeedback ?? undefined,
    questions: s.questions as unknown as InterviewSession['questions'],
    starterQuestions: s.starterQuestions as unknown as InterviewSession['starterQuestions'],
    assessments: s.assessments as unknown as Record<string, QuestionAssessment>,
    techMap: s.techMap as Record<number, string> | undefined,
    currentQuestionIndex: 0, // Not needed for gap computation
  }));

  // 3. Compute gap scores
  const gapScores = computeGapScores(sessions);

  if (gapScores.length === 0) return;

  // 4-6. Read priors, upsert, and cleanup inside a single transaction per associate.
  // P2 fix: without a transaction, two concurrent saveGapScores for the same
  // associate can both read the same prior weightedScore and both write that
  // stale value into prevWeightedScore (lost-update / TOCTOU). Wrapping the
  // read + writes in one Prisma transaction (default READ COMMITTED) plus the
  // atomicity of each individual upsert closes the window: the prior snapshot
  // is captured inside the same transaction that performs the writes, and
  // concurrent transactions serialize on per-row upsert conflicts so the
  // later transaction observes the earlier transaction's new weightedScore.
  const currentKeys = new Set(
    gapScores.map((g) => `${g.skill}::${g.topic}`),
  );

  await prisma.$transaction(async (tx) => {
    // 4. Read existing rows INSIDE the transaction — prior-value map + cleanup ids.
    const existingScores = await tx.gapScore.findMany({
      where: { associateId },
      select: { id: true, skill: true, topic: true, weightedScore: true },
    });

    const priorByKey = new Map<string, number>();
    for (const row of existingScores) {
      priorByKey.set(`${row.skill}::${row.topic}`, row.weightedScore);
    }

    // 5. Upsert each gap score — capture prior weightedScore into prevWeightedScore.
    // D-08: "before = score as of the previous session". D-09: null on first-ever upsert.
    for (const input of gapScores) {
      const key = `${input.skill}::${input.topic}`;
      const prior = priorByKey.has(key) ? priorByKey.get(key)! : null;
      await tx.gapScore.upsert({
        where: {
          associateId_skill_topic: {
            associateId,
            skill: input.skill,
            topic: input.topic,
          },
        },
        update: {
          weightedScore: input.weightedScore,
          prevWeightedScore: prior,
          sessionCount: input.sessionCount,
        },
        create: {
          associateId,
          skill: input.skill,
          topic: input.topic,
          weightedScore: input.weightedScore,
          prevWeightedScore: null,
          sessionCount: input.sessionCount,
        },
      });
    }

    // 6. Delete stale GapScore records not in current computation (reuses existingScores).
    const staleIds = existingScores
      .filter((s) => !currentKeys.has(`${s.skill}::${s.topic}`))
      .map((s) => s.id);

    if (staleIds.length > 0) {
      await tx.gapScore.deleteMany({
        where: { id: { in: staleIds } },
      });
    }
  });
}

/**
 * Get gap scores for an associate with 3-session gate.
 *
 * Returns gated response if associate has fewer than REQUIRED_SESSIONS completed sessions.
 * Otherwise returns all GapScore records for the associate.
 */
export async function getGapScores(associateId: number): Promise<GapScoreResult> {
  // Count completed sessions only (Codex #5: consistent with gap-scores API)
  const sessionCount = await prisma.session.count({
    where: { associateId, status: 'completed' },
  });

  if (sessionCount < REQUIRED_SESSIONS) {
    return {
      gated: true,
      sessionCount,
      requiredSessions: REQUIRED_SESSIONS,
      scores: [],
    };
  }

  // Query all gap scores for this associate
  const scores = await prisma.gapScore.findMany({
    where: { associateId },
    orderBy: [{ skill: 'asc' }, { topic: 'asc' }],
  });

  return {
    gated: false,
    sessionCount,
    scores: scores.map((s) => ({
      skill: s.skill,
      topic: s.topic,
      weightedScore: s.weightedScore,
      sessionCount: s.sessionCount,
      lastUpdated: s.lastUpdated,
    })),
  };
}

/**
 * Persist a coding attempt's skill signal into the GapScore table.
 *
 * Keyed on (associateId, skill=signal.skillSlug, topic="coding:<language>") per
 * Phase 41 D-03. Applies DIFFICULTY_MULTIPLIERS[difficulty] × signal.weight to
 * signal.mappedScore before upsert (D-02). Preserves the prevWeightedScore
 * invariant (matches saveGapScores lost-update fix — read prior value inside
 * the same transaction before writing).
 *
 * NOTE: Does NOT invoke `gapService.computeGapScores` — Phase 36 contract
 * locks `gapService.ts` as unchanged (D-04). The existing recency decay is
 * applied by `readinessSweep` / next-session-triggered `saveGapScores`, which
 * aggregate this row alongside interview signals via the shared
 * (associateId, skill, topic) key.
 *
 * Contract:
 *  - Caller is fire-and-forget (poll route wraps with `.catch(log)`).
 *  - Throws on unknown difficulty (defense-in-depth against T-41-03).
 *
 * @param signal    CodingSkillSignal row fields.
 * @param challenge Subset of CodingChallenge (difficulty + language).
 * @param associateId Numeric id of the Associate owning the attempt.
 */
export async function persistCodingSignalToGapScore(
  signal: CodingSignalForGap,
  challenge: CodingChallengeForGap,
  associateId: number,
): Promise<void> {
  const multiplier = DIFFICULTY_MULTIPLIERS[challenge.difficulty];
  if (multiplier === undefined) {
    throw new Error(
      `[persistCodingSignalToGapScore] Unknown difficulty: ${challenge.difficulty}`,
    );
  }

  const weightedScore = signal.mappedScore * multiplier * signal.weight;
  const topic = `coding:${challenge.language}`;
  const skill = signal.skillSlug;

  // Transaction wraps findUnique + upsert so the prior value captured for
  // prevWeightedScore is consistent with the row we write (same lost-update
  // fix as saveGapScores lines 73-83). Concurrent calls for the same key
  // serialize on the per-row upsert conflict.
  await prisma.$transaction(async (tx) => {
    const existing = await tx.gapScore.findUnique({
      where: {
        associateId_skill_topic: { associateId, skill, topic },
      },
      select: { weightedScore: true, sessionCount: true },
    });

    const prior = existing?.weightedScore ?? null;
    const nextSessionCount = (existing?.sessionCount ?? 0) + 1;

    await tx.gapScore.upsert({
      where: {
        associateId_skill_topic: { associateId, skill, topic },
      },
      update: {
        weightedScore,
        prevWeightedScore: prior,
        sessionCount: nextSessionCount,
      },
      create: {
        associateId,
        skill,
        topic,
        weightedScore,
        prevWeightedScore: null,
        sessionCount: 1,
      },
    });
  });
}
