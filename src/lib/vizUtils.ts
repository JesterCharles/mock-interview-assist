/**
 * vizUtils.ts — Shared visualization utility functions for associate dashboard.
 * All functions are pure (no React, no DB). Used by SkillCardList, FocusHero,
 * SkillRadar, SkillTrendChart components.
 *
 * Score coloring per DESIGN.md D-15:
 *   Red (--danger)    0-40%
 *   Orange (--warning) 41-60%
 *   Yellow (--accent)  61-79%
 *   Green (--success)  80-89%
 *   Blue (--mastery)   90-100%
 */

export type TrendDirection = 'up' | 'down' | 'flat';

/**
 * D-15: 5-band score color mapping. Input is percentage 0-100.
 * Clamps to valid range; handles NaN gracefully.
 */
export function getScoreColor(percent: number): string {
  if (Number.isNaN(percent)) return 'var(--danger)';
  const clamped = Math.max(0, Math.min(100, percent));
  if (clamped <= 40) return 'var(--danger)';
  if (clamped <= 60) return 'var(--warning)';
  if (clamped <= 79) return 'var(--accent)';
  if (clamped <= 89) return 'var(--success)';
  return 'var(--mastery)';
}

/**
 * D-04: Trend arrow direction from slope.
 * up (>1), down (<-1), flat (-1 to 1 inclusive)
 */
export function getTrendDirection(slope: number): TrendDirection {
  if (slope > 1) return 'up';
  if (slope < -1) return 'down';
  return 'flat';
}

/**
 * DESIGN.md trajectory vocabulary. Input is slope (pts/session).
 * ascending  — slope > +3
 * climbing   — slope +1 to +3 (inclusive)
 * holding    — slope -1 to +1 (exclusive of climbing/dipping boundaries)
 * dipping    — slope -3 to -1 (inclusive)
 * stalling   — slope < -3
 */
export function getTrajectoryWord(
  slope: number
): 'ascending' | 'climbing' | 'holding' | 'dipping' | 'stalling' {
  if (slope > 3) return 'ascending';
  if (slope >= 1) return 'climbing';
  if (slope > -1) return 'holding';
  if (slope >= -3) return 'dipping';
  return 'stalling';
}

/**
 * Narrative word derived from trajectory.
 */
function trajectoryToNarrativeWord(
  word: 'ascending' | 'climbing' | 'holding' | 'dipping' | 'stalling'
): string {
  switch (word) {
    case 'ascending':
    case 'climbing':
      return 'Improving';
    case 'holding':
      return 'Holding steady';
    case 'dipping':
      return 'Slipping';
    case 'stalling':
      return 'Needs focus';
  }
}

/**
 * D-08, D-25: Narrative format "Improving +8pts over 3 sessions"
 * Parameters: slope (for word), pointsDelta (signed int), sessionCount
 */
export function getTrajectoryNarrative(
  slope: number,
  pointsDelta: number,
  sessionCount: number
): string {
  const word = getTrajectoryWord(slope);
  const narrativeWord = trajectoryToNarrativeWord(word);

  if (word === 'holding') {
    return `Holding steady over ${sessionCount} sessions`;
  }

  const sign = pointsDelta >= 0 ? '+' : '';
  return `${narrativeWord} ${sign}${pointsDelta}pts over ${sessionCount} sessions`;
}

/**
 * Compute per-skill trend from session summaries and gap scores.
 *
 * Since per-session per-skill scores aren't stored individually (GapScore is an
 * aggregate), this function uses the overall session technical scores as a proxy
 * for trend direction. The gapScore entry provides the session count.
 *
 * Returns slope=-1 when fewer than 3 sessions (insufficient data).
 */
export function computeSkillTrend(
  sessions: Array<{
    date: string;
    assessments: Record<string, { llmScore?: number; finalScore?: number }>;
    overallTechnicalScore?: number | null;
  }>,
  skill: string,
  gapScores: Array<{ skill: string; topic: string | null; weightedScore: number; sessionCount: number }>
): { slope: number; pointsDelta: number; sessionCount: number } {
  // Find the skill-level gap score entry (topic === '' or null)
  const skillEntry = gapScores.find(
    (g) => g.skill === skill && (g.topic === null || g.topic === '')
  );

  const sessionCount = skillEntry?.sessionCount ?? 0;

  if (sessionCount < 3) {
    return { slope: -1, pointsDelta: 0, sessionCount };
  }

  // Use overall technical scores from sessions (sorted chronologically)
  // as a proxy for the skill's trajectory.
  const scoredSessions = sessions
    .filter((s) => s.overallTechnicalScore != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-Math.min(sessionCount, 20)); // cap at 20 sessions

  if (scoredSessions.length < 3) {
    return { slope: -1, pointsDelta: 0, sessionCount };
  }

  const scores = scoredSessions.map((s) => s.overallTechnicalScore as number);
  const n = scores.length;

  // Linear regression slope
  const xMean = (n - 1) / 2;
  const yMean = scores.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (scores[i] - yMean);
    denominator += (i - xMean) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const pointsDelta = Math.round(scores[n - 1] - scores[0]);

  return { slope, pointsDelta, sessionCount };
}
