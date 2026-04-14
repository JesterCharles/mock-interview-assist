import { describe, it, expect, beforeEach, vi } from 'vitest';

process.env.ASSOCIATE_SESSION_SECRET = 'test-secret-for-auth-server';

// Stub server-only (Next.js module; not resolvable in Vitest node env)
vi.mock('server-only', () => ({}));

// Mock prisma (used transitively by associateService)
vi.mock('@/lib/prisma', () => {
  const findUnique = vi.fn();
  return {
    prisma: {
      associate: { findUnique },
    },
  };
});

// Mock next/headers cookies()
const cookieStoreMock = {
  _cookies: new Map<string, string>(),
  get(name: string) {
    const v = this._cookies.get(name);
    return v === undefined ? undefined : { name, value: v };
  },
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStoreMock),
}));

import { signAssociateToken } from '@/lib/associateSession';
import {
  isAuthenticatedSession,
  isAssociateAuthenticated,
  getAssociateIdentity,
  getAssociateSession,
} from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

const mockFindUnique = prisma.associate.findUnique as unknown as ReturnType<typeof vi.fn>;

function setCookies(map: Record<string, string>) {
  cookieStoreMock._cookies.clear();
  for (const [k, v] of Object.entries(map)) cookieStoreMock._cookies.set(k, v);
}

describe('isAuthenticatedSession (trainer-only, unchanged)', () => {
  beforeEach(() => {
    setCookies({});
    mockFindUnique.mockReset();
  });

  it('returns true when nlm_session=authenticated', async () => {
    setCookies({ nlm_session: 'authenticated' });
    expect(await isAuthenticatedSession()).toBe(true);
  });

  it('returns false when only associate_session is present (D-13: stays trainer-only)', async () => {
    const token = signAssociateToken(1, new Date('2026-04-14T10:00:00.000Z'));
    setCookies({ associate_session: token });
    expect(await isAuthenticatedSession()).toBe(false);
  });

  it('returns false when no cookies', async () => {
    expect(await isAuthenticatedSession()).toBe(false);
  });
});

describe('isAssociateAuthenticated (ver vs pinGeneratedAt)', () => {
  const pinGeneratedAt = new Date('2026-04-14T10:00:00.000Z');

  beforeEach(() => {
    setCookies({});
    mockFindUnique.mockReset();
  });

  it('returns true when cookie ver matches current Associate.pinGeneratedAt', async () => {
    const token = signAssociateToken(42, pinGeneratedAt);
    setCookies({ associate_session: token });
    mockFindUnique.mockResolvedValueOnce({
      id: 42,
      slug: 'alice',
      pinGeneratedAt,
    });
    expect(await isAssociateAuthenticated()).toBe(true);
  });

  it('returns false when cookie ver is STALE (pinGeneratedAt advanced in DB) — revocation proof', async () => {
    const tokenOld = signAssociateToken(42, pinGeneratedAt);
    setCookies({ associate_session: tokenOld });
    const advanced = new Date('2026-04-15T10:00:00.000Z');
    mockFindUnique.mockResolvedValueOnce({
      id: 42,
      slug: 'alice',
      pinGeneratedAt: advanced,
    });
    expect(await isAssociateAuthenticated()).toBe(false);
  });

  it('returns false when associate not found', async () => {
    const token = signAssociateToken(42, pinGeneratedAt);
    setCookies({ associate_session: token });
    mockFindUnique.mockResolvedValueOnce(null);
    expect(await isAssociateAuthenticated()).toBe(false);
  });

  it('returns false when no cookie', async () => {
    expect(await isAssociateAuthenticated()).toBe(false);
  });

  it('returns false when cookie is tampered', async () => {
    const token = signAssociateToken(42, pinGeneratedAt);
    setCookies({ associate_session: token.slice(0, -4) + 'AAAA' });
    expect(await isAssociateAuthenticated()).toBe(false);
  });

  it('returns false when associate has null pinGeneratedAt', async () => {
    const token = signAssociateToken(42, pinGeneratedAt);
    setCookies({ associate_session: token });
    mockFindUnique.mockResolvedValueOnce({
      id: 42,
      slug: 'alice',
      pinGeneratedAt: null,
    });
    expect(await isAssociateAuthenticated()).toBe(false);
  });
});

describe('getAssociateIdentity', () => {
  const pinGeneratedAt = new Date('2026-04-14T10:00:00.000Z');

  beforeEach(() => {
    setCookies({});
    mockFindUnique.mockReset();
  });

  it('returns { associateId } on valid+fresh ver', async () => {
    const token = signAssociateToken(42, pinGeneratedAt);
    setCookies({ associate_session: token });
    mockFindUnique.mockResolvedValueOnce({ id: 42, slug: 'alice', pinGeneratedAt });
    expect(await getAssociateIdentity()).toEqual({ associateId: 42 });
  });

  it('returns null on stale ver', async () => {
    const token = signAssociateToken(42, pinGeneratedAt);
    setCookies({ associate_session: token });
    mockFindUnique.mockResolvedValueOnce({
      id: 42,
      slug: 'alice',
      pinGeneratedAt: new Date('2026-05-01T00:00:00.000Z'),
    });
    expect(await getAssociateIdentity()).toBeNull();
  });

  it('returns null when no cookie', async () => {
    expect(await getAssociateIdentity()).toBeNull();
  });
});

describe('getAssociateSession', () => {
  const pinGeneratedAt = new Date('2026-04-14T10:00:00.000Z');

  beforeEach(() => {
    setCookies({});
    mockFindUnique.mockReset();
  });

  it('returns { associateId, slug } on valid+fresh ver', async () => {
    const token = signAssociateToken(42, pinGeneratedAt);
    setCookies({ associate_session: token });
    mockFindUnique.mockResolvedValueOnce({ id: 42, slug: 'alice', pinGeneratedAt });
    expect(await getAssociateSession()).toEqual({ associateId: 42, slug: 'alice' });
  });

  it('returns null on stale ver', async () => {
    const token = signAssociateToken(42, pinGeneratedAt);
    setCookies({ associate_session: token });
    mockFindUnique.mockResolvedValueOnce({
      id: 42,
      slug: 'alice',
      pinGeneratedAt: new Date('2026-05-01T00:00:00.000Z'),
    });
    expect(await getAssociateSession()).toBeNull();
  });

  it('returns null when no cookie', async () => {
    expect(await getAssociateSession()).toBeNull();
  });
});
