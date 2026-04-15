import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getManifest,
  invalidate,
  MANIFEST_TTL_MS,
  __setFetcher,
  __resetAll,
  type FetcherFn,
} from './githubManifestCache';

const OWNER = 'owner';
const REPO = 'repo';
const BRANCH = 'main';

function makeFiles(n = 1, prefix = 'a') {
  return Array.from({ length: n }, (_, i) => ({
    name: `${prefix}${i}.md`,
    path: `${prefix}/${prefix}${i}.md`,
    sha: `sha-${prefix}-${i}`,
    size: 100,
    url: '',
    html_url: '',
    git_url: '',
    download_url: `https://raw.githubusercontent.com/owner/repo/main/${prefix}/${prefix}${i}.md`,
    type: 'file' as const,
  }));
}

describe('githubManifestCache', () => {
  beforeEach(() => {
    __resetAll();
  });

  it('cold fetch: empty cache → calls fetcher → stores entry and returns manifest', async () => {
    const files = makeFiles(2);
    const fetcher: FetcherFn = vi.fn(async () => ({
      status: 200,
      files,
      etag: 'etag-v1',
      truncated: false,
    }));
    __setFetcher(fetcher);

    const result = await getManifest(OWNER, REPO, BRANCH);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.files).toEqual(files);
    expect(result.etag).toBe('etag-v1');
    expect(typeof result.lastSyncedAt).toBe('number');
  });

  it('warm hit: second call within TTL does not call fetcher and returns same entry', async () => {
    const files = makeFiles(1);
    const fetcher = vi.fn(async () => ({
      status: 200 as const,
      files,
      etag: 'etag-1',
      truncated: false,
    }));
    __setFetcher(fetcher);

    const first = await getManifest(OWNER, REPO, BRANCH);
    const second = await getManifest(OWNER, REPO, BRANCH);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(second.files).toBe(first.files);
    expect(second.etag).toBe(first.etag);
    expect(second.lastSyncedAt).toBe(first.lastSyncedAt);
  });

  it('TTL expired + 304: fetcher called with If-None-Match, files unchanged, expiresAt reset, lastSyncedAt updated', async () => {
    const files = makeFiles(3);
    const fetcher = vi.fn(async (args: { etag?: string }) => {
      if (!args.etag) {
        return { status: 200 as const, files, etag: 'etag-A', truncated: false };
      }
      expect(args.etag).toBe('etag-A');
      return { status: 304 as const, etag: 'etag-A' };
    });
    __setFetcher(fetcher);

    const first = await getManifest(OWNER, REPO, BRANCH);
    const firstFilesRef = first.files;
    const firstSyncedAt = first.lastSyncedAt;

    // Expire the entry
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + MANIFEST_TTL_MS + 1000);

    const second = await getManifest(OWNER, REPO, BRANCH);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(second.files).toBe(firstFilesRef); // same reference (unchanged)
    expect(second.etag).toBe('etag-A');
    expect(second.lastSyncedAt).toBeGreaterThan(firstSyncedAt);

    vi.useRealTimers();
  });

  it('TTL expired + 200: fetcher returns new body+etag, cache replaces entry', async () => {
    const filesV1 = makeFiles(1, 'v1');
    const filesV2 = makeFiles(2, 'v2');
    const responses = [
      { status: 200 as const, files: filesV1, etag: 'etag-1', truncated: false },
      { status: 200 as const, files: filesV2, etag: 'etag-2', truncated: false },
    ];
    const fetcher = vi.fn(async () => responses.shift()!);
    __setFetcher(fetcher);

    const first = await getManifest(OWNER, REPO, BRANCH);
    expect(first.etag).toBe('etag-1');

    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + MANIFEST_TTL_MS + 1000);

    const second = await getManifest(OWNER, REPO, BRANCH);
    expect(second.etag).toBe('etag-2');
    expect(second.files).toEqual(filesV2);

    vi.useRealTimers();
  });

  it('invalidate(scope): removes key; next call refetches', async () => {
    const files = makeFiles(1);
    const fetcher = vi.fn(async () => ({
      status: 200 as const,
      files,
      etag: 'e',
      truncated: false,
    }));
    __setFetcher(fetcher);

    await getManifest(OWNER, REPO, BRANCH);
    expect(fetcher).toHaveBeenCalledTimes(1);

    const cleared = invalidate({ owner: OWNER, repo: REPO, branch: BRANCH });
    expect(cleared).toBe(1);

    await getManifest(OWNER, REPO, BRANCH);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("invalidate('all'): clears all keys", async () => {
    const fetcher = vi.fn(async () => ({
      status: 200 as const,
      files: makeFiles(1),
      etag: 'e',
      truncated: false,
    }));
    __setFetcher(fetcher);

    await getManifest('o1', 'r1', 'main');
    await getManifest('o2', 'r2', 'main');
    expect(fetcher).toHaveBeenCalledTimes(2);

    const cleared = invalidate('all');
    expect(cleared).toBe(2);

    await getManifest('o1', 'r1', 'main');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('stampede: two concurrent getManifest() calls → fetcher invoked exactly once', async () => {
    let resolveFetch: (v: { status: 200; files: any[]; etag: string; truncated: boolean }) => void;
    const deferred = new Promise<{ status: 200; files: any[]; etag: string; truncated: boolean }>(
      (r) => {
        resolveFetch = r;
      },
    );
    const fetcher = vi.fn(async () => deferred);
    __setFetcher(fetcher);

    const p1 = getManifest(OWNER, REPO, BRANCH);
    const p2 = getManifest(OWNER, REPO, BRANCH);

    const files = makeFiles(1);
    resolveFetch!({ status: 200, files, etag: 'one', truncated: false });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(r1.etag).toBe('one');
    expect(r2.etag).toBe('one');
    expect(r1.files).toBe(r2.files);
  });

  it('truncated tree: returns result and emits console.warn', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetcher = vi.fn(async () => ({
      status: 200 as const,
      files: makeFiles(1),
      etag: 'etag-t',
      truncated: true,
    }));
    __setFetcher(fetcher);

    const result = await getManifest(OWNER, REPO, BRANCH);
    expect(result.files.length).toBe(1);
    expect(warn).toHaveBeenCalled();
    const msg = warn.mock.calls[0]?.[0];
    expect(String(msg)).toContain('truncated');

    warn.mockRestore();
  });
});
