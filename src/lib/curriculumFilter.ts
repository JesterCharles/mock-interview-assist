/**
 * curriculumFilter.ts
 *
 * Pure filter functions for matching GitHub tech files and gap scores
 * against a cohort's taught curriculum skillSlugs.
 *
 * Matching is EXACT (case-insensitive) on the first path segment.
 * NO substring matching — "react" does NOT match "react-native/...".
 * Codex finding #9: canonical skillSlug, not skillName, not partial string.
 *
 * Decision ref: 13-CONTEXT.md D-15 (revised), D-17, D-22
 */

import type { GitHubFile } from './github-service';
import type { SkillGapScore } from './adaptiveSetup';

/**
 * Extracts the first path segment of a GitHub file path, lowercased.
 * e.g. "react-native/question-bank-v1.md" → "react-native"
 *      "React/question-bank-v1.md"        → "react"
 */
function firstSegment(path: string): string {
  return path.split('/')[0].toLowerCase();
}

/**
 * Filters a list of GitHub tech files to those whose first path segment
 * exactly matches one of the taught skillSlugs (case-insensitive).
 *
 * @param techs        - Full list of GitHubFile objects from GitHub service
 * @param taughtSlugs  - Canonical skillSlugs from the cohort curriculum (taught weeks only)
 * @returns            Filtered subset of techs matching the taught slugs
 *
 * Fallback (D-17): empty taughtSlugs → returns techs unchanged (no filter applied).
 */
export function filterTechsByCurriculum(
  techs: GitHubFile[],
  taughtSlugs: string[]
): GitHubFile[] {
  if (taughtSlugs.length === 0) return techs;

  const normalizedTaught = new Set(taughtSlugs.map(s => s.toLowerCase()));

  return techs.filter(tech => normalizedTaught.has(firstSegment(tech.path)));
}

/**
 * Filters gap scores to those whose skill path first segment
 * exactly matches one of the taught skillSlugs (case-insensitive).
 *
 * Assumes SkillGapScore.skill is a path like "react/question-bank-v1.md".
 *
 * Fallback (D-17): empty taughtSlugs → returns scores unchanged.
 * Decision ref: D-22 (gap scores for untaught skills silently dropped)
 */
export function filterGapScoresByCurriculum(
  scores: SkillGapScore[],
  taughtSlugs: string[]
): SkillGapScore[] {
  if (taughtSlugs.length === 0) return scores;

  const normalizedTaught = new Set(taughtSlugs.map(s => s.toLowerCase()));

  return scores.filter(score => normalizedTaught.has(firstSegment(score.skill)));
}
