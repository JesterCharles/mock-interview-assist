/**
 * Tests for POST /api/coding/bank/refresh (Plan 37-03).
 *
 * Auth matrix, body validation, batch error isolation, cache invalidation order.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/identity', () => ({
  getCallerIdentity: vi.fn(),
}));
vi.mock('@/lib/coding-challenge-service', () => ({
  listChallenges: vi.fn(),
  syncChallengeToDb: vi.fn(),
  invalidateCache: vi.fn(() => 0),
}));

import { POST } from './route';
import { getCallerIdentity } from '@/lib/identity';
import {
  listChallenges,
  syncChallengeToDb,
  invalidateCache,
} from '@/lib/coding-challenge-service';
import { ChallengeValidationError } from '@/lib/coding-bank-schemas';

function makeReq(body?: unknown): NextRequest {
  if (body === undefined) {
    return new NextRequest('http://test/api/coding/bank/refresh', { method: 'POST' });
  }
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  return new NextRequest('http://test/api/coding/bank/refresh', {
    method: 'POST',
    body: payload,
    headers: { 'content-type': 'application/json', 'content-length': String(payload.length) },
  });
}

describe('POST /api/coding/bank/refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for anonymous caller', async () => {
    vi.mocked(getCallerIdentity).mockResolvedValue({ kind: 'anonymous' });
    const res = await POST(makeReq({}));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('unauthorized');
  });

  it('returns 403 for associate caller', async () => {
    vi.mocked(getCallerIdentity).mockResolvedValue({
      kind: 'associate',
      userId: 'u1',
      email: 'a@x',
      associateId: 1,
      associateSlug: 'alice',
    });
    const res = await POST(makeReq({}));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('forbidden');
  });

  it('returns 200 for admin caller', async () => {
    vi.mocked(getCallerIdentity).mockResolvedValue({
      kind: 'admin',
      userId: 'a',
      email: 'admin@x',
    });
    vi.mocked(listChallenges).mockResolvedValue([]);
    const res = await POST(makeReq({}));
    expect(res.status).toBe(200);
  });

  it('full-sync: invokes listChallenges + per-slug syncChallengeToDb', async () => {
    vi.mocked(getCallerIdentity).mockResolvedValue({
      kind: 'trainer',
      userId: 'u1',
      email: 't@x',
    });
    vi.mocked(listChallenges).mockResolvedValue([
      { slug: 'a', title: '', difficulty: 'easy', cohortId: null, skillSlug: '', languages: ['python'] },
      { slug: 'b', title: '', difficulty: 'easy', cohortId: null, skillSlug: '', languages: ['python'] },
    ]);
    vi.mocked(syncChallengeToDb).mockResolvedValue({ challenge: {} as any, cases: [] });

    const res = await POST(makeReq({}));
    expect(res.status).toBe(200);
    expect(invalidateCache).toHaveBeenCalledWith(); // full flush
    expect(syncChallengeToDb).toHaveBeenCalledTimes(2);

    const body = await res.json();
    expect(body).toEqual({ synced: 2, skipped: 0, errors: [] });
  });

  it('targeted-slug sync: listChallenges NOT called; per-slug invalidate+sync invoked', async () => {
    vi.mocked(getCallerIdentity).mockResolvedValue({
      kind: 'trainer',
      userId: 'u',
      email: 't@x',
    });
    vi.mocked(syncChallengeToDb).mockResolvedValue({ challenge: {} as any, cases: [] });

    const res = await POST(makeReq({ slugs: ['x', 'y'] }));
    expect(res.status).toBe(200);
    expect(listChallenges).not.toHaveBeenCalled();
    expect(syncChallengeToDb).toHaveBeenCalledTimes(2);

    const body = await res.json();
    expect(body.synced).toBe(2);
  });

  it('empty slugs array falls back to full sync', async () => {
    vi.mocked(getCallerIdentity).mockResolvedValue({
      kind: 'trainer',
      userId: 'u',
      email: 't@x',
    });
    vi.mocked(listChallenges).mockResolvedValue([]);

    const res = await POST(makeReq({ slugs: [] }));
    expect(res.status).toBe(200);
    expect(listChallenges).toHaveBeenCalled();
  });

  it('validation error on one slug is isolated; batch continues', async () => {
    vi.mocked(getCallerIdentity).mockResolvedValue({
      kind: 'trainer',
      userId: 'u',
      email: 't@x',
    });
    vi.mocked(syncChallengeToDb).mockImplementation(async (slug) => {
      if (slug === 'bad') {
        throw new ChallengeValidationError('meta.slug', 'regex failed', 'bad');
      }
      return { challenge: {} as any, cases: [] };
    });

    const res = await POST(makeReq({ slugs: ['ok1', 'bad', 'ok2'] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.synced).toBe(2);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].slug).toBe('bad');
    expect(body.errors[0].reason).toContain('regex failed');
    expect(body.errors[0].reason).not.toContain('at ');
  });

  it('non-validation error captured with sanitized reason (no stack)', async () => {
    vi.mocked(getCallerIdentity).mockResolvedValue({
      kind: 'trainer',
      userId: 'u',
      email: 't@x',
    });
    vi.mocked(syncChallengeToDb).mockImplementation(async (slug) => {
      if (slug === 'boom') {
        const e = new Error('network down\n  at foo (bar.js:1:1)\n  at baz');
        throw e;
      }
      return { challenge: {} as any, cases: [] };
    });

    const res = await POST(makeReq({ slugs: ['boom'] }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.errors[0].reason).toBe('network down');
  });

  it('malformed JSON → 400', async () => {
    vi.mocked(getCallerIdentity).mockResolvedValue({
      kind: 'trainer',
      userId: 'u',
      email: 't@x',
    });
    const res = await POST(makeReq('this is not json'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_body');
  });

  it('slugs must be array of strings → 400', async () => {
    vi.mocked(getCallerIdentity).mockResolvedValue({
      kind: 'trainer',
      userId: 'u',
      email: 't@x',
    });
    const res = await POST(makeReq({ slugs: [42] }));
    expect(res.status).toBe(400);
  });

  it('invalid slug format → 400', async () => {
    vi.mocked(getCallerIdentity).mockResolvedValue({
      kind: 'trainer',
      userId: 'u',
      email: 't@x',
    });
    const res = await POST(makeReq({ slugs: ['Not A Slug'] }));
    expect(res.status).toBe(400);
  });

  it('listChallenges throws ChallengeValidationError → 200 with manifest error', async () => {
    vi.mocked(getCallerIdentity).mockResolvedValue({
      kind: 'trainer',
      userId: 'u',
      email: 't@x',
    });
    vi.mocked(listChallenges).mockRejectedValue(
      new ChallengeValidationError('manifest', 'duplicate slug "x"'),
    );
    const res = await POST(makeReq({}));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.synced).toBe(0);
    expect(body.errors[0].slug).toBe('manifest');
    expect(body.errors[0].reason).toContain('duplicate slug');
  });

  it('listChallenges throws unexpected error → 502', async () => {
    vi.mocked(getCallerIdentity).mockResolvedValue({
      kind: 'trainer',
      userId: 'u',
      email: 't@x',
    });
    vi.mocked(listChallenges).mockRejectedValue(new Error('GitHub 503'));
    const res = await POST(makeReq({}));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe('upstream_unavailable');
  });

  it('targeted path: invalidateCache runs before syncChallengeToDb for each slug', async () => {
    const callOrder: string[] = [];
    vi.mocked(invalidateCache).mockImplementation((scope?: string) => {
      callOrder.push(`invalidate:${scope ?? 'all'}`);
      return 0;
    });
    vi.mocked(syncChallengeToDb).mockImplementation(async (slug) => {
      callOrder.push(`sync:${slug}`);
      return { challenge: {} as any, cases: [] };
    });
    vi.mocked(getCallerIdentity).mockResolvedValue({
      kind: 'trainer',
      userId: 'u',
      email: 't@x',
    });

    await POST(makeReq({ slugs: ['x'] }));
    expect(callOrder).toEqual([
      'invalidate:public:x:*',
      'invalidate:private:x:*',
      'sync:x',
    ]);
  });
});
