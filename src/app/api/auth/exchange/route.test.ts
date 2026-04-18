import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

// Mock Supabase createServerClient — return controllable auth methods
const mockSetSession = vi.fn();
const mockExchangeCode = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      setSession: mockSetSession,
      exchangeCodeForSession: mockExchangeCode,
      getUser: mockGetUser,
    },
  })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    auth: { admin: { updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }) } },
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    associate: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/profileService', () => ({
  lazyBackfillProfile: vi.fn().mockResolvedValue(undefined),
}));

import { GET } from './route';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabase/admin';

const mockFindUnique = prisma.associate.findUnique as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.associate.update as ReturnType<typeof vi.fn>;
const mockUpdateUser = supabaseAdmin.auth.admin.updateUserById as ReturnType<typeof vi.fn>;
const mockProfileFindUnique = prisma.profile.findUnique as ReturnType<typeof vi.fn>;

function makeRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/auth/exchange');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

function getRedirectPath(res: Response): string {
  const location = res.headers.get('location') ?? '';
  try {
    return new URL(location).pathname + new URL(location).search;
  } catch {
    return location;
  }
}

describe('GET /api/auth/exchange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetSession.mockResolvedValue({ error: null });
    mockExchangeCode.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'assoc@test.com', user_metadata: { role: 'associate', password_set: true } } },
    });
    mockFindUnique.mockResolvedValue(null);
    mockProfileFindUnique.mockResolvedValue({ passwordSetAt: new Date() });
  });

  it('redirects to /signin?error=missing-code with no tokens or code', async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(307);
    expect(getRedirectPath(res)).toBe('/signin?error=missing-code');
  });

  it('sets session from implicit flow tokens', async () => {
    mockFindUnique.mockResolvedValue({ slug: 'alice' });
    const res = await GET(makeRequest({ access_token: 'at', refresh_token: 'rt' }));
    expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'at', refresh_token: 'rt' });
    expect(res.status).toBe(307);
    expect(getRedirectPath(res)).toBe('/associate/alice/dashboard');
  });

  it('exchanges PKCE code', async () => {
    mockFindUnique.mockResolvedValue({ slug: 'bob' });
    const res = await GET(makeRequest({ code: 'pkce-code' }));
    expect(mockExchangeCode).toHaveBeenCalledWith('pkce-code');
    expect(res.status).toBe(307);
    expect(getRedirectPath(res)).toBe('/associate/bob/dashboard');
  });

  it('redirects to /signin on setSession error', async () => {
    mockSetSession.mockResolvedValue({ error: new Error('bad token') });
    const res = await GET(makeRequest({ access_token: 'bad', refresh_token: 'bad' }));
    expect(getRedirectPath(res)).toBe('/signin?error=invalid-link');
  });

  it('redirects to /auth/update-password for recovery type', async () => {
    const res = await GET(makeRequest({ access_token: 'at', refresh_token: 'rt', type: 'recovery' }));
    expect(getRedirectPath(res)).toBe('/auth/update-password');
  });

  it('redirects trainer to /trainer', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 't@test.com', user_metadata: { role: 'trainer' } } },
    });
    const res = await GET(makeRequest({ access_token: 'at', refresh_token: 'rt' }));
    expect(getRedirectPath(res)).toBe('/trainer');
  });

  it('redirects trainer to /auth/set-password when passwordSet is false', async () => {
    // Trainer with no password_set metadata and no Profile.passwordSetAt — must hit the gate
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 't@test.com', user_metadata: { role: 'trainer' } } },
    });
    mockProfileFindUnique.mockResolvedValue(null);
    const res = await GET(makeRequest({ access_token: 'at', refresh_token: 'rt' }));
    expect(getRedirectPath(res)).toBe('/auth/set-password');
  });

  it('redirects trainer to /trainer when Profile.passwordSetAt is set (Profile-first detection)', async () => {
    // Trainer with Profile set but metadata flag missing — Profile-first wins, proceeds to /trainer
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 't@test.com', user_metadata: { role: 'trainer' } } },
    });
    mockProfileFindUnique.mockResolvedValue({ passwordSetAt: new Date() });
    const res = await GET(makeRequest({ access_token: 'at', refresh_token: 'rt' }));
    expect(getRedirectPath(res)).toBe('/trainer');
  });

  it('redirects admin to /trainer', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@test.com', user_metadata: { role: 'admin' } } },
    });
    const res = await GET(makeRequest({ access_token: 'at', refresh_token: 'rt' }));
    expect(getRedirectPath(res)).toBe('/trainer');
  });

  it('auto-assigns associate role when no role set', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'new@test.com', user_metadata: { password_set: true } } },
    });
    mockFindUnique.mockResolvedValue({ slug: 'new-user' });
    await GET(makeRequest({ access_token: 'at', refresh_token: 'rt' }));
    expect(mockUpdateUser).toHaveBeenCalledWith('u1', {
      user_metadata: { password_set: true, role: 'associate' },
      app_metadata: { role: 'associate' },
    });
  });

  it('links authUserId on first sign-in by email match', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u2', email: 'assoc@test.com', user_metadata: { role: 'associate', password_set: true } } },
    });
    // First findUnique (by authUserId) returns null
    // Second findUnique (by email) returns match with null authUserId
    mockFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 3, slug: 'carol', authUserId: null });
    mockUpdate.mockResolvedValue({ slug: 'carol' });

    const res = await GET(makeRequest({ access_token: 'at', refresh_token: 'rt' }));
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { authUserId: 'u2' },
      select: { slug: true },
    });
    expect(getRedirectPath(res)).toBe('/associate/carol/dashboard');
  });

  it('handles P2002 race on authUserId linkage', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u3', email: 'race@test.com', user_metadata: { role: 'associate', password_set: true } } },
    });
    mockFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 5, slug: 'dave', authUserId: null })
      .mockResolvedValueOnce({ slug: 'dave' }); // re-read after race
    mockUpdate.mockRejectedValue({ code: 'P2002' });

    const res = await GET(makeRequest({ access_token: 'at', refresh_token: 'rt' }));
    expect(getRedirectPath(res)).toBe('/associate/dave/dashboard');
  });

  it('redirects to not-onboarded when no associate matches', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await GET(makeRequest({ access_token: 'at', refresh_token: 'rt' }));
    expect(getRedirectPath(res)).toBe('/signin?error=not-onboarded');
  });

  it('redirects to invalid-link when getUser returns null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeRequest({ access_token: 'at', refresh_token: 'rt' }));
    expect(getRedirectPath(res)).toBe('/signin?error=invalid-link');
  });
});
