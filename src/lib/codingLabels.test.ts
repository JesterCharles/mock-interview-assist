/**
 * codingLabels.test.ts
 *
 * Phase 42 Plan 02 — validates the single-source-of-truth dialect label exports
 * and the two helper functions (`getLanguageDialectLabel`, `isSqlDialectChallenge`).
 *
 * The literal string invariant (grep returns exactly one file) is enforced in
 * the plan verify step, not here — these are pure unit tests for the helpers.
 */

import { describe, it, expect } from 'vitest';
import {
  SQL_DIALECT_LABEL,
  getLanguageDialectLabel,
  isSqlDialectChallenge,
} from './codingLabels';

describe('SQL_DIALECT_LABEL', () => {
  it('exposes the verbatim dialect string per D-07', () => {
    expect(SQL_DIALECT_LABEL).toBe('SQL fundamentals (SQLite dialect)');
  });
});

describe('getLanguageDialectLabel', () => {
  it('returns the dialect label for sql', () => {
    expect(getLanguageDialectLabel('sql')).toBe(SQL_DIALECT_LABEL);
  });

  it('returns null for non-sql languages', () => {
    expect(getLanguageDialectLabel('python')).toBeNull();
    expect(getLanguageDialectLabel('javascript')).toBeNull();
    expect(getLanguageDialectLabel('typescript')).toBeNull();
    expect(getLanguageDialectLabel('java')).toBeNull();
    expect(getLanguageDialectLabel('csharp')).toBeNull();
    expect(getLanguageDialectLabel('')).toBeNull();
  });
});

describe('isSqlDialectChallenge', () => {
  it('returns true when challenge.language === "sql"', () => {
    expect(isSqlDialectChallenge({ language: 'sql' })).toBe(true);
  });

  it('returns true when challenge.languages includes "sql"', () => {
    expect(isSqlDialectChallenge({ languages: ['python', 'sql'] })).toBe(true);
    expect(isSqlDialectChallenge({ languages: ['sql'] })).toBe(true);
  });

  it('returns false for non-sql language strings and arrays', () => {
    expect(isSqlDialectChallenge({ language: 'python' })).toBe(false);
    expect(isSqlDialectChallenge({ languages: ['python', 'java'] })).toBe(false);
  });

  it('returns false when no language fields are present', () => {
    expect(isSqlDialectChallenge({})).toBe(false);
  });

  it('accepts both shapes simultaneously (language + languages)', () => {
    expect(
      isSqlDialectChallenge({ language: 'python', languages: ['sql'] }),
    ).toBe(true);
    expect(
      isSqlDialectChallenge({ language: 'sql', languages: ['python'] }),
    ).toBe(true);
  });
});
