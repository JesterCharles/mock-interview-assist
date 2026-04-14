/**
 * Adaptive setup utilities for pre-populating the interview setup wizard
 * with gap-informed technology weights.
 *
 * Decision source: 07-CONTEXT.md D-02
 * Lowest gap score skill gets weight 5 (most practice needed).
 * Highest gap score skill gets weight 1 (least practice needed).
 * Linear interpolation between.
 */

/** Shape of a single skill's gap score as returned by the gap scores API. */
export interface SkillGapScore {
  /** Tech file path matching GitHubFile.path, e.g. "react/question-bank-v1.md" */
  skill: string;
  /** Recency-weighted score in range 0.0 (weakest) – 1.0 (strongest) */
  weightedScore: number;
}

/**
 * Full API response shape from GET /api/associates/[slug]/gap-scores.
 * Consumed by the dashboard setup wizard to drive pre-population.
 */
export interface GapScoreResponse {
  /** false = new/unknown associate → fall through to manual mode */
  found: boolean;
  /** Number of completed sessions — < 3 = cold start, use manual mode */
  sessionCount: number;
  /** Skill-level gap scores (topic: null in DB) */
  scores: SkillGapScore[];
}

/**
 * Maps gap scores to tech weight suggestions (1–5) for the setup wizard.
 *
 * Algorithm (D-02):
 *   normalized = (score - min) / (max - min)   // 0 = weakest, 1 = strongest
 *   weight = 5 - round(normalized * 4)          // invert: weak → 5, strong → 1
 *
 * Edge cases:
 * - Empty input → empty object
 * - All equal scores (max === min) → all weight 3 (neutral)
 * - Result clamped to [1, 5]
 */
export function mapGapScoresToWeights(
  scores: SkillGapScore[]
): Record<string, 1 | 2 | 3 | 4 | 5> {
  if (scores.length === 0) return {};

  const minScore = Math.min(...scores.map((s) => s.weightedScore));
  const maxScore = Math.max(...scores.map((s) => s.weightedScore));
  const range = maxScore - minScore;

  const result: Record<string, 1 | 2 | 3 | 4 | 5> = {};

  for (const { skill, weightedScore } of scores) {
    if (range === 0) {
      result[skill] = 3; // all scores equal — neutral weight
    } else {
      const normalized = (weightedScore - minScore) / range; // 0 = weakest, 1 = strongest
      const raw = 5 - Math.round(normalized * 4); // invert: weak → 5, strong → 1
      result[skill] = Math.max(1, Math.min(5, raw)) as 1 | 2 | 3 | 4 | 5;
    }
  }

  return result;
}
