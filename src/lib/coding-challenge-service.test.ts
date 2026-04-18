/**
 * Tests for src/lib/coding-challenge-service.ts (Plan 37-02).
 *
 * Mocks:
 *   - `@/lib/prisma` → in-memory fake prisma client recording calls.
 *   - Public + private fetchers injected via __setFetchers.
 *
 * Covers:
 *   - Cache TTL + hit/miss behavior
 *   - ETag revalidation (private path)
 *   - Stampede dedupe
 *   - Public-vs-private fetch isolation (D-05)
 *   - listChallenges manifest walk + duplicate-slug guard (D-15 step 4)
 *   - cohortId filter
 *   - syncChallengeToDb idempotency + reconciliation
 *   - invalidateCache scoping
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ChallengeValidationError } from './coding-bank-schemas';

// ──────────────────────────────────────────────────────────────────────────
// In-memory Prisma fake
// ──────────────────────────────────────────────────────────────────────────
interface FakeChallengeRow {
  id: string;
  slug: string;
  title: string;
  language: string;
  difficulty: string;
  description: string;
  skillSlug: string;
  cohortId: number | null;
  createdAt: Date;
  updatedAt: Date;
}
interface FakeCaseRow {
  id: string;
  challengeId: string;
  isHidden: boolean;
  stdin: string;
  expectedStdout: string;
  weight: number;
  orderIndex: number;
}

// hoisted so vi.mock factory can reference it before module imports resolve.
const fixture = vi.hoisted(() => {
  const challenges = new Map<string, any>();
  const cases = new Map<string, any>();
  return { challenges, cases };
});

const challenges = fixture.challenges as Map<string, FakeChallengeRow>;
const cases = fixture.cases as Map<string, FakeCaseRow>;

function resetFakeDb() {
  challenges.clear();
  cases.clear();
}

vi.mock('@/lib/prisma', () => {
  const inst: any = {
    codingChallenge: {
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const existing = fixture.challenges.get(where.slug);
        const now = new Date();
        const row = existing
          ? { ...existing, ...update, updatedAt: now }
          : {
              id: `ch-${fixture.challenges.size + 1}`,
              ...create,
              createdAt: now,
              updatedAt: now,
            };
        fixture.challenges.set(where.slug, row);
        return row;
      }),
      findUnique: vi.fn(async ({ where }: any) => fixture.challenges.get(where.slug) ?? null),
    },
    codingTestCase: {
      findMany: vi.fn(async ({ where }: any) =>
        [...fixture.cases.values()].filter((c) => c.challengeId === where.challengeId),
      ),
      upsert: vi.fn(async ({ where, create, update }: any) => {
        const key = `${where.challengeId_id.challengeId}:${where.challengeId_id.id}`;
        const existing = fixture.cases.get(key);
        const row = existing ? { ...existing, ...update } : { ...create };
        fixture.cases.set(key, row);
        return row;
      }),
      deleteMany: vi.fn(async ({ where }: any) => {
        let count = 0;
        const keep = new Set<string>(where.id?.notIn ?? []);
        for (const [k, v] of fixture.cases) {
          if (v.challengeId === where.challengeId && !keep.has(v.id)) {
            fixture.cases.delete(k);
            count++;
          }
        }
        return { count };
      }),
    },
    $transaction: vi.fn(async (fn: any) => fn(inst)),
  };
  return { prisma: inst };
});

// Pull the mocked module so tests can inspect the $transaction spy.
import { prisma as mockedPrisma } from '@/lib/prisma';
const fakePrisma = mockedPrisma as unknown as {
  $transaction: ReturnType<typeof vi.fn>;
};

// Import service AFTER the mock declaration.
import {
  listChallenges,
  loadChallenge,
  loadHiddenTests,
  syncChallengeToDb,
  invalidateCache,
  __setFetchers,
  __resetAll,
  type PublicFetcherFn,
  type PrivateFetcherFn,
} from './coding-challenge-service';

// ──────────────────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────────────────
function goodMeta(slug = 'two-sum', overrides: Record<string, unknown> = {}) {
  return {
    slug,
    title: 'Two Sum',
    difficulty: 'easy',
    skillSlug: 'arrays',
    cohortId: null,
    languages: ['python'],
    ...overrides,
  };
}
function goodVisible() {
  return [{ id: 'v-1', stdin: 'a', expectedStdout: 'b', weight: 1, orderIndex: 0 }];
}
function goodHidden() {
  return [{ id: 'h-1', stdin: 'c', expectedStdout: 'd', weight: 1, orderIndex: 0 }];
}

function buildPublicFetcher(
  repo: Record<string, unknown>,
): PublicFetcherFn {
  return vi.fn(async ({ path }) => {
    if (!(path in repo)) {
      return { status: 404 as any, etag: '', payload: null } as any;
    }
    return { status: 200, payload: repo[path], etag: `etag-${path}` };
  }) as PublicFetcherFn;
}

function buildPrivateFetcher(
  hiddenBySlug: Record<string, unknown>,
  etagMap: Record<string, string> = {},
): PrivateFetcherFn {
  return vi.fn(async ({ slug, etag }) => {
    if (!(slug in hiddenBySlug)) {
      throw new Error(`Private repo 404 for slug ${slug}`);
    }
    const currentEtag = etagMap[slug] ?? `priv-etag-${slug}`;
    if (etag && etag === currentEtag) {
      return { status: 304, etag: currentEtag };
    }
    return { status: 200, payload: hiddenBySlug[slug], etag: currentEtag };
  }) as PrivateFetcherFn;
}

// Build the public-repo "filesystem" view for a single challenge.
function repoFor(slug: string, overrides: Record<string, unknown> = {}) {
  const meta = overrides.meta ?? goodMeta(slug);
  const visible = overrides.visible ?? goodVisible();
  return {
    [`challenges/${slug}/README.md`]: overrides.readme ?? `# ${slug}\nPrompt`,
    [`challenges/${slug}/meta.json`]: meta,
    [`challenges/${slug}/visible-tests.json`]: visible,
    [`challenges/${slug}/starters/python.py`]: overrides.starter ?? 'def solve(): pass',
  } as Record<string, unknown>;
}

// ──────────────────────────────────────────────────────────────────────────
// Setup / teardown
// ──────────────────────────────────────────────────────────────────────────
beforeEach(() => {
  __resetAll();
  resetFakeDb();
  vi.clearAllMocks();
  delete process.env.CODING_BANK_CACHE_TTL_MS;
});

// ──────────────────────────────────────────────────────────────────────────
// Default public fetcher — direct GitHub calls (CR-01 + WR-03)
// ──────────────────────────────────────────────────────────────────────────
describe('defaultPublicFetcher (direct GitHub, no /api/github proxy)', () => {
  const origFetch = globalThis.fetch;
  const origToken = process.env.GITHUB_TOKEN;
  const origRepo = process.env.GITHUB_CODING_PUBLIC_REPO;

  beforeEach(() => {
    process.env.GITHUB_TOKEN = 'public-token-xyz';
    process.env.GITHUB_CODING_PUBLIC_REPO = 'JesterCharles/mock-coding-challenges';
    __resetAll(); // reinstall default fetchers after env vars set
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
    if (origToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = origToken;
    if (origRepo === undefined) delete process.env.GITHUB_CODING_PUBLIC_REPO;
    else process.env.GITHUB_CODING_PUBLIC_REPO = origRepo;
  });

  it('calls api.github.com with absolute URL + Authorization header (not /api/github)', async () => {
    const fetchSpy = vi.fn(async () => {
      return new Response(JSON.stringify([{ slug: 'two-sum' }]), {
        status: 200,
        headers: { etag: 'manifest-etag-1' },
      });
    });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    // Manifest lookup will call the default public fetcher; we intercept it.
    // Missing starters etc. will cause listChallenges to throw later, but we
    // only care about the first fetch call.
    try {
      await listChallenges();
    } catch {
      // ignore — we only need to observe the first fetch call
    }

    expect(fetchSpy).toHaveBeenCalled();
    const firstCall = fetchSpy.mock.calls[0];
    const url = firstCall[0] as string;
    const init = firstCall[1] as RequestInit;
    expect(url).toMatch(/^https:\/\/api\.github\.com\//);
    expect(url).toContain('JesterCharles/mock-coding-challenges');
    expect(url).toContain('challenges/manifest.json');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('token public-token-xyz');
  });

  it('forwards If-None-Match on second call after TTL expiry (ETag short-circuit)', async () => {
    process.env.CODING_BANK_CACHE_TTL_MS = '1';
    try {
      let callCount = 0;
      const fetchSpy = vi.fn(async (_url: string, init: RequestInit = {}) => {
        callCount++;
        if (callCount === 1) {
          return new Response(JSON.stringify([{ slug: 'two-sum' }]), {
            status: 200,
            headers: { etag: 'manifest-v1' },
          });
        }
        // Second call should include If-None-Match → server returns 304.
        const headers = init.headers as Record<string, string>;
        expect(headers['If-None-Match']).toBe('manifest-v1');
        return new Response(null, { status: 304, headers: { etag: 'manifest-v1' } });
      });
      globalThis.fetch = fetchSpy as unknown as typeof fetch;

      // Prime the cache — manifest fetch succeeds; downstream loadChallenge will fail.
      try {
        await listChallenges();
      } catch {
        /* ignore */
      }
      await new Promise((r) => setTimeout(r, 5));
      // Second call — revalidates manifest with If-None-Match.
      try {
        await listChallenges();
      } catch {
        /* ignore */
      }

      // Both calls should have been made to the manifest URL.
      const manifestCalls = fetchSpy.mock.calls.filter((c) =>
        String(c[0]).includes('challenges/manifest.json'),
      );
      expect(manifestCalls.length).toBeGreaterThanOrEqual(2);
    } finally {
      delete process.env.CODING_BANK_CACHE_TTL_MS;
    }
  });

  it('throws a useful error when GITHUB_TOKEN is missing', async () => {
    delete process.env.GITHUB_TOKEN;
    __resetAll();
    globalThis.fetch = (async () =>
      new Response('should not be called', { status: 200 })) as unknown as typeof fetch;

    await expect(listChallenges()).rejects.toThrow(/GITHUB_TOKEN/);
  });

  it('throws a useful error when GITHUB_CODING_PUBLIC_REPO is missing', async () => {
    delete process.env.GITHUB_CODING_PUBLIC_REPO;
    __resetAll();
    globalThis.fetch = (async () =>
      new Response('should not be called', { status: 200 })) as unknown as typeof fetch;

    await expect(listChallenges()).rejects.toThrow(/GITHUB_CODING_PUBLIC_REPO/);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Cache TTL behavior
// ──────────────────────────────────────────────────────────────────────────
describe('coding-challenge-service cache', () => {
  it('first call invokes public fetcher; second call within TTL hits cache', async () => {
    const repo = {
      'challenges/manifest.json': [{ slug: 'two-sum' }],
      ...repoFor('two-sum'),
    };
    const pub = buildPublicFetcher(repo);
    const priv = buildPrivateFetcher({ 'two-sum': goodHidden() });
    __setFetchers({ publicFetcher: pub, privateFetcher: priv });

    await listChallenges();
    const afterFirst = (pub as any).mock.calls.length;
    await listChallenges();
    const afterSecond = (pub as any).mock.calls.length;

    expect(afterSecond).toBe(afterFirst); // no re-fetch
  });

  it('CODING_BANK_CACHE_TTL_MS=1 forces re-fetch on second call', async () => {
    process.env.CODING_BANK_CACHE_TTL_MS = '1';
    const repo = {
      'challenges/manifest.json': [{ slug: 'two-sum' }],
      ...repoFor('two-sum'),
    };
    const pub = buildPublicFetcher(repo);
    const priv = buildPrivateFetcher({ 'two-sum': goodHidden() });
    __setFetchers({ publicFetcher: pub, privateFetcher: priv });

    await listChallenges();
    await new Promise((r) => setTimeout(r, 5));
    await listChallenges();

    // Manifest fetched twice.
    const manifestCalls = (pub as any).mock.calls.filter(
      (c: any[]) => c[0].path === 'challenges/manifest.json',
    );
    expect(manifestCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('stampede: two concurrent listChallenges share one fetch', async () => {
    const repo = {
      'challenges/manifest.json': [{ slug: 'two-sum' }],
      ...repoFor('two-sum'),
    };
    const pub = buildPublicFetcher(repo);
    const priv = buildPrivateFetcher({ 'two-sum': goodHidden() });
    __setFetchers({ publicFetcher: pub, privateFetcher: priv });

    const [a, b] = await Promise.all([listChallenges(), listChallenges()]);
    expect(a).toEqual(b);
    const manifestCalls = (pub as any).mock.calls.filter(
      (c: any[]) => c[0].path === 'challenges/manifest.json',
    );
    expect(manifestCalls.length).toBe(1);
  });
});

describe('coding-challenge-service private-path ETag', () => {
  it('second loadHiddenTests sends If-None-Match after TTL expiry; 304 preserves payload', async () => {
    process.env.CODING_BANK_CACHE_TTL_MS = '1';
    const priv = buildPrivateFetcher({ 'two-sum': goodHidden() });
    __setFetchers({ privateFetcher: priv });

    const first = await loadHiddenTests('two-sum');
    await new Promise((r) => setTimeout(r, 5));
    const second = await loadHiddenTests('two-sum');
    expect(second).toEqual(first);

    const call2 = (priv as any).mock.calls[1][0];
    expect(call2.etag).toBe('priv-etag-two-sum');
    const resp2 = await (priv as any).mock.results[1].value;
    expect(resp2.status).toBe(304);
  });

  it('ETag 200 after TTL expiry replaces payload + etag when server returns new data', async () => {
    process.env.CODING_BANK_CACHE_TTL_MS = '1';
    const oldHidden = [
      { id: 'h-old', stdin: 'a', expectedStdout: 'b', weight: 1, orderIndex: 0 },
    ];
    const newHidden = [
      { id: 'h-new', stdin: 'x', expectedStdout: 'y', weight: 1, orderIndex: 0 },
    ];
    // Fetcher returns old data + etag "v1" on first call, then new data + etag "v2" on second.
    let callCount = 0;
    const priv: PrivateFetcherFn = vi.fn(async () => {
      callCount++;
      if (callCount === 1) return { status: 200, payload: oldHidden, etag: 'v1' };
      return { status: 200, payload: newHidden, etag: 'v2' };
    }) as PrivateFetcherFn;
    __setFetchers({ privateFetcher: priv });

    const first = await loadHiddenTests('two-sum');
    expect(first[0].id).toBe('h-old');

    await new Promise((r) => setTimeout(r, 5));
    const second = await loadHiddenTests('two-sum');
    expect(second[0].id).toBe('h-new');

    // Third call within TTL should serve the new cached payload (no new fetcher call).
    const before = (priv as any).mock.calls.length;
    const third = await loadHiddenTests('two-sum');
    expect(third[0].id).toBe('h-new');
    expect((priv as any).mock.calls.length).toBe(before);
  });
});

describe('invalidateCache mid-flight generation guard', () => {
  it('discards in-flight write when invalidateCache runs before fetch resolves', async () => {
    // First: populate cache so a subsequent stale fetch has prior state to revalidate.
    process.env.CODING_BANK_CACHE_TTL_MS = '1';
    const hiddenA = [
      { id: 'h-a', stdin: 'a', expectedStdout: 'b', weight: 1, orderIndex: 0 },
    ];
    const hiddenB = [
      { id: 'h-b', stdin: 'c', expectedStdout: 'd', weight: 1, orderIndex: 0 },
    ];

    let resolveFetch: ((v: any) => void) | null = null;
    let callNum = 0;
    const priv: PrivateFetcherFn = vi.fn(async () => {
      callNum++;
      if (callNum === 1) return { status: 200, payload: hiddenA, etag: 'v1' };
      // Second call: deferred so we can invalidate mid-flight.
      return new Promise((resolve) => {
        resolveFetch = resolve;
      });
    }) as PrivateFetcherFn;
    __setFetchers({ privateFetcher: priv });

    await loadHiddenTests('two-sum'); // primes cache

    // Wait for TTL to expire.
    await new Promise((r) => setTimeout(r, 5));

    // Kick off a second fetch (will hang awaiting resolveFetch).
    const pending = loadHiddenTests('two-sum');

    // Invalidate before the second fetch resolves — bumps generation.
    invalidateCache();

    // Now let the in-flight fetch resolve with new data.
    resolveFetch!({ status: 200, payload: hiddenB, etag: 'v2' });
    await pending;

    // Because generation changed, the in-flight write should NOT have been committed
    // to the store. The next call must refetch (callNum increments again).
    const priorCalls = (priv as any).mock.calls.length;
    // Provide a third response for the fresh fetch.
    const priv2: PrivateFetcherFn = vi.fn(async () => ({
      status: 200,
      payload: hiddenB,
      etag: 'v3',
    })) as PrivateFetcherFn;
    __setFetchers({ privateFetcher: priv2 });
    await loadHiddenTests('two-sum');
    // priv (pre-invalidate) should not have been called again after invalidate.
    expect((priv as any).mock.calls.length).toBe(priorCalls);
    expect((priv2 as any).mock.calls.length).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Public / private isolation (D-05)
// ──────────────────────────────────────────────────────────────────────────
describe('coding-challenge-service isolation (D-05)', () => {
  it('loadChallenge uses public fetcher only; loadHiddenTests uses private fetcher only', async () => {
    const repo = repoFor('two-sum');
    const pub = buildPublicFetcher(repo);
    const priv = buildPrivateFetcher({ 'two-sum': goodHidden() });
    __setFetchers({ publicFetcher: pub, privateFetcher: priv });

    await loadChallenge('two-sum');
    // loadChallenge also invokes loadHiddenTests for Step 5 collision check.
    expect((pub as any).mock.calls.length).toBeGreaterThan(0);
    expect((priv as any).mock.calls.length).toBeGreaterThan(0);

    // Verify no public fetcher call was ever issued to a private-only path.
    for (const [args] of (pub as any).mock.calls) {
      expect(args.path).not.toContain('hidden-tests');
    }
    // Private fetcher should only receive slug args.
    for (const [args] of (priv as any).mock.calls) {
      expect(args.slug).toBeTypeOf('string');
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────
// listChallenges manifest walk + dedupe + cohortId filter
// ──────────────────────────────────────────────────────────────────────────
describe('listChallenges', () => {
  it('walks manifest and returns entries', async () => {
    const repo: Record<string, unknown> = {
      'challenges/manifest.json': [{ slug: 'a' }, { slug: 'b' }],
      ...repoFor('a'),
      ...repoFor('b'),
    };
    const pub = buildPublicFetcher(repo);
    const priv = buildPrivateFetcher({ a: goodHidden(), b: goodHidden() });
    __setFetchers({ publicFetcher: pub, privateFetcher: priv });

    const entries = await listChallenges();
    expect(entries.map((e) => e.slug).sort()).toEqual(['a', 'b']);
  });

  it('rejects manifest entry with unknown keys (strict)', async () => {
    // Provide a fully valid public + private repo so the ONLY reason to throw
    // is the manifest entry having an unknown key.
    const repo: Record<string, unknown> = {
      'challenges/manifest.json': [{ slug: 'a', extraField: 'nope' }],
      ...repoFor('a'),
    };
    __setFetchers({
      publicFetcher: buildPublicFetcher(repo),
      privateFetcher: buildPrivateFetcher({ a: goodHidden() }),
    });

    await expect(listChallenges()).rejects.toBeInstanceOf(ChallengeValidationError);
    await expect(listChallenges()).rejects.toMatchObject({
      path: expect.stringContaining('manifest'),
    });
  });

  it('throws ChallengeValidationError for duplicate slug in manifest', async () => {
    const repo: Record<string, unknown> = {
      'challenges/manifest.json': [{ slug: 'a' }, { slug: 'a' }],
      ...repoFor('a'),
    };
    __setFetchers({ publicFetcher: buildPublicFetcher(repo) });

    await expect(listChallenges()).rejects.toBeInstanceOf(ChallengeValidationError);
    await expect(listChallenges()).rejects.toMatchObject({
      path: 'manifest',
      reason: expect.stringContaining('duplicate'),
    });
  });

  it('cohortId filter keeps global (null) and matching cohort entries', async () => {
    const repo: Record<string, unknown> = {
      'challenges/manifest.json': [
        { slug: 'global' },
        { slug: 'c5' },
        { slug: 'c9' },
      ],
      ...repoFor('global', { meta: goodMeta('global', { cohortId: null }) }),
      ...repoFor('c5', { meta: goodMeta('c5', { cohortId: 5 }) }),
      ...repoFor('c9', { meta: goodMeta('c9', { cohortId: 9 }) }),
    };
    const pub = buildPublicFetcher(repo);
    const priv = buildPrivateFetcher({
      global: goodHidden(),
      c5: goodHidden(),
      c9: goodHidden(),
    });
    __setFetchers({ publicFetcher: pub, privateFetcher: priv });

    const entries = await listChallenges(5);
    const slugs = entries.map((e) => e.slug).sort();
    expect(slugs).toEqual(['c5', 'global']);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// loadChallenge / loadHiddenTests contract
// ──────────────────────────────────────────────────────────────────────────
describe('loadChallenge / loadHiddenTests', () => {
  it('loadChallenge returns FullChallenge without hiddenTests field', async () => {
    const repo = repoFor('two-sum');
    const pub = buildPublicFetcher(repo);
    const priv = buildPrivateFetcher({ 'two-sum': goodHidden() });
    __setFetchers({ publicFetcher: pub, privateFetcher: priv });

    const full = await loadChallenge('two-sum');
    expect(full.slug).toBe('two-sum');
    expect(full.readme).toContain('two-sum');
    expect(full.visibleTests).toHaveLength(1);
    expect((full as any).hiddenTests).toBeUndefined();
  });

  it('loadChallenge throws ChallengeValidationError when meta malformed', async () => {
    const repo = repoFor('two-sum', { meta: { ...goodMeta('two-sum'), difficulty: 'insane' } });
    __setFetchers({ publicFetcher: buildPublicFetcher(repo) });

    await expect(loadChallenge('two-sum')).rejects.toBeInstanceOf(ChallengeValidationError);
  });

  it('loadHiddenTests uses private key (distinct from public key)', async () => {
    const priv = buildPrivateFetcher({ 'two-sum': goodHidden() });
    __setFetchers({ privateFetcher: priv });

    const hidden = await loadHiddenTests('two-sum');
    expect(hidden).toHaveLength(1);
    expect(hidden[0].id).toBe('h-1');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// invalidateCache
// ──────────────────────────────────────────────────────────────────────────
describe('invalidateCache', () => {
  it('no-arg clears all entries and returns count', async () => {
    const repo = {
      'challenges/manifest.json': [{ slug: 'a' }],
      ...repoFor('a'),
    };
    const pub = buildPublicFetcher(repo);
    const priv = buildPrivateFetcher({ a: goodHidden() });
    __setFetchers({ publicFetcher: pub, privateFetcher: priv });

    await listChallenges();
    const cleared = invalidateCache();
    expect(cleared).toBeGreaterThan(0);

    const preMark = (pub as any).mock.calls.length;
    await listChallenges();
    const postMark = (pub as any).mock.calls.length;
    expect(postMark).toBeGreaterThan(preMark); // re-fetched
  });

  it("scoped 'public:a:*' clears only a's entries", async () => {
    const repo = {
      'challenges/manifest.json': [{ slug: 'a' }, { slug: 'b' }],
      ...repoFor('a'),
      ...repoFor('b'),
    };
    const pub = buildPublicFetcher(repo);
    const priv = buildPrivateFetcher({ a: goodHidden(), b: goodHidden() });
    __setFetchers({ publicFetcher: pub, privateFetcher: priv });

    await listChallenges();
    const beforeCalls = (pub as any).mock.calls.length;

    invalidateCache('public:a:*');

    // Cached 'b' data still served; 'a' re-fetched.
    await loadChallenge('a');
    const afterA = (pub as any).mock.calls.length;
    expect(afterA).toBeGreaterThan(beforeCalls);

    const before2 = (pub as any).mock.calls.length;
    await loadChallenge('b');
    const after2 = (pub as any).mock.calls.length;
    // b should still be cached (no new calls for b).
    expect(after2).toBe(before2);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// syncChallengeToDb idempotency + reconciliation
// ──────────────────────────────────────────────────────────────────────────
describe('syncChallengeToDb', () => {
  it('creates rows (2 visible + 2 hidden) on first sync', async () => {
    const visible = [
      { id: 'v-1', stdin: 'a', expectedStdout: 'b', weight: 1, orderIndex: 0 },
      { id: 'v-2', stdin: 'c', expectedStdout: 'd', weight: 1, orderIndex: 1 },
    ];
    const hidden = [
      { id: 'h-1', stdin: 'e', expectedStdout: 'f', weight: 1, orderIndex: 0 },
      { id: 'h-2', stdin: 'g', expectedStdout: 'h', weight: 1, orderIndex: 1 },
    ];
    const repo = repoFor('two-sum', { visible });
    __setFetchers({
      publicFetcher: buildPublicFetcher(repo),
      privateFetcher: buildPrivateFetcher({ 'two-sum': hidden }),
    });

    const result = await syncChallengeToDb('two-sum');
    expect(result.challenge.slug).toBe('two-sum');
    expect(result.cases).toHaveLength(4);
    expect(result.cases.filter((c: any) => c.isHidden === false)).toHaveLength(2);
    expect(result.cases.filter((c: any) => c.isHidden === true)).toHaveLength(2);
  });

  it('is idempotent: two sequential calls produce identical DB state', async () => {
    const repo = repoFor('two-sum');
    __setFetchers({
      publicFetcher: buildPublicFetcher(repo),
      privateFetcher: buildPrivateFetcher({ 'two-sum': goodHidden() }),
    });

    await syncChallengeToDb('two-sum');
    const snap1 = JSON.stringify(
      [...cases.values()].sort((a, b) => a.id.localeCompare(b.id)),
    );
    await syncChallengeToDb('two-sum');
    const snap2 = JSON.stringify(
      [...cases.values()].sort((a, b) => a.id.localeCompare(b.id)),
    );
    expect(snap1).toBe(snap2);
    expect(challenges.size).toBe(1);
  });

  it('removes a test case that was deleted from the repo', async () => {
    const visibleV1 = [
      { id: 'v-1', stdin: 'a', expectedStdout: 'b', weight: 1, orderIndex: 0 },
      { id: 'v-2', stdin: 'c', expectedStdout: 'd', weight: 1, orderIndex: 1 },
    ];
    const visibleV2 = [
      { id: 'v-1', stdin: 'a', expectedStdout: 'b', weight: 1, orderIndex: 0 },
    ];

    __setFetchers({
      publicFetcher: buildPublicFetcher(repoFor('two-sum', { visible: visibleV1 })),
      privateFetcher: buildPrivateFetcher({ 'two-sum': goodHidden() }),
    });
    await syncChallengeToDb('two-sum');
    expect([...cases.values()].filter((c) => !c.isHidden)).toHaveLength(2);

    // Second sync with smaller visible set.
    invalidateCache();
    __setFetchers({
      publicFetcher: buildPublicFetcher(repoFor('two-sum', { visible: visibleV2 })),
      privateFetcher: buildPrivateFetcher({ 'two-sum': goodHidden() }),
    });
    await syncChallengeToDb('two-sum');
    const visibleRows = [...cases.values()].filter((c) => !c.isHidden);
    expect(visibleRows).toHaveLength(1);
    expect(visibleRows[0].id).toBe('v-1');
  });

  it('wraps writes in a transaction', async () => {
    const repo = repoFor('two-sum');
    __setFetchers({
      publicFetcher: buildPublicFetcher(repo),
      privateFetcher: buildPrivateFetcher({ 'two-sum': goodHidden() }),
    });

    await syncChallengeToDb('two-sum');
    expect(fakePrisma.$transaction).toHaveBeenCalled();
  });

  it('re-throws ChallengeValidationError when hidden tests unavailable', async () => {
    const repo = repoFor('two-sum');
    __setFetchers({
      publicFetcher: buildPublicFetcher(repo),
      privateFetcher: buildPrivateFetcher({ 'other-slug': goodHidden() }),
    });

    await expect(syncChallengeToDb('two-sum')).rejects.toBeInstanceOf(
      ChallengeValidationError,
    );
  });
});
