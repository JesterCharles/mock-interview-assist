/**
 * Unit tests for /api/cohorts/[id] route (GET + PATCH + DELETE).
 *
 * Prisma and auth are mocked — no DB connection or cookie required.
 *
 * Covers:
 * - Auth guard (401) across all methods
 * - GET: valid id returns CohortDTO with associateCount; missing -> 404; invalid id -> 400
 * - PATCH: partial update returns 200; endDate<startDate -> 400; empty name -> 400
 * - DELETE: runs $transaction that nulls associate.cohortId then deletes cohort (D-06)
 * - DELETE: returns 204 on success; 404 if cohort missing (P2025)
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    cohort: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    associate: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { prisma: mockPrisma };
});

vi.mock('@/lib/identity', () => ({
  getCallerIdentity: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { getCallerIdentity } from '@/lib/identity';
import { GET, PATCH, DELETE } from '@/app/api/cohorts/[id]/route';

const mockFindUnique = prisma.cohort.findUnique as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.cohort.update as ReturnType<typeof vi.fn>;
const mockTransaction = prisma.$transaction as ReturnType<typeof vi.fn>;
const mockAuth = getCallerIdentity as ReturnType<typeof vi.fn>;

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(method: string, body?: unknown) {
  return new Request('http://localhost/api/cohorts/1', {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

describe('/api/cohorts/[id] auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ kind: 'anonymous' });
  });

  it('GET returns 401 when unauthenticated', async () => {
    const res = await GET(makeRequest('GET'), makeCtx('1'));
    expect(res.status).toBe(401);
  });

  it('PATCH returns 401 when unauthenticated', async () => {
    const res = await PATCH(makeRequest('PATCH', { name: 'x' }), makeCtx('1'));
    expect(res.status).toBe(401);
  });

  it('DELETE returns 401 when unauthenticated', async () => {
    const res = await DELETE(makeRequest('DELETE'), makeCtx('1'));
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

describe('GET /api/cohorts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' });
  });

  it('returns CohortDTO with associateCount when found', async () => {
    mockFindUnique.mockResolvedValue({
      id: 5,
      name: 'Spring',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2026-04-01T00:00:00.000Z'),
      description: 'desc',
      _count: { associates: 2 },
    });

    const res = await GET(makeRequest('GET'), makeCtx('5'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      id: 5,
      name: 'Spring',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-04-01T00:00:00.000Z',
      description: 'desc',
      associateCount: 2,
    });
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 } })
    );
  });

  it('returns 404 when not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await GET(makeRequest('GET'), makeCtx('9999'));
    expect(res.status).toBe(404);
  });

  it('returns 400 for non-numeric id', async () => {
    const res = await GET(makeRequest('GET'), makeCtx('abc'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for id <= 0', async () => {
    const res = await GET(makeRequest('GET'), makeCtx('0'));
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

describe('PATCH /api/cohorts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' });
  });

  it('partial update with name only returns 200 and updated CohortDTO', async () => {
    mockUpdate.mockResolvedValue({
      id: 3,
      name: 'Renamed',
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: null,
      description: null,
      _count: { associates: 0 },
    });

    const res = await PATCH(
      makeRequest('PATCH', { name: 'Renamed' }),
      makeCtx('3')
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Renamed');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 3 },
        data: expect.objectContaining({ name: 'Renamed' }),
      })
    );
  });

  it('returns 400 when endDate < startDate', async () => {
    const res = await PATCH(
      makeRequest('PATCH', {
        startDate: '2026-05-01',
        endDate: '2026-02-01',
      }),
      makeCtx('3')
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when endDate alone is earlier than stored startDate (MD-01)', async () => {
    mockFindUnique.mockResolvedValue({
      id: 3,
      startDate: new Date('2026-05-01T00:00:00.000Z'),
    });

    const res = await PATCH(
      makeRequest('PATCH', { endDate: '2026-02-01' }),
      makeCtx('3')
    );
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.error).toBe('Invalid input');
  });

  it('returns 404 when endDate-only patch targets missing cohort (MD-01)', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await PATCH(
      makeRequest('PATCH', { endDate: '2026-02-01' }),
      makeCtx('999')
    );
    expect(res.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 for empty body (LO-07)', async () => {
    const res = await PATCH(makeRequest('PATCH', {}), makeCtx('3'));
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 for empty name', async () => {
    const res = await PATCH(
      makeRequest('PATCH', { name: '' }),
      makeCtx('3')
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when cohort does not exist (P2025)', async () => {
    const p2025 = Object.assign(new Error('Record to update not found'), {
      code: 'P2025',
    });
    mockUpdate.mockRejectedValue(p2025);

    const res = await PATCH(
      makeRequest('PATCH', { name: 'x' }),
      makeCtx('999')
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 for non-numeric id', async () => {
    const res = await PATCH(
      makeRequest('PATCH', { name: 'x' }),
      makeCtx('abc')
    );
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

describe('DELETE /api/cohorts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' });
  });

  it('runs $transaction that updates associates then deletes cohort, returns 204', async () => {
    const txCalls: string[] = [];
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        associate: {
          updateMany: vi.fn(async (args: { where: { cohortId: number }; data: { cohortId: null } }) => {
            txCalls.push(`updateMany:${args.where.cohortId}->${args.data.cohortId}`);
            return { count: 3 };
          }),
        },
        cohort: {
          delete: vi.fn(async (args: { where: { id: number } }) => {
            txCalls.push(`delete:${args.where.id}`);
            return { id: args.where.id };
          }),
        },
      };
      return fn(tx);
    });

    const res = await DELETE(makeRequest('DELETE'), makeCtx('42'));
    expect(res.status).toBe(204);
    expect(mockTransaction).toHaveBeenCalledOnce();
    // Order matters — nullify first, then delete.
    expect(txCalls).toEqual(['updateMany:42->null', 'delete:42']);
  });

  it('returns 404 when cohort missing (P2025 bubbled from transaction)', async () => {
    const p2025 = Object.assign(new Error('Record to delete not found'), {
      code: 'P2025',
    });
    mockTransaction.mockRejectedValue(p2025);

    const res = await DELETE(makeRequest('DELETE'), makeCtx('999'));
    expect(res.status).toBe(404);
  });

  it('returns 400 for non-numeric id without calling transaction', async () => {
    const res = await DELETE(makeRequest('DELETE'), makeCtx('abc'));
    expect(res.status).toBe(400);
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
