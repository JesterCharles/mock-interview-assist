/**
 * Gap Scoring Algorithm — pure functions, no DB imports.
 * Computes recency-weighted gap scores from interview session data.
 *
 * Uses 0.8 decay factor: newest session has weight 1.0,
 * next oldest 0.8, then 0.64, etc.
 */

import type { QuestionAssessment, InterviewSession } from '@/lib/types';

const DECAY_FACTOR = 0.8;

export interface GapScoreInput {
  skill: string;
  topic: string; // "" for skill-level
  weightedScore: number;
  sessionCount: number;
}

/**
 * Validates that a score is within the acceptable 0-100 range.
 * Mitigates T-04-03: tampered/invalid score data.
 */
function isValidScore(score: number): boolean {
  return score >= 0 && score <= 100;
}

/**
 * Compute recency-weighted average of scores (newest first).
 * Applies 0.8^index decay. Filters out scores outside 0-100 range.
 * Returns 0 for empty input.
 */
export function recencyWeightedAverage(scores: number[]): number {
  const valid = scores.filter(isValidScore);
  if (valid.length === 0) return 0;

  let weightedSum = 0;
  let weightTotal = 0;

  for (let i = 0; i < valid.length; i++) {
    const weight = Math.pow(DECAY_FACTOR, i);
    weightedSum += valid[i] * weight;
    weightTotal += weight;
  }

  return weightedSum / weightTotal;
}

/**
 * Extract usable score from an assessment.
 * Prefers finalScore over llmScore. Returns null if:
 * - didNotGetTo is true (skipped question)
 * - neither score exists
 * - score is outside 0-100 range
 */
export function extractScore(assessment: QuestionAssessment): number | null {
  if (assessment.didNotGetTo) return null;

  if (assessment.finalScore !== undefined) {
    return isValidScore(assessment.finalScore) ? assessment.finalScore : null;
  }

  if (assessment.llmScore !== undefined) {
    return isValidScore(assessment.llmScore) ? assessment.llmScore : null;
  }

  return null;
}

/**
 * Parse a single session's assessments into a nested map:
 * skill -> topic -> scores[]
 *
 * Uses techMap to resolve weekNumber to skill name.
 * Filters out starter questions (id prefix "starter-") and skipped questions.
 * Normalizes keywords to lowercase/trimmed.
 * Skill-level aggregate uses topic key "".
 */
export function extractSkillTopicScores(
  session: InterviewSession,
): Map<string, Map<string, number[]>> {
  const result = new Map<string, Map<string, number[]>>();

  if (!session.techMap) return result;

  for (const question of session.questions) {
    // Skip starter questions
    if (question.id.startsWith('starter-')) continue;

    // Resolve skill from techMap
    const skill = session.techMap[question.weekNumber];
    if (!skill) continue;

    // Get assessment and extract score
    const assessment = session.assessments[question.id];
    if (!assessment) continue;

    const score = extractScore(assessment);
    if (score === null) continue;

    // Ensure skill map exists
    if (!result.has(skill)) {
      result.set(skill, new Map<string, number[]>());
    }
    const skillMap = result.get(skill)!;

    // Add to skill-level aggregate (topic = "")
    if (!skillMap.has('')) {
      skillMap.set('', []);
    }
    skillMap.get('')!.push(score);

    // Add to each topic (normalized keyword)
    for (const keyword of question.keywords) {
      const normalizedTopic = keyword.trim().toLowerCase();
      if (!skillMap.has(normalizedTopic)) {
        skillMap.set(normalizedTopic, []);
      }
      skillMap.get(normalizedTopic)!.push(score);
    }
  }

  return result;
}

/**
 * Compute mean of an array of numbers.
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Compute gap scores across multiple sessions (newest first).
 *
 * For each skill and topic:
 * 1. Each session contributes one average score (mean of that session's question scores)
 * 2. Per-session averages are fed to recencyWeightedAverage with 0.8 decay
 *
 * Returns array of GapScoreInput ready for Prisma upsert (no DB calls here).
 */
export function computeGapScores(
  sessions: InterviewSession[],
): GapScoreInput[] {
  if (sessions.length === 0) return [];

  // Collect per-session averages: skill -> topic -> sessionAvg[]
  const perSessionScores = new Map<string, Map<string, number[]>>();

  for (const session of sessions) {
    const sessionScores = extractSkillTopicScores(session);

    for (const [skill, topicMap] of sessionScores) {
      if (!perSessionScores.has(skill)) {
        perSessionScores.set(skill, new Map<string, number[]>());
      }
      const aggregateTopicMap = perSessionScores.get(skill)!;

      for (const [topic, scores] of topicMap) {
        if (!aggregateTopicMap.has(topic)) {
          aggregateTopicMap.set(topic, []);
        }
        // Each session contributes one average score for this skill/topic
        aggregateTopicMap.get(topic)!.push(mean(scores));
      }
    }
  }

  // Convert to GapScoreInput[] with recency-weighted averages
  const results: GapScoreInput[] = [];

  for (const [skill, topicMap] of perSessionScores) {
    for (const [topic, sessionAverages] of topicMap) {
      results.push({
        skill,
        topic,
        weightedScore: recencyWeightedAverage(sessionAverages),
        sessionCount: sessionAverages.length,
      });
    }
  }

  return results;
}
