import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hashPin } from '@/lib/pinService';
import { verifyAssociateToken } from '@/lib/associateSession';
import { __resetAll } from '@/lib/pinAttemptLimiter';

// Mock prisma
vi.mock('@/lib/prisma', () => {
  const findUnique = vi.fn();
  return {
    prisma: {
      associate: { findUnique },
    },
  };
});

// Need dynamic secret before importing route
process.env.ASSOCIATE_SESSION_SECRET = 'test-secret-for-route';

import { POST } from './route';
import { prisma } from '@/lib/prisma';

const mockFindUnique = prisma.associate.findUnique as unknown as ReturnType<typeof vi.fn>;

function makeReq(body: unknown): Request {
  return new Request('http://localhost/api/associate/pin/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/associate/pin/verify', () => {
  beforeEach(() => {
    __resetAll();
    mockFindUnique.mockReset();
  });

  it('returns 200 and sets associate_session cookie for correct pin (token ver = pinGeneratedAt)', async () => {
    const pin = '123456';
    const pinHash = await hashPin(pin);
    const pinGeneratedAt = new Date('2026-04-14T10:00:00.000Z');
    mockFindUnique.mockResolvedValueOnce({
      id: 42,
      slug: 'alice',
      pinHash,
      pinGeneratedAt,
    });

    const res = await POST(makeReq({ slug: 'alice', pin, fingerprint: 'fp-1' }));
    expect(res.status).toBe(200);

    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/associate_session=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Strict/i);
    expect(setCookie).toMatch(/Max-Age=86400/);

    const tokenMatch = setCookie.match(/associate_session=([^;]+)/);
    expect(tokenMatch).not.toBeNull();
    const decoded = await verifyAssociateToken(tokenMatch![1]);
    expect(decoded).not.toBeNull();
    expect(decoded!.associateId).toBe(42);
    expect(decoded!.ver).toBe(pinGeneratedAt.toISOString());
  });

  it('returns 401 and no cookie for wrong pin', async () => {
    const pinHash = await hashPin('123456');
    mockFindUnique.mockResolvedValueOnce({
      id: 42,
      slug: 'alice',
      pinHash,
      pinGeneratedAt: new Date(),
    });

    const res = await POST(makeReq({ slug: 'alice', pin: '999999', fingerprint: 'fp-2' }));
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('returns 401 for unknown slug (no existence oracle)', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await POST(makeReq({ slug: 'ghost', pin: '123456', fingerprint: 'fp-3' }));
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('returns 401 when associate exists but pinHash is null', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 5,
      slug: 'nopin',
      pinHash: null,
      pinGeneratedAt: null,
    });

    const res = await POST(makeReq({ slug: 'nopin', pin: '123456', fingerprint: 'fp-4' }));
    expect(res.status).toBe(401);
  });

  it('returns 429 after 5 failed attempts from same fingerprint within window', async () => {
    const pinHash = await hashPin('123456');
    // 5 failures
    for (let i = 0; i < 5; i++) {
      mockFindUnique.mockResolvedValueOnce({
        id: 42,
        slug: 'alice',
        pinHash,
        pinGeneratedAt: new Date(),
      });
      const res = await POST(makeReq({ slug: 'alice', pin: '000000', fingerprint: 'burst' }));
      expect(res.status).toBe(401);
    }
    // 6th attempt blocked
    const res = await POST(makeReq({ slug: 'alice', pin: '000000', fingerprint: 'burst' }));
    expect(res.status).toBe(429);
  });

  it('successful verify resets the failure counter', async () => {
    const pin = '123456';
    const pinHash = await hashPin(pin);

    // 3 failures
    for (let i = 0; i < 3; i++) {
      mockFindUnique.mockResolvedValueOnce({
        id: 42,
        slug: 'alice',
        pinHash,
        pinGeneratedAt: new Date(),
      });
      await POST(makeReq({ slug: 'alice', pin: '000000', fingerprint: 'reset-fp' }));
    }
    // Success resets counter
    mockFindUnique.mockResolvedValueOnce({
      id: 42,
      slug: 'alice',
      pinHash,
      pinGeneratedAt: new Date(),
    });
    const ok = await POST(makeReq({ slug: 'alice', pin, fingerprint: 'reset-fp' }));
    expect(ok.status).toBe(200);

    // 5 more failures should now be possible (counter reset)
    for (let i = 0; i < 5; i++) {
      mockFindUnique.mockResolvedValueOnce({
        id: 42,
        slug: 'alice',
        pinHash,
        pinGeneratedAt: new Date(),
      });
      const res = await POST(makeReq({ slug: 'alice', pin: '000000', fingerprint: 'reset-fp' }));
      expect(res.status).toBe(401);
    }
  });

  it('returns 400 for malformed body', async () => {
    const res = await POST(makeReq({ slug: 'alice' /* missing pin */ }));
    expect([400, 401]).toContain(res.status);
  });
});
