import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    profile: {
      findUnique: vi.fn(),
    },
  },
}));

const mockLazyBackfill = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/profileService', () => ({
  lazyBackfillProfile: (...args: unknown[]) => mockLazyBackfill(...args),
}));

import { GET } from './route';
import { prisma } from '@/lib/prisma';

const mockProfileFindUnique = prisma.profile.findUnique as ReturnType<typeof vi.fn>;

describe('GET /api/auth/password-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLazyBackfill.mockResolvedValue(undefined);
  });

  it('returns 401 when user is unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 401 when getUser errors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('network') });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns { passwordSet: true } when Profile.passwordSetAt is set', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });
    mockProfileFindUnique.mockResolvedValue({ passwordSetAt: new Date() });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ passwordSet: true });
  });

  it('returns { passwordSet: true } via metadata fallback when Profile is null', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: { password_set: true } } },
      error: null,
    });
    mockProfileFindUnique.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ passwordSet: true });
  });

  it('returns { passwordSet: false } when Profile passwordSetAt is null AND metadata is falsy', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });
    mockProfileFindUnique.mockResolvedValue({ passwordSetAt: null });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ passwordSet: false });
  });

  it('returns { passwordSet: false } when Profile row is missing AND metadata.password_set is false', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: { password_set: false } } },
      error: null,
    });
    mockProfileFindUnique.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ passwordSet: false });
  });

  it('calls lazyBackfillProfile with user id and metadata', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: { password_set: true } } },
      error: null,
    });
    mockProfileFindUnique.mockResolvedValue({ passwordSetAt: new Date() });
    await GET();
    expect(mockLazyBackfill).toHaveBeenCalledWith('u1', { password_set: true });
  });

  it('returns 500 when profile lookup throws', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', user_metadata: {} } },
      error: null,
    });
    mockProfileFindUnique.mockRejectedValue(new Error('db down'));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
