export type ScoreColor = {
  token: string; // CSS custom property name
  label: string; // human-readable band name
};

/**
 * Maps a numeric score (0-100) to a CSS color token per the 5-band system.
 * Returns null for unassessed (no score).
 *
 * Bands:
 *  0-40  → danger  (Needs work)
 *  41-60 → warning (Developing)
 *  61-79 → accent  (Progressing)
 *  80-89 → success (Proficient)
 *  90-100 → mastery (Mastered)
 */
export function getScoreColor(score: number | null | undefined): ScoreColor | null {
  if (score === null || score === undefined) return null;
  if (score <= 40) return { token: 'var(--danger)', label: 'Needs work' };
  if (score <= 60) return { token: 'var(--warning)', label: 'Developing' };
  if (score <= 79) return { token: 'var(--accent)', label: 'Progressing' };
  if (score <= 89) return { token: 'var(--success)', label: 'Proficient' };
  return { token: 'var(--mastery, #3B82C8)', label: 'Mastered' };
}
