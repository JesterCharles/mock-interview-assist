/**
 * Phase 44 Plan 01 — HARD-01 + HARD-02 fixture shape coverage.
 *
 * Wave-1 load + abuse harnesses ship 10 + 6 JSON fixtures; the plan's
 * <verify> block only asserts each file parses and has a non-empty
 * `expectedContainment` array. This test codifies the D-02 language
 * distribution (2 py / 2 js / 2 ts / 2 java / 1 sql / 1 csharp) and the
 * D-05 payload-class coverage so drift is caught pre-merge instead of at
 * the deployed-stack gate.
 *
 * The empirical run against the Phase 43 stack remains deployment-gated
 * (tracked in 44-VALIDATION-GAPS.md) — this test fills only the portion
 * verifiable without a live Judge0.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { CODING_LANGUAGES, type CodingLanguage } from '../../src/lib/coding-bank-schemas';

const LOAD_DIR = path.resolve(__dirname, '..', 'load-test-fixtures');
const ABUSE_DIR = path.resolve(__dirname, '..', 'abuse-test-fixtures');

interface LoadFixture {
  challengeId: string;
  language: CodingLanguage;
  code: string;
  expectedVerdict: string;
}

interface AbuseFixture {
  name: string;
  challengeId: string;
  languages: Partial<Record<CodingLanguage, string>>;
  expectedContainment: string[];
}

function loadJson<T>(dir: string): Array<{ file: string; data: T }> {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({
      file: f,
      data: JSON.parse(readFileSync(path.join(dir, f), 'utf8')) as T,
    }));
}

describe('load-test fixtures (HARD-01 / D-02)', () => {
  const fixtures = loadJson<LoadFixture>(LOAD_DIR);

  it('ships exactly 10 fixtures', () => {
    expect(fixtures).toHaveLength(10);
  });

  it('every fixture has challengeId, language, and non-empty code', () => {
    for (const { file, data } of fixtures) {
      expect(typeof data.challengeId, `${file}: challengeId type`).toBe('string');
      expect(data.challengeId.length, `${file}: challengeId non-empty`).toBeGreaterThan(0);
      expect(CODING_LANGUAGES, `${file}: language allowlisted`).toContain(data.language);
      expect(typeof data.code, `${file}: code type`).toBe('string');
      expect(data.code.length, `${file}: code non-empty`).toBeGreaterThan(0);
    }
  });

  it('D-02 language distribution: 2 python / 2 js / 2 ts / 2 java / 1 sql / 1 csharp', () => {
    const counts: Partial<Record<CodingLanguage, number>> = {};
    for (const { data } of fixtures) {
      counts[data.language] = (counts[data.language] ?? 0) + 1;
    }
    expect(counts).toEqual({
      python: 2,
      javascript: 2,
      typescript: 2,
      java: 2,
      sql: 1,
      csharp: 1,
    });
  });

  it('challengeIds are unique across fixtures', () => {
    const ids = fixtures.map((f) => f.data.challengeId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('abuse-test fixtures (HARD-02 / D-05)', () => {
  const fixtures = loadJson<AbuseFixture>(ABUSE_DIR);
  const REQUIRED_PAYLOAD_CLASSES = [
    'fork-bomb',
    'infinite-loop',
    'network-egress',
    'stdout-flood',
    'memory-bomb',
    'fd-bomb',
  ] as const;

  it('ships all 6 D-05 payload classes', () => {
    const names = fixtures.map((f) => f.data.name).sort();
    expect(names).toEqual([...REQUIRED_PAYLOAD_CLASSES].sort());
  });

  it('every fixture declares at least one language payload with non-empty source', () => {
    for (const { file, data } of fixtures) {
      const langs = Object.entries(data.languages);
      expect(langs.length, `${file}: at least one language payload`).toBeGreaterThan(0);
      for (const [lang, src] of langs) {
        expect(CODING_LANGUAGES, `${file}: ${lang} in allowlist`).toContain(lang);
        expect(typeof src, `${file}: ${lang} source is string`).toBe('string');
        expect((src as string).length, `${file}: ${lang} source non-empty`).toBeGreaterThan(0);
      }
    }
  });

  it('every fixture has a non-empty expectedContainment allowlist', () => {
    const VALID_VERDICTS = new Set([
      'pass',
      'fail',
      'timeout',
      'mle',
      'runtime_error',
      'compile_error',
    ]);
    for (const { file, data } of fixtures) {
      expect(Array.isArray(data.expectedContainment), `${file}: array`).toBe(true);
      expect(data.expectedContainment.length, `${file}: non-empty`).toBeGreaterThan(0);
      for (const v of data.expectedContainment) {
        expect(VALID_VERDICTS, `${file}: ${v} is a valid Judge0 verdict`).toContain(v);
      }
    }
  });

  it('challengeIds are unique across abuse fixtures', () => {
    const ids = fixtures.map((f) => f.data.challengeId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
