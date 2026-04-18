/**
 * coding-challenge-service.ts
 *
 * Server-side loader for the two-repo challenge bank (public + private).
 * Mirrors the pattern of src/lib/github-service.ts for public calls and
 * src/lib/githubManifestCache.ts for ETag + TTL caching.
 *
 * SECURITY BOUNDARY (Phase 37 CONTEXT D-05):
 *   - Public content (README, meta, visible-tests, starters) routes through
 *     the existing `/api/github` proxy path — token stays server-side.
 *   - Hidden tests are fetched by `loadHiddenTests()` via a DEDICATED
 *     server-only helper that calls api.github.com directly with
 *     GITHUB_CODING_PRIVATE_TOKEN. MUST NOT extend `/api/github`.
 *
 * Contract types:
 *   - listChallenges(cohortId?)      → manifest (public-safe)
 *   - loadChallenge(slug)            → FullChallenge (no hidden tests in type)
 *   - loadHiddenTests(slug)          → HiddenTestCase[] (server-only callers)
 *   - syncChallengeToDb(slug)        → Prisma upsert (idempotent per D-14)
 *   - invalidateCache(scope?)        → clears module cache (test + refresh hook)
 *
 * Plan 37-01 publishes the skeleton. Plan 37-02 implements fetch + cache + sync.
 * Plan 37-03 adds POST /api/coding/bank/refresh which calls syncChallengeToDb().
 */

import 'server-only';
import type { z } from 'zod';
import type { CodingChallenge, CodingTestCase } from '@/generated/prisma';
import type {
  CodingLanguage,
  MetaSchema,
  VisibleTestsSchema,
  HiddenTestsSchema,
} from './coding-bank-schemas';

// ---------------------------------------------------------------------------
// Public contract types (stable — Plan 02 implements bodies)
// ---------------------------------------------------------------------------

export interface ChallengeManifestEntry {
  slug: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  cohortId: number | null;
  skillSlug: string;
  languages: CodingLanguage[];
}

/**
 * Shape returned by loadChallenge(). INTENTIONALLY excludes hidden tests —
 * the type itself enforces the D-05 security boundary. Callers that need
 * hidden tests must use loadHiddenTests() in a server-only context.
 */
export interface FullChallenge {
  slug: string;
  meta: z.infer<typeof MetaSchema>;
  readme: string;
  starters: Partial<Record<CodingLanguage, string>>;
  visibleTests: z.infer<typeof VisibleTestsSchema>;
}

export type HiddenTestCase = z.infer<typeof HiddenTestsSchema>[number];

export interface SyncResult {
  challenge: CodingChallenge;
  cases: CodingTestCase[];
}

// ---------------------------------------------------------------------------
// Skeleton exports — Plan 37-02 replaces bodies
// ---------------------------------------------------------------------------

const NOT_IMPLEMENTED = 'Not implemented — see Plan 37-02 (fetch + cache + sync).';

export async function listChallenges(_cohortId?: number): Promise<ChallengeManifestEntry[]> {
  throw new Error(NOT_IMPLEMENTED);
}

export async function loadChallenge(_slug: string): Promise<FullChallenge> {
  throw new Error(NOT_IMPLEMENTED);
}

export async function loadHiddenTests(_slug: string): Promise<HiddenTestCase[]> {
  throw new Error(NOT_IMPLEMENTED);
}

export async function syncChallengeToDb(_slug: string): Promise<SyncResult> {
  throw new Error(NOT_IMPLEMENTED);
}

export function invalidateCache(_scope?: string): number {
  // Plan 02 wires actual cache; skeleton returns 0.
  return 0;
}
