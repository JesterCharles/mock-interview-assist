/**
 * Phase 38 Plan 03 — JUDGE-06 spike harness readiness.
 *
 * Validates the 10 spike-fixture payloads shipped in `scripts/judge0-spike-fixtures/`
 * are schema-conformant and cover the required language distribution
 * (2 python, 2 javascript, 2 typescript, 2 java, 1 sql, 1 csharp).
 *
 * This is the testable portion of JUDGE-06: the live spike is human-gated
 * (see SPIKE-VERIFICATION.md) but the harness inputs can be validated
 * deterministically without a docker daemon.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';

import { JUDGE0_LANGUAGE_MAP, type Judge0Language } from '../../src/lib/judge0Client';

const FIXTURE_DIR = path.resolve(__dirname, '..', 'judge0-spike-fixtures');

interface Fixture {
  name: string;
  language: Judge0Language;
  sourceCode: string;
  stdin: string;
  expectedStdout: string;
  maxWallTimeSec: number;
  notes?: string;
}

function loadFixtures(): Fixture[] {
  return readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(path.join(FIXTURE_DIR, f), 'utf-8')) as Fixture);
}

describe('judge0 spike fixtures', () => {
  const fixtures = loadFixtures();

  it('ships exactly 10 fixtures', () => {
    expect(fixtures).toHaveLength(10);
  });

  it('every fixture has all required fields with correct types', () => {
    for (const fx of fixtures) {
      expect(typeof fx.name).toBe('string');
      expect(fx.name.length).toBeGreaterThan(0);
      expect(typeof fx.language).toBe('string');
      expect(typeof fx.sourceCode).toBe('string');
      expect(fx.sourceCode.length).toBeGreaterThan(0);
      expect(typeof fx.stdin).toBe('string');
      expect(typeof fx.expectedStdout).toBe('string');
      expect(fx.expectedStdout.length).toBeGreaterThan(0);
      expect(typeof fx.maxWallTimeSec).toBe('number');
      expect(fx.maxWallTimeSec).toBeGreaterThan(0);
    }
  });

  it('every fixture targets a language in JUDGE0_LANGUAGE_MAP', () => {
    for (const fx of fixtures) {
      expect(fx.language in JUDGE0_LANGUAGE_MAP).toBe(true);
    }
  });

  it('language distribution matches spec: 2 py / 2 js / 2 ts / 2 java / 1 sql / 1 csharp', () => {
    const counts: Record<string, number> = {};
    for (const fx of fixtures) counts[fx.language] = (counts[fx.language] ?? 0) + 1;
    expect(counts).toEqual({
      python: 2,
      javascript: 2,
      typescript: 2,
      java: 2,
      sql: 1,
      csharp: 1,
    });
  });

  it('fixture names are unique', () => {
    const names = fixtures.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
