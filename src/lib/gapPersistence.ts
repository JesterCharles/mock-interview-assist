/**
 * Gap Persistence Layer -- bridges gapService (pure algorithm) with Prisma DB.
 *
 * saveGapScores: queries sessions -> computeGapScores -> upserts to GapScore table
 * getGapScores: reads GapScore records with 3-session gate
 */

import { prisma } from '@/lib/prisma';
import { computeGapScores } from '@/lib/gapService';
import type { InterviewSession, QuestionAssessment } from '@/lib/types';

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
 * 4. Upsert each result into the GapScore table
 * 5. Clean up stale GapScore records no longer in computed results
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

  // 4. Upsert each gap score
  await Promise.all(
    gapScores.map((input) =>
      prisma.gapScore.upsert({
        where: {
          associateId_skill_topic: {
            associateId,
            skill: input.skill,
            topic: input.topic,
          },
        },
        update: {
          weightedScore: input.weightedScore,
          sessionCount: input.sessionCount,
        },
        create: {
          associateId,
          skill: input.skill,
          topic: input.topic,
          weightedScore: input.weightedScore,
          sessionCount: input.sessionCount,
        },
      }),
    ),
  );

  // 5. Delete stale GapScore records not in current computation
  const currentKeys = new Set(
    gapScores.map((g) => `${g.skill}::${g.topic}`),
  );

  const existingScores = await prisma.gapScore.findMany({
    where: { associateId },
    select: { id: true, skill: true, topic: true },
  });

  const staleIds = existingScores
    .filter((s) => !currentKeys.has(`${s.skill}::${s.topic}`))
    .map((s) => s.id);

  if (staleIds.length > 0) {
    await prisma.gapScore.deleteMany({
      where: { id: { in: staleIds } },
    });
  }
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
