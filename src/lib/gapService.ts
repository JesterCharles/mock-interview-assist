/**
 * Gap Scoring Algorithm — pure functions, no DB imports.
 * Computes recency-weighted gap scores from interview session data.
 */

import type { QuestionAssessment, InterviewSession } from '@/lib/types';

export interface GapScoreInput {
  skill: string;
  topic: string; // "" for skill-level
  weightedScore: number;
  sessionCount: number;
}

export function recencyWeightedAverage(_scores: number[]): number {
  throw new Error('Not implemented');
}

export function extractScore(_assessment: QuestionAssessment): number | null {
  throw new Error('Not implemented');
}

export function extractSkillTopicScores(
  _session: InterviewSession,
): Map<string, Map<string, number[]>> {
  throw new Error('Not implemented');
}

export function computeGapScores(_sessions: InterviewSession[]): GapScoreInput[] {
  throw new Error('Not implemented');
}
