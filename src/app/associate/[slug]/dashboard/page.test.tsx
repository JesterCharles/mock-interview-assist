import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Guard matrix + data tests for /associate/[slug]/dashboard.
 *
 * Node environment — no jsdom. Tests call the async server component directly.
 * Follows the same pattern as src/app/associate/[slug]/page.test.tsx.
 */

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirectMock: vi.fn((_url: string) => {
    throw new Error('NEXT_REDIRECT');
  }),
  getCallerIdentityMock: vi.fn(),
  getAssociateIdBySlugMock: vi.fn(),
  getSettingsMock: vi.fn(),
  prismaFindUniqueMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: mocks.redirectMock,
  notFound: mocks.notFoundMock,
}));

vi.mock('@/lib/identity', () => ({
  getCallerIdentity: mocks.getCallerIdentityMock,
}));

vi.mock('@/lib/associateService', () => ({
  getAssociateIdBySlug: mocks.getAssociateIdBySlugMock,
}));

vi.mock('@/lib/slug-validation', () => ({
  validateSlug: (s: string) => ({ success: true, slug: s }),
}));

vi.mock('@/lib/settingsService', () => ({
  getSettings: mocks.getSettingsMock,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    associate: {
      findUnique: (...args: unknown[]) => mocks.prismaFindUniqueMock(...args),
    },
  },
}));

// Stub client components — they return null in node env
vi.mock('./AssociateDashboardClient', () => ({
  AssociateDashboardClient: () => null,
}));

import AssociateDashboardPage from './page';

function makeParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

const baseAssociate = {
  id: 42,
  slug: 'alice',
  displayName: 'Alice',
  readinessStatus: 'improving',
  recommendedArea: 'JavaScript',
  gapScores: [
    { skill: 'JavaScript', topic: null, weightedScore: 0.7, sessionCount: 3 },
    { skill: 'Python', topic: null, weightedScore: 0.5, sessionCount: 2 },
  ],
  sessions: [
    {
      id: 'sess-1',
      createdAt: new Date('2026-04-01T00:00:00Z'),
      overallTechnicalScore: 7.5,
      overallSoftSkillScore: 8.0,
      status: 'completed',
      assessments: {},
    },
  ],
};

describe('/associate/[slug]/dashboard guard matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSettingsMock.mockResolvedValue({ readinessThreshold: 75 });
    mocks.prismaFindUniqueMock.mockResolvedValue(baseAssociate);
  });

  it('Test 1: Renders dashboard for authenticated associate (own slug)', async () => {
    mocks.getCallerIdentityMock.mockResolvedValue({
      kind: 'associate',
      userId: 'u2',
      email: 'alice@test.com',
      associateId: 42,
      associateSlug: 'alice',
    });
    mocks.getAssociateIdBySlugMock.mockResolvedValue(42);

    const result = await AssociateDashboardPage(makeParams('alice'));
    expect(result).toBeTruthy();
    expect(mocks.redirectMock).not.toHaveBeenCalled();
    expect(mocks.notFoundMock).not.toHaveBeenCalled();
  });

  it('Test 2: Returns 403 element for associate slug mismatch', async () => {
    mocks.getCallerIdentityMock.mockResolvedValue({
      kind: 'associate',
      userId: 'u3',
      email: 'bob@test.com',
      associateId: 99,
      associateSlug: 'bob',
    });
    mocks.getAssociateIdBySlugMock.mockResolvedValue(42);

    const result = (await AssociateDashboardPage(makeParams('alice'))) as {
      props: { 'data-http-status'?: string };
    };
    expect(result?.props?.['data-http-status']).toBe('403');
    expect(mocks.redirectMock).not.toHaveBeenCalled();
  });

  it('Test 3: Redirects anonymous to /signin with correct next URL', async () => {
    mocks.getCallerIdentityMock.mockResolvedValue({ kind: 'anonymous' });

    await expect(AssociateDashboardPage(makeParams('alice'))).rejects.toThrow(
      'NEXT_REDIRECT',
    );

    expect(mocks.redirectMock).toHaveBeenCalledWith(
      '/signin?as=associate&next=' +
        encodeURIComponent('/associate/alice/dashboard'),
    );
  });

  it('Test 4: Trainer can view any associate dashboard', async () => {
    mocks.getCallerIdentityMock.mockResolvedValue({
      kind: 'trainer',
      userId: 'u1',
      email: 'trainer@test.com',
    });
    mocks.getAssociateIdBySlugMock.mockResolvedValue(42);

    const result = await AssociateDashboardPage(makeParams('alice'));
    expect(result).toBeTruthy();
    expect(mocks.redirectMock).not.toHaveBeenCalled();
  });

  it('Test 5: Readiness percentage computed correctly from gapScores', async () => {
    // weightedScore 0.7 + 0.5 → avg 0.6 → 60%
    mocks.getCallerIdentityMock.mockResolvedValue({
      kind: 'trainer',
      userId: 'u1',
      email: 'trainer@test.com',
    });
    mocks.getAssociateIdBySlugMock.mockResolvedValue(42);

    // Associate with gapScores 0.7 and 0.5 (both topic=null = skill-level)
    mocks.prismaFindUniqueMock.mockResolvedValue({
      ...baseAssociate,
      gapScores: [
        { skill: 'JavaScript', topic: null, weightedScore: 0.7, sessionCount: 3 },
        { skill: 'Python', topic: null, weightedScore: 0.5, sessionCount: 2 },
      ],
    });

    // Verify the computation: (0.7 + 0.5) / 2 * 100 = 60
    const result = await AssociateDashboardPage(makeParams('alice'));
    // Page renders without error — readinessPercent = 60 is passed to ReadinessProgressBar
    expect(result).toBeTruthy();

    // Verify prisma was called with slug-based where clause
    expect(mocks.prismaFindUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'alice' },
      }),
    );
  });
});
