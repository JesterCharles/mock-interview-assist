/**
 * coding-challenge-service.ts
 *
 * Server-side loader for the two-repo challenge bank (public + private).
 * Mirrors src/lib/githubManifestCache.ts for module-state caching.
 *
 * SECURITY BOUNDARY (Phase 37 CONTEXT D-05):
 *   - Public content (README, meta, visible-tests, starters) is fetched via a
 *     dedicated server-only helper that calls api.github.com directly using
 *     GITHUB_TOKEN + GITHUB_CODING_PUBLIC_REPO. The `/api/github` proxy is
 *     NOT used on the server path (relative URLs are invalid in Node/undici
 *     fetch, and the proxy did not forward If-None-Match, defeating the
 *     ETag short-circuit in D-11 / CODING-BANK-04).
 *   - Hidden tests are fetched by `loadHiddenTests()` via a DEDICATED
 *     server-only helper that calls api.github.com directly with
 *     GITHUB_CODING_PRIVATE_TOKEN. MUST NOT extend `/api/github`.
 */

import 'server-only';
import { z } from 'zod';
import type { CodingChallenge, CodingTestCase } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import {
  CODING_LANGUAGES,
  LANGUAGE_EXTENSIONS,
  HiddenTestsSchema,
  MAX_README_SIZE,
  MetaSchema,
  VisibleTestsSchema,
  ChallengeValidationError,
  validateChallenge,
  type CodingLanguage,
} from './coding-bank-schemas';

// ---------------------------------------------------------------------------
// Contract types
// ---------------------------------------------------------------------------
export interface ChallengeManifestEntry {
  slug: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  cohortId: number | null;
  skillSlug: string;
  languages: CodingLanguage[];
}

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
// Fetcher types (injectable for tests)
// ---------------------------------------------------------------------------
export type PublicFetcherResponse =
  | { status: 200; payload: unknown; etag: string }
  | { status: 304; etag: string };

export type PublicFetcherFn = (args: {
  path: string;
  kind: 'json' | 'text';
  etag?: string;
}) => Promise<PublicFetcherResponse>;

export type PrivateFetcherFn = (args: {
  slug: string;
  etag?: string;
}) => Promise<PublicFetcherResponse>;

