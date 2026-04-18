/**
 * Phase 36 schema-shape tests — fills validation gap for plans 36-01 + 36-02.
 *
 * These tests assert static file-level invariants of `prisma/schema.prisma` and
 * `prisma/migrations/0006_coding_challenges/migration.sql` so the Phase 36
 * requirements (CODING-MODEL-01..05) have automated coverage inside the
 * standard `npm run test` pipeline.
 *
 * Runtime idempotence (two consecutive `prisma migrate deploy` runs) remains a
 * manual smoke per 36-VALIDATION.md > Manual-Only Verifications — this file
 * only asserts the static guards that enable that behavior.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const SCHEMA = readFileSync(path.join(REPO_ROOT, 'prisma/schema.prisma'), 'utf8');
const MIGRATION = readFileSync(
  path.join(REPO_ROOT, 'prisma/migrations/0006_coding_challenges/migration.sql'),
  'utf8',
);

describe('Phase 36 — prisma/schema.prisma (CODING-MODEL-01..04)', () => {
  it('declares all 4 new coding models', () => {
    const modelLines = SCHEMA.split('\n').filter((l) => /^model Coding\w+/.test(l));
    expect(modelLines).toHaveLength(4);
    expect(SCHEMA).toMatch(/^model CodingChallenge\b/m);
    expect(SCHEMA).toMatch(/^model CodingAttempt\b/m);
    expect(SCHEMA).toMatch(/^model CodingTestCase\b/m);
    expect(SCHEMA).toMatch(/^model CodingSkillSignal\b/m);
  });

  it('adds back-relations on Associate and Cohort', () => {
    expect(SCHEMA).toMatch(/codingAttempts\s+CodingAttempt\[\]/);
    expect(SCHEMA).toMatch(/codingChallenges\s+CodingChallenge\[\]/);
  });

  it('CodingTestCase has isHidden Boolean flag (T-36-01 hidden-test isolation)', () => {
    expect(SCHEMA).toMatch(/isHidden\s+Boolean\s+@default\(false\)/);
  });

  it('CodingSkillSignal.attemptId is @unique (T-36-03 signal tampering)', () => {
    expect(SCHEMA).toMatch(/attemptId\s+String\s+@unique/);
  });

  it('enforces cascade contract D-08/D-10/D-11 (≥3 onDelete: Cascade in coding models)', () => {
    // Parse the coding-challenges section only (after the header banner)
    const codingSection = SCHEMA.split('v1.4 Coding Challenges')[1] ?? '';
    const cascadeCount = (codingSection.match(/onDelete:\s*Cascade/g) ?? []).length;
    expect(cascadeCount).toBeGreaterThanOrEqual(3);
  });

  it('uses onDelete: Restrict for CodingAttempt → CodingChallenge (D-09)', () => {
    expect(SCHEMA).toMatch(/onDelete:\s*Restrict/);
  });

  it('uses onDelete: SetNull for CodingChallenge → Cohort (D-12)', () => {
    expect(SCHEMA).toMatch(/onDelete:\s*SetNull/);
  });

  it('does NOT introduce Prisma native enum types for coding (D-03)', () => {
    // Forbidden: `enum CodingSomething { ... }`
    expect(SCHEMA).not.toMatch(/^enum\s+Coding\w+/m);
  });

  it('CodingAttempt declares Json defaults for visible and hidden test results', () => {
    expect(SCHEMA).toMatch(/visibleTestResults\s+Json\s+@default\("\[\]"\)/);
    expect(SCHEMA).toMatch(/hiddenTestResults\s+Json\s+@default\("\[\]"\)/);
  });

  it('CodingAttempt.score is nullable Float (server-computed per D-07)', () => {
    expect(SCHEMA).toMatch(/score\s+Float\?/);
  });
});

describe('Phase 36 — prisma/migrations/0006_coding_challenges (CODING-MODEL-05)', () => {
  it('creates exactly 4 coding tables with IF NOT EXISTS guards', () => {
    const createTableMatches =
      MIGRATION.match(/^CREATE TABLE IF NOT EXISTS "Coding\w+"/gm) ?? [];
    expect(createTableMatches).toHaveLength(4);
  });

  it('uses IF NOT EXISTS guards for every CREATE statement (≥14 total: 4 tables + 10 indexes)', () => {
    const guardCount = (MIGRATION.match(/IF NOT EXISTS/g) ?? []).length;
    expect(guardCount).toBeGreaterThanOrEqual(14);
  });

  it('wraps all 5 FK ADD CONSTRAINTs in DO-blocks with duplicate_object guards', () => {
    const guardMatches = MIGRATION.match(/WHEN duplicate_object THEN NULL/g) ?? [];
    expect(guardMatches).toHaveLength(5);
  });

  it('never uses invalid "ADD CONSTRAINT IF NOT EXISTS" syntax', () => {
    // Strip SQL line-comments, then check single-line occurrences only
    const noComments = MIGRATION.split('\n')
      .filter((l) => !l.trimStart().startsWith('--'))
      .join('\n');
    const invalid = noComments
      .split('\n')
      .filter((l) => /ADD CONSTRAINT\b.*\bIF NOT EXISTS\b/.test(l));
    expect(invalid).toEqual([]);
  });

  it('only adds constraints inside DO-blocks (no bare ADD CONSTRAINT outside guard)', () => {
    const addConstraints = MIGRATION.match(/ALTER TABLE .* ADD CONSTRAINT/g) ?? [];
    // Each ADD CONSTRAINT must live inside a DO $$ BEGIN ... END $$ block
    for (const stmt of addConstraints) {
      const before = MIGRATION.slice(0, MIGRATION.indexOf(stmt));
      const openBlocks = (before.match(/DO \$\$ BEGIN/g) ?? []).length;
      const closeBlocks = (before.match(/END \$\$;/g) ?? []).length;
      expect(openBlocks - closeBlocks).toBe(1); // inside an open DO-block
    }
  });

  it('declares ON DELETE RESTRICT for attempt → challenge (D-09)', () => {
    expect(MIGRATION).toMatch(/CodingAttempt_challengeId_fkey[\s\S]*?ON DELETE RESTRICT/);
  });

  it('declares ON DELETE SET NULL for challenge → cohort (D-12)', () => {
    expect(MIGRATION).toMatch(/CodingChallenge_cohortId_fkey[\s\S]*?ON DELETE SET NULL/);
  });

  it('declares ON DELETE CASCADE for associate/testcase/signal chains (≥3)', () => {
    const cascadeCount = (MIGRATION.match(/ON DELETE CASCADE/g) ?? []).length;
    expect(cascadeCount).toBeGreaterThanOrEqual(3);
  });

  it('JSONB columns have DEFAULT \'[]\' for empty-result hygiene (T-36-08)', () => {
    expect(MIGRATION).toMatch(/"visibleTestResults" JSONB NOT NULL DEFAULT '\[\]'/);
    expect(MIGRATION).toMatch(/"hiddenTestResults" JSONB NOT NULL DEFAULT '\[\]'/);
  });

  it('CodingSkillSignal_attemptId_key unique index enforces @unique constraint', () => {
    expect(MIGRATION).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS "CodingSkillSignal_attemptId_key"/,
    );
  });

  it('does not bear the Prisma "migrate dev" auto-generated header (hand-written)', () => {
    // `prisma migrate dev` stamps files; hand-written migrations start with a plain SQL comment
    expect(MIGRATION.slice(0, 200)).not.toMatch(/-- Prisma Migrate/);
  });
});
