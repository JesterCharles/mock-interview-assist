/**
 * Unit tests for /api/cohorts route (GET list + POST create).
 *
 * Prisma and auth are mocked — no DB connection or cookie required.
 *
 * Covers:
 * - Auth guard (401) on both methods
 * - GET returns CohortDTO[] ordered by startDate desc, with associateCount
 * - POST valid body returns 201 + CohortDTO
 * - POST invalid payloads return 400 + zod issues
 * - POST endDate < startDate returns 400
 * - POST description > 500 chars returns 400
 * - POST P2002 (unique constraint) returns 409
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    cohort: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

vi.mock('@/lib/auth-server', () => ({
  isAuthenticatedSession: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { isAuthenticatedSession } from '@/lib/auth-server';
import { GET, POST } from '@/app/api/cohorts/route';

const mockFindMany = prisma.cohort.findMany as ReturnType<typeof vi.fn>;
const mockCreate = prisma.cohort.create as ReturnType<typeof vi.fn>;
const mockAuth = isAuthenticatedSession as ReturnType<typeof vi.fn>;

function makePost(body: unknown): Request {
  return new Request('http://localhost/api/cohorts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/cohorts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns CohortDTO[] with associateCount ordered by startDate desc', async () => {
    mockAuth.mockResolvedValue(true);
    const rows = [
      {
        id: 2,
        name: 'Summer 2026',
        startDate: new Date('2026-06-01T00:00:00.000Z'),
        endDate: new Date('2026-09-01T00:00:00.000Z'),
        description: 'Summer cohort',
        _count: { associates: 3 },
      },
      {
        id: 1,
        name: 'Spring 2026',
        startDate: new Date('2026-03-01T00:00:00.000Z'),
        endDate: null,
        description: null,
        _count: { associates: 5 },
      },
    ];
    mockFindMany.mockResolvedValue(rows);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { _count: { select: { associates: true } } },
        orderBy: { startDate: 'desc' },
      })
    );

    const body = await res.json();
    expect(body).toEqual([
      {
        id: 2,
        name: 'Summer 2026',
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-09-01T00:00:00.000Z',
        description: 'Summer cohort',
        associateCount: 3,
      },
      {
        id: 1,
        name: 'Spring 2026',
        startDate: '2026-03-01T00:00:00.000Z',
        endDate: null,
        description: null,
        associateCount: 5,
      },
    ]);
  });
});

describe('POST /api/cohorts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(false);
    const res = await POST(makePost({ name: 'X', startDate: '2026-01-01', endDate: '2026-02-01' }));
    expect(res.status).toBe(401);
  });

  it('returns 201 and CohortDTO on valid create', async () => {
    mockAuth.mockResolvedValue(true);
    mockCreate.mockResolvedValue({
      id: 7,
      name: 'Fall 2026',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-12-15T00:00:00.000Z'),
      description: 'Fall',
      _count: { associates: 0 },
    });

    const res = await POST(
      makePost({
        name: 'Fall 2026',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-12-15T00:00:00.000Z',
        description: 'Fall',
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({
      id: 7,
      name: 'Fall 2026',
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: '2026-12-15T00:00:00.000Z',
      description: 'Fall',
      associateCount: 0,
    });
  });

  it('returns 400 with zod issues when name is empty', async () => {
    mockAuth.mockResolvedValue(true);
    const res = await POST(
      makePost({ name: '', startDate: '2026-01-01', endDate: '2026-02-01' })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid input');
    expect(Array.isArray(body.issues)).toBe(true);
    expect(body.issues.length).toBeGreaterThan(0);
  });

  it('returns 400 when endDate < startDate', async () => {
    mockAuth.mockResolvedValue(true);
    const res = await POST(
      makePost({
        name: 'Invalid',
        startDate: '2026-03-01',
        endDate: '2026-02-01',
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid input');
  });

  it('returns 400 when description > 500 chars', async () => {
    mockAuth.mockResolvedValue(true);
    const res = await POST(
      makePost({
        name: 'Valid',
        startDate: '2026-01-01',
        endDate: '2026-02-01',
        description: 'x'.repeat(501),
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 409 on Prisma P2002 unique constraint violation', async () => {
    mockAuth.mockResolvedValue(true);
    const p2002 = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
    });
    mockCreate.mockRejectedValue(p2002);

    const res = await POST(
      makePost({
        name: 'Dup',
        startDate: '2026-01-01',
        endDate: '2026-02-01',
      })
    );
    expect(res.status).toBe(409);
  });

  it('accepts null/omitted endDate', async () => {
    mockAuth.mockResolvedValue(true);
    mockCreate.mockResolvedValue({
      id: 8,
      name: 'Open',
      startDate: new Date('2026-05-01T00:00:00.000Z'),
      endDate: null,
      description: null,
      _count: { associates: 0 },
    });

    const res = await POST(
      makePost({
        name: 'Open',
        startDate: '2026-05-01T00:00:00.000Z',
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.endDate).toBeNull();
  });
});
