import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/identity', () => ({
  getCallerIdentity: vi.fn(),
}));

vi.mock('@/lib/githubManifestCache', () => ({
  invalidate: vi.fn(),
}));

import { POST } from './route';
import { getCallerIdentity } from '@/lib/identity';
import { invalidate } from '@/lib/githubManifestCache';
import type { NextRequest } from 'next/server';

const mockIdentity = getCallerIdentity as unknown as ReturnType<typeof vi.fn>;
const mockInvalidate = invalidate as unknown as ReturnType<typeof vi.fn>;

function makeRequest(body?: unknown, headers?: Record<string, string>): NextRequest {
  const init: RequestInit = { method: 'POST' };
  const hdrs: Record<string, string> = { ...(headers ?? {}) };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    hdrs['Content-Type'] = 'application/json';
  }
  if (Object.keys(hdrs).length > 0) init.headers = hdrs;
  return new Request('http://localhost/api/github/cache/invalidate', init) as unknown as NextRequest;
}

describe('POST /api/github/cache/invalidate', () => {
  beforeEach(() => {
    mockIdentity.mockReset();
    mockInvalidate.mockReset().mockReturnValue(1);
  });

  it('anonymous caller → 401 and does not invalidate', async () => {
    mockIdentity.mockResolvedValue({ type: 'anonymous' });

    const res = await POST(makeRequest({ scope: 'all' }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: 'unauthorized' });
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('associate caller → 401 and does not invalidate', async () => {
    mockIdentity.mockResolvedValue({ type: 'associate', associateId: 5, ver: 'v1' });

    const res = await POST(makeRequest({ scope: 'all' }));

    expect(res.status).toBe(401);
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it("trainer caller with {scope:'all'} → invalidates all and returns cleared count", async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' });
    mockInvalidate.mockReturnValue(3);

    const res = await POST(makeRequest({ scope: 'all' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ cleared: 3 });
    expect(mockInvalidate).toHaveBeenCalledWith('all');
  });

  it('trainer caller with scoped object → invalidates that specific key', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' });
    mockInvalidate.mockReturnValue(1);

    const scope = { owner: 'o', repo: 'r', branch: 'b' };
    const res = await POST(makeRequest({ scope }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ cleared: 1 });
    expect(mockInvalidate).toHaveBeenCalledWith(scope);
  });

  it('cross-origin POST → 403 before identity check, does not invalidate', async () => {
    // Identity is never consulted for cross-origin requests.
    mockIdentity.mockResolvedValue({ type: 'trainer' });

    const res = await POST(
      makeRequest({ scope: 'all' }, { Origin: 'https://evil.example.com', Host: 'localhost' }),
    );
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ error: 'cross-origin' });
    expect(mockInvalidate).not.toHaveBeenCalled();
  });

  it('same-origin POST (Origin host matches Host header) → proceeds normally', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' });
    mockInvalidate.mockReturnValue(2);

    const res = await POST(
      makeRequest({ scope: 'all' }, { Origin: 'http://localhost', Host: 'localhost' }),
    );

    expect(res.status).toBe(200);
    expect(mockInvalidate).toHaveBeenCalledWith('all');
  });

  it('trainer caller with empty body → invalidates default repo/branch key', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' });
    mockInvalidate.mockReturnValue(1);

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ cleared: 1 });
    expect(mockInvalidate).toHaveBeenCalledWith({
      owner: 'JesterCharles',
      repo: 'mock-question-bank',
      branch: 'main',
    });
  });
});