// ---------------------------------------------------------------------------
// Default fetchers
// ---------------------------------------------------------------------------
const defaultPublicFetcher: PublicFetcherFn = async ({ path, kind, etag }) => {
  // Direct server-side GitHub call. Node/undici `fetch` rejects relative URLs,
  // and the existing /api/github proxy does NOT forward If-None-Match —
  // defeating the ETag short-circuit called out in CODING-BANK-04. Calling
  // GitHub directly here lets us forward If-None-Match and honor 304s,
  // protecting the 5000/hr quota. Token stays server-side (server-only module).
  const repo = process.env.GITHUB_CODING_PUBLIC_REPO;
  const token = process.env.GITHUB_TOKEN;
  if (!repo) throw new Error('GITHUB_CODING_PUBLIC_REPO not set');
  if (!token) throw new Error('GITHUB_TOKEN not set');

  const [owner, name] = repo.split('/');
  const url = `https://api.github.com/repos/${owner}/${name}/contents/${path}`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3.raw',
    Authorization: `token ${token}`,
  };
  if (etag) headers['If-None-Match'] = etag;

  const res = await fetch(url, { headers });
  if (res.status === 304) return { status: 304, etag: etag ?? '' };
  if (!res.ok) {
    throw new Error(`Public GitHub fetch failed: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  const payload: unknown = kind === 'json' ? JSON.parse(text) : text;
  return { status: 200, payload, etag: res.headers.get('etag') ?? '' };
};

const defaultPrivateFetcher: PrivateFetcherFn = async ({ slug, etag }) => {
  const repo = process.env.GITHUB_CODING_PRIVATE_REPO;
  const token = process.env.GITHUB_CODING_PRIVATE_TOKEN;
  if (!repo) throw new Error('GITHUB_CODING_PRIVATE_REPO not set');
  if (!token) throw new Error('GITHUB_CODING_PRIVATE_TOKEN not set');

  const [owner, name] = repo.split('/');
  const url = `https://api.github.com/repos/${owner}/${name}/contents/challenges/${slug}/hidden-tests.json`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3.raw',
    Authorization: `token ${token}`,
  };
  if (etag) headers['If-None-Match'] = etag;

  const res = await fetch(url, { headers });
  if (res.status === 304) return { status: 304, etag: etag ?? '' };
  if (!res.ok) {
    throw new Error(`Private repo fetch failed: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return {
    status: 200,
    payload: JSON.parse(text),
    etag: res.headers.get('etag') ?? '',
  };
};

let activePublicFetcher: PublicFetcherFn = defaultPublicFetcher;
let activePrivateFetcher: PrivateFetcherFn = defaultPrivateFetcher;

// ---------------------------------------------------------------------------
// Module-state cache (mirrors githubManifestCache.ts)
// ---------------------------------------------------------------------------
interface CacheEntry {
  payload: unknown;
  etag: string;
  lastSyncedAt: number;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();
let generation = 0;

function getTtlMs(): number {
  const raw = process.env.CODING_BANK_CACHE_TTL_MS;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 5 * 60_000;
}

// ---------------------------------------------------------------------------
// Cached public fetch
// ---------------------------------------------------------------------------
async function getCachedPublic<T>(
  key: string,
  path: string,
  kind: 'json' | 'text',
): Promise<T> {
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const existing = store.get(key);
  const now = Date.now();
  if (existing && now < existing.expiresAt) {
    return existing.payload as T;
  }

  const startGen = generation;
  const ttlMs = getTtlMs();
  const promise = (async (): Promise<T> => {
    const res = await activePublicFetcher({ path, kind, etag: existing?.etag });
    const settledAt = Date.now();

    if (res.status === 304) {
      if (!existing) {
        throw new Error(`[coding-bank-cache] 304 without prior entry for ${key}`);
      }
      if (startGen !== generation) return existing.payload as T;
      existing.lastSyncedAt = settledAt;
      existing.expiresAt = settledAt + ttlMs;
      return existing.payload as T;
    }

    const entry: CacheEntry = {
      payload: res.payload,
      etag: res.etag,
      lastSyncedAt: settledAt,
      expiresAt: settledAt + ttlMs,
    };
    if (startGen !== generation) return entry.payload as T;
    store.set(key, entry);
    return entry.payload as T;
  })();

  inFlight.set(key, promise as Promise<unknown>);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

async function getCachedPrivateHidden(slug: string): Promise<HiddenTestCase[]> {
  const key = `private:${slug}:hidden-tests`;
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<HiddenTestCase[]>;

  const existing = store.get(key);
  const now = Date.now();
  if (existing && now < existing.expiresAt) {
    return existing.payload as HiddenTestCase[];
  }

  const startGen = generation;
  const ttlMs = getTtlMs();
  const promise = (async (): Promise<HiddenTestCase[]> => {
    const res = await activePrivateFetcher({ slug, etag: existing?.etag });
    const settledAt = Date.now();

    if (res.status === 304) {
      if (!existing) throw new Error(`[coding-bank-cache] 304 without prior entry for ${key}`);
      if (startGen !== generation) return existing.payload as HiddenTestCase[];
      existing.lastSyncedAt = settledAt;
      existing.expiresAt = settledAt + ttlMs;
      return existing.payload as HiddenTestCase[];
    }

    const parsed = HiddenTestsSchema.safeParse(res.payload);
    if (!parsed.success) {
      throw new ChallengeValidationError(
        'hiddenTests',
        parsed.error.issues[0]?.message ?? 'Invalid hidden tests payload',
        slug,
      );
    }
    const entry: CacheEntry = {
      payload: parsed.data,
      etag: res.etag,
      lastSyncedAt: settledAt,
      expiresAt: settledAt + ttlMs,
    };
    if (startGen !== generation) return parsed.data;
    store.set(key, entry);
    return parsed.data;
  })();

  inFlight.set(key, promise as Promise<unknown>);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Manifest schema
// ---------------------------------------------------------------------------
const ManifestSchema = z.array(
  z.object({ slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/).max(50) }).strict(),
);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function listChallenges(
  cohortId?: number,
): Promise<ChallengeManifestEntry[]> {
  const raw = await getCachedPublic<unknown>(
    'public:manifest',
    'challenges/manifest.json',
    'json',
  );

  const parsed = ManifestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ChallengeValidationError(
      'manifest',
      parsed.error.issues[0]?.message ?? 'Invalid manifest shape',
    );
  }

  // D-15 step 4 — duplicate-slug guard (manifest scope).
  const seen = new Set<string>();
  for (const entry of parsed.data) {
    if (seen.has(entry.slug)) {
      throw new ChallengeValidationError(
        'manifest',
        `duplicate slug "${entry.slug}" in manifest.json`,
      );
    }
    seen.add(entry.slug);
  }

  const entries: ChallengeManifestEntry[] = [];
  for (const { slug } of parsed.data) {
    const full = await loadChallenge(slug);
    const include =
      cohortId === undefined ||
      full.meta.cohortId === null ||
      full.meta.cohortId === cohortId;
    if (include) {
      entries.push({
        slug: full.meta.slug,
        title: full.meta.title,
        difficulty: full.meta.difficulty,
        cohortId: full.meta.cohortId,
        skillSlug: full.meta.skillSlug,
        languages: full.meta.languages,
      });
    }
  }

  return entries.sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function loadChallenge(slug: string): Promise<FullChallenge> {
  const [readme, metaRaw, visibleRaw] = await Promise.all([
    getCachedPublic<string>(
      `public:${slug}:readme`,
      `challenges/${slug}/README.md`,
      'text',
    ),
    getCachedPublic<unknown>(
      `public:${slug}:meta`,
      `challenges/${slug}/meta.json`,
      'json',
    ),
    getCachedPublic<unknown>(
      `public:${slug}:visible-tests`,
      `challenges/${slug}/visible-tests.json`,
      'json',
    ),
  ]);

  // WR-02: README size cap — reject outsized prompts to protect trainer-only
  // refresh route from unbounded allocation.
  if (readme.length > MAX_README_SIZE) {
    throw new ChallengeValidationError(
      'readme',
      `README.md exceeds ${MAX_README_SIZE} char cap (got ${readme.length})`,
      slug,
    );
  }

  // Parse meta early so we know which starter files to fetch.
  const metaCheck = MetaSchema.safeParse(metaRaw);
  if (!metaCheck.success) {
    const issue = metaCheck.error.issues[0];
    const joined = issue.path
      .map((p) => (typeof p === 'number' ? `[${p}]` : `.${String(p)}`))
      .join('');
    const tail = joined.startsWith('.') ? joined.slice(1) : joined;
    throw new ChallengeValidationError(
      tail ? `meta.${tail}`.replace('.[', '[') : 'meta',
      issue.message,
      typeof (metaRaw as { slug?: unknown })?.slug === 'string'
        ? ((metaRaw as { slug: string }).slug)
        : undefined,
    );
  }
  const meta = metaCheck.data;

  // Fetch starters for every declared language.
  const starters: Partial<Record<CodingLanguage, string>> = {};
  for (const lang of meta.languages) {
    const ext = LANGUAGE_EXTENSIONS[lang];
    const source = await getCachedPublic<string>(
      `public:${slug}:starter:${lang}`,
      `challenges/${slug}/starters/${lang}.${ext}`,
      'text',
    );
    starters[lang] = source;
  }

  // Fetch hidden tests for step-5 disjointness check (NOT included in return).
  // Wrap raw network/404 errors as ChallengeValidationError so callers (listChallenges,
  // syncChallengeToDb) can surface per-slug failures consistently.
  let hiddenTests: HiddenTestCase[];
  try {
    hiddenTests = await getCachedPrivateHidden(slug);
  } catch (err) {
    if (err instanceof ChallengeValidationError) throw err;
    throw new ChallengeValidationError(
      'hiddenTests',
      err instanceof Error ? err.message : 'hidden tests unavailable',
      slug,
    );
  }

  // Run the full 5-step pipeline.
  const validated = validateChallenge({
    meta,
    visibleTests: visibleRaw,
    hiddenTests,
    starters,
  });

  return {
    slug: validated.meta.slug,
    meta: validated.meta,
    readme,
    starters: validated.starters,
    visibleTests: validated.visibleTests,
    // hiddenTests intentionally absent — D-05 type boundary.
  };
}

export async function loadHiddenTests(slug: string): Promise<HiddenTestCase[]> {
  return getCachedPrivateHidden(slug);
}

// ---------------------------------------------------------------------------
// syncChallengeToDb — idempotent Prisma transaction (D-14)
// ---------------------------------------------------------------------------
export async function syncChallengeToDb(slug: string): Promise<SyncResult> {
  const full = await loadChallenge(slug);
  let hidden: HiddenTestCase[];
  try {
    hidden = await loadHiddenTests(slug);
  } catch (err) {
    if (err instanceof ChallengeValidationError) throw err;
    throw new ChallengeValidationError(
      'hiddenTests',
      err instanceof Error ? err.message : 'hidden tests unavailable',
      slug,
    );
  }

  return prisma.$transaction(async (tx) => {
    const { meta, readme, visibleTests } = full;
    const primaryLanguage = meta.languages[0];

    const challenge = await tx.codingChallenge.upsert({
      where: { slug: meta.slug },
      create: {
        slug: meta.slug,
        title: meta.title,
        description: readme,
        language: primaryLanguage,
        difficulty: meta.difficulty,
        skillSlug: meta.skillSlug,
        cohortId: meta.cohortId,
      },
      update: {
        title: meta.title,
        description: readme,
        language: primaryLanguage,
        difficulty: meta.difficulty,
        skillSlug: meta.skillSlug,
        cohortId: meta.cohortId,
      },
    });

    const desiredCases = [
      ...visibleTests.map((tc) => ({ ...tc, isHidden: false })),
      ...hidden.map((tc) => ({ ...tc, isHidden: true })),
    ];

    await tx.codingTestCase.deleteMany({
      where: {
        challengeId: challenge.id,
        id: { notIn: desiredCases.map((c) => c.id) },
      },
    });

    const cases: CodingTestCase[] = [];
    for (const tc of desiredCases) {
      const row = await tx.codingTestCase.upsert({
        where: { challengeId_id: { challengeId: challenge.id, id: tc.id } },
        create: {
          id: tc.id,
          challengeId: challenge.id,
          isHidden: tc.isHidden,
          stdin: tc.stdin,
          expectedStdout: tc.expectedStdout,
          weight: tc.weight,
          orderIndex: tc.orderIndex,
        },
        update: {
          isHidden: tc.isHidden,
          stdin: tc.stdin,
          expectedStdout: tc.expectedStdout,
          weight: tc.weight,
          orderIndex: tc.orderIndex,
        },
      });
      cases.push(row);
    }

    return { challenge, cases };
  });
}

// ---------------------------------------------------------------------------
// invalidateCache
// ---------------------------------------------------------------------------
export function invalidateCache(scope?: string): number {
  generation++;
  if (!scope) {
    const n = store.size;
    store.clear();
    inFlight.clear();
    return n;
  }
  if (scope.endsWith('*')) {
    const prefix = scope.slice(0, -1);
    let n = 0;
    for (const key of [...store.keys()]) {
      if (key.startsWith(prefix)) {
        store.delete(key);
        inFlight.delete(key);
        n++;
      }
    }
    return n;
  }
  const deleted = store.delete(scope) ? 1 : 0;
  inFlight.delete(scope);
  return deleted;
}

// ---------------------------------------------------------------------------
// Test-only hooks (mirrors githubManifestCache)
// ---------------------------------------------------------------------------
export function __setFetchers(fns: {
  publicFetcher?: PublicFetcherFn | null;
  privateFetcher?: PrivateFetcherFn | null;
}): void {
  if (fns.publicFetcher !== undefined) {
    activePublicFetcher = fns.publicFetcher ?? defaultPublicFetcher;
  }
  if (fns.privateFetcher !== undefined) {
    activePrivateFetcher = fns.privateFetcher ?? defaultPrivateFetcher;
  }
}

export function __resetAll(): void {
  store.clear();
  inFlight.clear();
  generation = 0;
  activePublicFetcher = defaultPublicFetcher;
  activePrivateFetcher = defaultPrivateFetcher;
}

// Silence unused-constant lint for import placeholders.
void CODING_LANGUAGES;
