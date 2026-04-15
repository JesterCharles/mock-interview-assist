import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hashPin } from '@/lib/pinService';
import { verifyAssociateToken } from '@/lib/associateSession';
import { __resetAll } from '@/lib/pinAttemptLimiter';

// Mock prisma — PIN-only login uses findMany over candidates
vi.mock('@/lib/prisma', () => {
  const findMany = vi.fn();
  return {
    prisma: {
      associate: { findMany },
    },
  };
});

// Need dynamic secret before importing route
process.env.ASSOCIATE_SESSION_SECRET = 'test-secret-for-route';

import { POST } from './route';
import { prisma } from '@/lib/prisma';

const mockFindMany = prisma.associate.findMany as unknown as ReturnType<typeof vi.fn>;

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/associate/pin/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/associate/pin/verify (PIN-only)', () => {
  beforeEach(() => {
    __resetAll();
    mockFindMany.mockReset();
  });

  it('returns 200 + cookie + slug on unique match (token ver = pinGeneratedAt)', async () => {
    const pin = '123456';
    const pinHash = await hashPin(pin);
    const pinGeneratedAt = new Date('2026-04-14T10:00:00.000Z');
    mockFindMany.mockResolvedValueOnce([
      { id: 42, slug: 'alice', pinHash, pinGeneratedAt },
    ]);

    const res = await POST(makeReq({ pin, fingerprint: 'fp-1' }));
    expect(res.status).toBe(200);

    const body = (await res.json()) as { ok: boolean; slug: string };
    expect(body.ok).toBe(true);
    expect(body.slug).toBe('alice');

    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/associate_session=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);

    const tokenMatch = setCookie.match(/associate_session=([^;]+)/);
    const decoded = await verifyAssociateToken(tokenMatch![1]);
    expect(decoded!.associateId).toBe(42);
    expect(decoded!.ver).toBe(pinGeneratedAt.toISOString());
  });

  it('returns 401 when no candidate matches the PIN', async () => {
    const pinHash = await hashPin('123456');
    mockFindMany.mockResolvedValueOnce([
      { id: 42, slug: 'alice', pinHash, pinGeneratedAt: new Date() },
    ]);

    const res = await POST(makeReq({ pin: '999999', fingerprint: 'fp-2' }));
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('returns 401 when no candidates exist at all (no oracle)', async () => {
    mockFindMany.mockResolvedValueOnce([]);

    const res = await POST(makeReq({ pin: '123456', fingerprint: 'fp-3' }));
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('returns 401 on PIN collision (>1 candidate matches the same PIN)', async () => {
    const pin = '123456';
    const hashA = await hashPin(pin);
    const hashB = await hashPin(pin);
    mockFindMany.mockResolvedValueOnce([
      { id: 1, slug: 'alice', pinHash: hashA, pinGeneratedAt: new Date() },
      { id: 2, slug: 'bob', pinHash: hashB, pinGeneratedAt: new Date() },
    ]);

    const res = await POST(makeReq({ pin, fingerprint: 'fp-collision' }));
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('returns 429 after 5 failed attempts from same fingerprint', async () => {
    const pinHash = await hashPin('123456');
    for (let i = 0; i < 5; i++) {
      mockFindMany.mockResolvedValueOnce([
        { id: 42, slug: 'alice', pinHash, pinGeneratedAt: new Date() },
      ]);
      const res = await POST(makeReq({ pin: '000000', fingerprint: 'burst' }));
      expect(res.status).toBe(401);
    }
    const res = await POST(makeReq({ pin: '000000', fingerprint: 'burst' }));
    expect(res.status).toBe(429);
  });

  it('successful verify resets the failure counter', async () => {
    const pin = '123456';
    const pinHash = await hashPin(pin);

    for (let i = 0; i < 3; i++) {
      mockFindMany.mockResolvedValueOnce([
        { id: 42, slug: 'alice', pinHash, pinGeneratedAt: new Date() },
      ]);
      await POST(makeReq({ pin: '000000', fingerprint: 'reset-fp' }));
    }

    mockFindMany.mockResolvedValueOnce([
      { id: 42, slug: 'alice', pinHash, pinGeneratedAt: new Date() },
    ]);
    const ok = await POST(makeReq({ pin, fingerprint: 'reset-fp' }));
    expect(ok.status).toBe(200);

    for (let i = 0; i < 5; i++) {
      mockFindMany.mockResolvedValueOnce([
        { id: 42, slug: 'alice', pinHash, pinGeneratedAt: new Date() },
      ]);
      const res = await POST(makeReq({ pin: '000000', fingerprint: 'reset-fp' }));
      expect(res.status).toBe(401);
    }
  });

  it('returns 400 for malformed body (missing pin)', async () => {
    const res = await POST(makeReq({ fingerprint: 'fp-bad' }));
    expect([400, 401]).toContain(res.status);
  });
});
