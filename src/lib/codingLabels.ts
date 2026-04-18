/**
 * Coding challenge display labels — single source of truth.
 *
 * Rule (per Phase 42 §D-07): every surface that renders the dialect label MUST import
 * from this file. The literal string below MUST NOT appear anywhere else in src/. This
 * is grep-enforced by Plan 02 verify — `grep -r "SQL fundamentals (SQLite dialect)"
 * src/` should return exactly ONE file (this one).
 *
 * Rationale: the v1.4 coding stack ships SQL as SQLite-only. Associates and trainers
 * need to know this up-front — Postgres-syntax queries will fail. The label makes the
 * dialect commitment visible without requiring a footnote. Real Postgres SQL is
 * deferred to v1.5 (see PROJECT.md Out of Scope).
 */
export const SQL_DIALECT_LABEL = 'SQL fundamentals (SQLite dialect)' as const;

/**
 * Returns the display label for a coding challenge language, or null if no special
 * label applies. Callers use this to decide whether to render the subtitle slot.
 */
export function getLanguageDialectLabel(language: string): string | null {
  if (language === 'sql') return SQL_DIALECT_LABEL;
  return null;
}

/**
 * Returns true when the challenge should show the SQL dialect label. Accepts either a
 * single language string or a `languages` array — matches the challenge bank shape
 * from Phase 37 (`meta.languages: string[]`).
 */
export function isSqlDialectChallenge(challenge: {
  language?: string;
  languages?: readonly string[];
}): boolean {
  if (challenge.language === 'sql') return true;
  if (challenge.languages?.includes('sql')) return true;
  return false;
}
