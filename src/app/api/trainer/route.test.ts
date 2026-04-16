/**
 * Unit tests for GET /api/trainer.
 *
 * Backward-compatibility contract (Codex finding #1):
 * - Default (no query params) → raw RosterAssociate[] array (v1.0 shape).
 * - ?cohortId=X (without includeSummary) → raw array filtered by cohort.
 * - ?cohortId=X&includeSummary=true → wrapped { associates, summary }.
 *
 * Prisma + auth are mocked — no DB connection or cookie required.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// --- Mock @/lib/prisma ---
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    associate: {
      findMany: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

// --- Mock @/lib/identity ---
vi.mock('@/lib/identity', () => ({
  getCallerIdentity: vi.fn(),
}));

// Imports AFTER vi.mock declarations
import { prisma } from '@/lib/prisma';
import { getCallerIdentity } from '@/lib/identity';
import { GET } from '@/app/api/trainer/route';

const mockFindMany = prisma.associate.findMany as ReturnType<typeof vi.fn>;
const mockIsAuthenticated = getCallerIdentity as ReturnType<typeof vi.fn>;

function makeRequest(url = 'http://localhost/api/trainer'): Request {
  return new Request(url);
}

function makeAssociate(overrides: Partial<{
  slug: string;
  displayName: string | null;
  readinessStatus: string;
  recommendedArea: string | null;
  sessionCount: number;
  lastSessionDate: Date | null;
}> = {}) {
  const {
    slug = 'jane-doe',
    displayName = 'Jane Doe',
    readinessStatus = 'ready',
    recommendedArea = null,
    sessionCount = 3,
    lastSessionDate = new Date('2026-04-10T00:00:00Z'),
  } = overrides;
  return {
    slug,
    displayName,
    readinessStatus,
    recommendedArea,
    _count: { sessions: sessionCount },
    sessions: lastSessionDate ? [{ date: lastSessionDate }] : [],
  };
}

describe('GET /api/trainer — auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockIsAuthenticated.mockResolvedValue({ kind: 'anonymous' });
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});

describe('GET /api/trainer — default (backward compat)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' });
  });

  it('returns a raw JSON array (NOT wrapped) for v1.0 consumers', async () => {
    mockFindMany.mockResolvedValue([makeAssociate()]);
    const res = await GET(makeRequest('http://localhost/api/trainer'));
    expect(res.status).toBe(200);
    const body = await res.json();
    // Regression guard — /trainer page.tsx and /dashboard page.tsx expect an array
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      slug: 'jane-doe',
      displayName: 'Jane Doe',
      readinessStatus: 'ready',
      sessionCount: 3,
    });
  });

  it('calls findMany with where: undefined when no cohortId param', async () => {
    mockFindMany.mockResolvedValue([]);
    await GET(makeRequest('http://localhost/api/trainer'));
    expect(mockFindMany).toHaveBeenCalledOnce();
    const args = mockFindMany.mock.calls[0][0];
    expect(args.where).toBeUndefined();
  });

  it("treats cohortId='all' as no filter (raw array)", async () => {
    mockFindMany.mockResolvedValue([makeAssociate()]);
    const res = await GET(makeRequest('http://localhost/api/trainer?cohortId=all'));
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    const args = mockFindMany.mock.calls[0][0];
    expect(args.where).toBeUndefined();
  });

  it('returns raw array when includeSummary=true but no cohortId (scope required)', async () => {
    mockFindMany.mockResolvedValue([makeAssociate()]);
    const res = await GET(makeRequest('http://localhost/api/trainer?includeSummary=true'));
    const body = await res.json();
    // Summary only makes sense when scoped to a cohort — default to raw array.
    expect(Array.isArray(body)).toBe(true);
  });
});

describe('GET /api/trainer — cohortId filter (raw array)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' });
  });

  it('passes where: { cohortId } to Prisma and returns raw array', async () => {
    mockFindMany.mockResolvedValue([makeAssociate({ slug: 'alice' })]);
    const res = await GET(makeRequest('http://localhost/api/trainer?cohortId=42'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    const args = mockFindMany.mock.calls[0][0];
    expect(args.where).toEqual({ cohortId: 42 });
  });
});

describe('GET /api/trainer — cohortId + includeSummary (wrapped)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' });
  });

  it('returns { associates, summary } with correct counts', async () => {
    mockFindMany.mockResolvedValue([
      makeAssociate({ slug: 'a', readinessStatus: 'ready' }),
      makeAssociate({ slug: 'b', readinessStatus: 'ready' }),
      makeAssociate({ slug: 'c', readinessStatus: 'improving' }),
      makeAssociate({ slug: 'd', readinessStatus: 'not_ready' }),
      makeAssociate({ slug: 'e', readinessStatus: 'not_ready' }),
      makeAssociate({ slug: 'f', readinessStatus: 'not_ready' }),
    ]);
    const res = await GET(
      makeRequest('http://localhost/api/trainer?cohortId=42&includeSummary=true'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(false);
    expect(body).toHaveProperty('associates');
    expect(body).toHaveProperty('summary');
    expect(body.associates).toHaveLength(6);
    expect(body.summary).toEqual({ ready: 2, improving: 1, notReady: 3 });
    const args = mockFindMany.mock.calls[0][0];
    expect(args.where).toEqual({ cohortId: 42 });
  });

  it('returns zero counts when cohort is empty', async () => {
    mockFindMany.mockResolvedValue([]);
    const res = await GET(
      makeRequest('http://localhost/api/trainer?cohortId=99&includeSummary=true'),
    );
    const body = await res.json();
    expect(body.associates).toEqual([]);
    expect(body.summary).toEqual({ ready: 0, improving: 0, notReady: 0 });
  });
});
