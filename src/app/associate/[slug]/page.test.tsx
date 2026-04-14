import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Guard matrix for /associate/[slug]:
 *  1. Anonymous → redirect /associate/login?next=/associate/{slug}
 *  2. Associate matching slug + fresh ver → renders profile (no redirect/403)
 *  3. Associate mismatched slug → 403 Response
 *  4. Associate stale ver (getAssociateIdentity returns null) → redirect to login
 *  5. Trainer → renders profile (any slug)
 */

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirectMock: vi.fn((_url: string) => {
    throw new Error('NEXT_REDIRECT');
  }),
  isAuthenticatedSessionMock: vi.fn(),
  getAssociateIdentityMock: vi.fn(),
  getAssociateIdBySlugMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirectMock,
  notFound: mocks.notFoundMock,
}));

vi.mock('@/lib/auth-server', () => ({
  isAuthenticatedSession: mocks.isAuthenticatedSessionMock,
  getAssociateIdentity: mocks.getAssociateIdentityMock,
}));

vi.mock('@/lib/associateService', () => ({
  getAssociateIdBySlug: mocks.getAssociateIdBySlugMock,
}));

vi.mock('@/lib/slug-validation', () => ({
  validateSlug: (s: string) => ({ success: true, slug: s }),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    associate: {
      findUnique: vi.fn(async () => ({
        id: 42,
        slug: 'alice',
        displayName: 'Alice',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        sessions: [],
      })),
    },
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => ({
    type: 'a',
    props: { href, children },
  }),
}));

import AssociateProfilePage from './page';

function makeParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe('/associate/[slug] guard matrix', () => {
  beforeEach(() => {
    mocks.redirectMock.mockClear();
    mocks.notFoundMock.mockClear();
    mocks.isAuthenticatedSessionMock.mockReset();
    mocks.getAssociateIdentityMock.mockReset();
    mocks.getAssociateIdBySlugMock.mockReset();
  });

  it('anonymous → redirects to /associate/login?next=/associate/alice', async () => {
    mocks.isAuthenticatedSessionMock.mockResolvedValue(false);
    mocks.getAssociateIdentityMock.mockResolvedValue(null);

    await expect(AssociateProfilePage(makeParams('alice'))).rejects.toThrow(
      'NEXT_REDIRECT'
    );

    expect(mocks.redirectMock).toHaveBeenCalledWith(
      '/associate/login?next=' + encodeURIComponent('/associate/alice')
    );
  });

  it('associate with matching id + fresh ver → renders (no redirect, no 403)', async () => {
    mocks.isAuthenticatedSessionMock.mockResolvedValue(false);
    mocks.getAssociateIdentityMock.mockResolvedValue({ associateId: 42 });
    mocks.getAssociateIdBySlugMock.mockResolvedValue(42);

    const result = await AssociateProfilePage(makeParams('alice'));
    expect(result).toBeTruthy();
    expect(mocks.redirectMock).not.toHaveBeenCalled();
  });

  it('associate with mismatched slug → 403 Response', async () => {
    mocks.isAuthenticatedSessionMock.mockResolvedValue(false);
    mocks.getAssociateIdentityMock.mockResolvedValue({ associateId: 99 });
    mocks.getAssociateIdBySlugMock.mockResolvedValue(42);

    const result = await AssociateProfilePage(makeParams('alice'));
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
    expect(mocks.redirectMock).not.toHaveBeenCalled();
  });

  it('associate with stale ver (getAssociateIdentity → null) → redirect to login', async () => {
    mocks.isAuthenticatedSessionMock.mockResolvedValue(false);
    mocks.getAssociateIdentityMock.mockResolvedValue(null);

    await expect(AssociateProfilePage(makeParams('alice'))).rejects.toThrow(
      'NEXT_REDIRECT'
    );

    expect(mocks.redirectMock).toHaveBeenCalledWith(
      '/associate/login?next=' + encodeURIComponent('/associate/alice')
    );
  });

  it('trainer → renders (regardless of slug)', async () => {
    mocks.isAuthenticatedSessionMock.mockResolvedValue(true);
    mocks.getAssociateIdentityMock.mockResolvedValue(null);
    mocks.getAssociateIdBySlugMock.mockResolvedValue(42);

    const result = await AssociateProfilePage(makeParams('any-slug'));
    expect(result).toBeTruthy();
    expect(mocks.redirectMock).not.toHaveBeenCalled();
  });

  it('slug not found → notFound()', async () => {
    mocks.isAuthenticatedSessionMock.mockResolvedValue(true);
    mocks.getAssociateIdBySlugMock.mockResolvedValue(null);

    await expect(AssociateProfilePage(makeParams('ghost'))).rejects.toThrow(
      'NEXT_NOT_FOUND'
    );
  });
});
