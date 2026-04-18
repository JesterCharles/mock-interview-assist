#!/usr/bin/env tsx
/**
 * scripts/validate-challenge.ts — Plan 44-03 Task 1 (HARD-04 / D-13)
 *
 * Local validator for trainer-authored coding challenges. Imports Phase 37's
 * Zod schemas from `@/lib/coding-bank-schemas` so the CLI and the server
 * loader share a single source of truth (T-44-05 mitigation).
 *
 * USAGE:
 *   npm run validate-challenge ./challenges/my-new-challenge
 *
 * Expected challenge directory layout (CODING-BANK-01):
 *   challenges/<slug>/
 *     meta.json
 *     README.md
 *     starters/<lang>.<ext>   (one per declared language)
 *     visible-tests.json
 *     hidden-tests.json       (optional locally — private repo only)
 *
 * EXIT CODES:
 *   0  valid
 *   1  CLI/usage error (missing arg, path not found)
 *   2  validation failures (each issue printed to stderr)
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  LANGUAGE_EXTENSIONS,
  validateChallenge,
  ChallengeValidationError,
  type RawChallenge,
} from '../src/lib/coding-bank-schemas';

function printUsage(): void {
  console.error('Usage: npm run validate-challenge <path-to-challenge-dir>');
  console.error('  Example: npm run validate-challenge ./challenges/two-sum');
}

interface LoadResult {
  raw: RawChallenge;
  hasHiddenTests: boolean;
}

function loadChallengeDir(dirPath: string): LoadResult {
  const metaPath = path.join(dirPath, 'meta.json');
  const visiblePath = path.join(dirPath, 'visible-tests.json');
  const hiddenPath = path.join(dirPath, 'hidden-tests.json');
  const startersDir = path.join(dirPath, 'starters');

  if (!fs.existsSync(metaPath)) {
    throw new Error(`meta.json not found at ${metaPath}`);
  }
  if (!fs.existsSync(visiblePath)) {
    throw new Error(`visible-tests.json not found at ${visiblePath}`);
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const visibleTests = JSON.parse(fs.readFileSync(visiblePath, 'utf8'));

  const hasHiddenTests = fs.existsSync(hiddenPath);
  // Public-repo workflow: trainer authors the challenge in the public repo;
  // hidden-tests.json lives only in the private repo and is intentionally
  // absent locally. We substitute an empty array so Phase 37's validator
  // (which requires the field) accepts the shape without claiming the hidden
  // suite is validated — we print a NOTE so the trainer knows to submit the
  // hidden tests separately to the private repo.
  const hiddenTests: unknown = hasHiddenTests
    ? JSON.parse(fs.readFileSync(hiddenPath, 'utf8'))
    : [];

  // Load starters map. Phase 37's StarterSchema accepts keys matching
  // CODING_LANGUAGES and maps each to source. Walk the starters/ dir and
  // populate by file extension.
  const starters: Record<string, string> = {};
  if (fs.existsSync(startersDir)) {
    for (const [lang, ext] of Object.entries(LANGUAGE_EXTENSIONS)) {
      const starterFile = path.join(startersDir, `${lang}.${ext}`);
      if (fs.existsSync(starterFile)) {
        starters[lang] = fs.readFileSync(starterFile, 'utf8');
      }
    }
  }

  return {
    raw: { meta, visibleTests, hiddenTests, starters },
    hasHiddenTests,
  };
}

function main(): void {
  const dirPath = process.argv[2];
  if (!dirPath) {
    printUsage();
    process.exit(1);
  }
  const resolved = path.resolve(dirPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    console.error(`Directory not found: ${resolved}`);
    process.exit(1);
  }

  let loaded: LoadResult;
  try {
    loaded = loadChallengeDir(resolved);
  } catch (err) {
    console.error(`Failed to load challenge: ${(err as Error).message}`);
    process.exit(2);
  }

  if (!loaded.hasHiddenTests) {
    console.log(
      '[validate-challenge] NOTE: hidden-tests.json not present — skipping hidden-test validation (expected in local public-repo workflow).',
    );
  }

  try {
    const validated = validateChallenge(loaded.raw);
    const slug = validated.meta.slug;
    const lang = validated.meta.languages.join(', ');
    const diff = validated.meta.difficulty;
    const skillSlug = validated.meta.skillSlug;
    const nVisible = validated.visibleTests.length;
    const nHidden = validated.hiddenTests.length;
    console.log(`[validate-challenge] ✓ Valid challenge: ${slug}`);
    console.log(`  languages: ${lang}`);
    console.log(`  difficulty: ${diff}`);
    console.log(`  skillSlug: ${skillSlug}`);
    console.log(`  visible tests: ${nVisible}`);
    if (loaded.hasHiddenTests) {
      console.log(`  hidden tests: ${nHidden}`);
    } else {
      console.log(`  hidden tests: (not validated locally)`);
    }
    process.exit(0);
  } catch (err) {
    if (err instanceof ChallengeValidationError) {
      console.error(`[validate-challenge] ✗ Validation failed`);
      console.error(`  path:   ${err.path}`);
      console.error(`  reason: ${err.reason}`);
      if (err.slug) console.error(`  slug:   ${err.slug}`);
      process.exit(2);
    }
    console.error(`[validate-challenge] ✗ Unexpected error:`, err);
    process.exit(2);
  }
}

main();
