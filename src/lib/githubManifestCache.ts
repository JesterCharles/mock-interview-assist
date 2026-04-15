/**
 * In-memory manifest cache for GitHub question-bank trees.
 *
 * - 5-minute TTL per (owner, repo, branch) key.
 * - ETag revalidation: on TTL expiry, re-fetch with If-None-Match.
 *   304 → keep body, reset expiresAt, update lastSyncedAt.
 *   200 → replace entry with new body/etag/timestamps.
 * - Stampede dedupe: concurrent cold callers share one in-flight promise.
 * - Trainer invalidate endpoint clears entries explicitly.
 *
 * Mirrors module-state pattern in `pinAttemptLimiter.ts`:
 * no class, top-level Map, `__resetAll` + `__setFetcher` test hooks.
 *
 * Single-node deployment only (GCE Docker). For horizontal scale, move to Redis.
 */

import type { GitHubFile } from './github-service';

export const MANIFEST_TTL_MS = 5 * 60_000;

const OWNER_DEFAULT = 'JesterCharles';
const REPO_DEFAULT = 'mock-question-bank';

export interface ManifestResult {
  files: GitHubFile[];
  lastSyncedAt: number;
  etag: string;
}

interface CacheEntry {
  files: GitHubFile[];
  etag: string;
  lastSyncedAt: number;
  expiresAt: number;
}

export type FetcherResponse =
  | { status: 200; files: GitHubFile[]; etag: string; truncated: boolean }
  | { status: 304; etag: string };

export type FetcherFn = (args: {
  owner: string;
  repo: string;
  branch: string;
  etag?: string;
}) => Promise<FetcherResponse>;

const cacheKey = (owner: string, repo: string, branch: string) =>
  `${owner}/${repo}@${branch}`;

const store = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<ManifestResult>>();
// Bumped on every invalidate() call. In-flight fetches capture the generation
// at start; if it changes before the write, the stale response is discarded
// instead of resurrecting cleared cache state.
let generation = 0;

interface TreeEntry {
  path: string;
  type: string;
  sha: string;
  size?: number;
}

const defaultFetcher: FetcherFn = async ({ owner, repo, branch, etag }) => {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers['Authorization'] = `token ${token}`;
  if (etag) headers['If-None-Match'] = etag;

  const response = await fetch(url, { headers });

  if (response.status === 304) {
    return { status: 304, etag: etag ?? '' };
  }
  if (!response.ok) {
    throw new Error(
      `GitHub Trees API error: ${response.status} ${response.statusText}`,
    );
  }

  const responseEtag = response.headers.get('etag') ?? '';
  const body = (await response.json()) as {
    tree: TreeEntry[];
    truncated: boolean;
  };

  const files: GitHubFile[] = body.tree
    .filter((e) => e.type === 'blob' && e.path.endsWith('.md'))
    .map((e) => ({
      name: e.path.split('/').pop() ?? e.path,
      path: e.path,
      sha: e.sha,
      size: e.size ?? 0,
      url: '',
      html_url: '',
      git_url: '',
      download_url: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${e.path}`,
      type: 'file',
    }));

  return {
    status: 200,
    files,
    etag: responseEtag,
    truncated: Boolean(body.truncated),
  };
};

let activeFetcher: FetcherFn = defaultFetcher;

export async function getManifest(
  owner: string,
  repo: string,
  branch: string,
): Promise<ManifestResult> {
  const key = cacheKey(owner, repo, branch);

  const pending = inFlight.get(key);
  if (pending) {
    console.log(`[manifest-cache] stampede-dedup key=${key}`);
    return pending;
  }

  const existing = store.get(key);
  const now = Date.now();
  if (existing && now < existing.expiresAt) {
    console.log(`[manifest-cache] hit key=${key}`);
    return {
      files: existing.files,
      lastSyncedAt: existing.lastSyncedAt,
      etag: existing.etag,
    };
  }

  const startGen = generation;
  const promise = (async (): Promise<ManifestResult> => {
    const response = await activeFetcher({
      owner,
      repo,
      branch,
      etag: existing?.etag,
    });

    const settledAt = Date.now();

    if (response.status === 304) {
      if (!existing) {
        // Defensive: 304 without a prior entry should not happen.
        throw new Error('[manifest-cache] 304 without prior entry');
      }
      if (startGen !== generation) {
        // Invalidated mid-flight: return the result to the original caller
        // but do NOT mutate the (already-cleared) cache entry.
        console.log(
          `[manifest-cache] discarding stale 304 write key=${key} (invalidated mid-flight)`,
        );
        return {
          files: existing.files,
          lastSyncedAt: settledAt,
          etag: existing.etag,
        };
      }
      existing.lastSyncedAt = settledAt;
      existing.expiresAt = settledAt + MANIFEST_TTL_MS;
      console.log(`[manifest-cache] revalidate-304 key=${key}`);
      return {
        files: existing.files,
        lastSyncedAt: existing.lastSyncedAt,
        etag: existing.etag,
      };
    }

    if (response.truncated) {
      console.warn('[manifest-cache] tree truncated', key);
    }

    const entry: CacheEntry = {
      files: response.files,
      etag: response.etag,
      lastSyncedAt: settledAt,
      expiresAt: settledAt + MANIFEST_TTL_MS,
    };
    if (startGen !== generation) {
      // Invalidated mid-flight: honor this fetch for the in-flight caller but
      // do not write stale-by-policy data back into the cache.
      console.log(
        `[manifest-cache] discarding stale 200 write key=${key} (invalidated mid-flight)`,
      );
      return {
        files: entry.files,
        lastSyncedAt: entry.lastSyncedAt,
        etag: entry.etag,
      };
    }
    store.set(key, entry);
    console.log(
      `[manifest-cache] ${existing ? 'revalidate-200' : 'miss'} key=${key}`,
    );
    return {
      files: entry.files,
      lastSyncedAt: entry.lastSyncedAt,
      etag: entry.etag,
    };
  })();

  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

export function invalidate(
  scope?: { owner: string; repo: string; branch: string } | 'all',
): number {
  // Bump generation on every invalidate so any in-flight fetch that started
  // before this call will discard its write instead of resurrecting cleared state.
  generation++;
  if (!scope || scope === 'all') {
    const n = store.size;
    store.clear();
    inFlight.clear();
    console.log(`[manifest-cache] invalidate scope=all n=${n}`);
    return n;
  }
  const key = cacheKey(scope.owner, scope.repo, scope.branch);
  const deleted = store.delete(key) ? 1 : 0;
  inFlight.delete(key);
  console.log(`[manifest-cache] invalidate key=${key} cleared=${deleted}`);
  return deleted;
}

/** Test-only: inject a fetcher. Passing `null` restores the default. */
export function __setFetcher(fn: FetcherFn | null): void {
  activeFetcher = fn ?? defaultFetcher;
}

/** Test-only: fully reset module state. */
export function __resetAll(): void {
  store.clear();
  inFlight.clear();
  activeFetcher = defaultFetcher;
  generation = 0;
}

// Silence unused-constant lints while keeping defaults colocated with caller docs.
void OWNER_DEFAULT;
void REPO_DEFAULT;
