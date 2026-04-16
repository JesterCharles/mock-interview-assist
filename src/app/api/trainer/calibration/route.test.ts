/**
 * Unit tests for GET /api/trainer/calibration
 *
 * Auth guard: 401 for non-trainer/admin callers
 * CalibrationData shape: overrideRate + deltaBuckets
 * Delta clamping: deltas outside [-3, +3] are clamped
 * Null assessments: sessions with null assessments are skipped
 * Override count: counts questions where finalScore !== llmScore
 * Cohort scoping: ?cohort=<id> narrows query
 *
 * Prisma + auth are mocked — no DB connection required.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

// --- Mock @/lib/prisma ---
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    session: {
      findMany: vi.fn(),
    },
  }
  return { prisma: mockPrisma }
})

// --- Mock @/lib/identity ---
vi.mock('@/lib/identity', () => ({
  getCallerIdentity: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getCallerIdentity } from '@/lib/identity'
import { GET } from '@/app/api/trainer/calibration/route'

const mockFindMany = (prisma.session.findMany as ReturnType<typeof vi.fn>)
const mockGetCallerIdentity = getCallerIdentity as ReturnType<typeof vi.fn>

function makeRequest(url = 'http://localhost/api/trainer/calibration'): Request {
  return new Request(url)
}

const TRAINER_IDENTITY = { kind: 'trainer', userId: 'u1', email: 'trainer@example.com' }
const ADMIN_IDENTITY = { kind: 'admin', userId: 'u2', email: 'admin@example.com' }
const ANON_IDENTITY = { kind: 'anonymous' }
const ASSOCIATE_IDENTITY = {
  kind: 'associate',
  userId: 'u3',
  email: 'assoc@example.com',
  associateId: 1,
  associateSlug: 'jane-doe',
}

// Helper: build a mock session with assessments JSON
function makeSession(assessments: Record<string, { llmScore?: number; finalScore?: number }> | null) {
  return { assessments }
}

describe('GET /api/trainer/calibration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for anonymous callers', async () => {
    mockGetCallerIdentity.mockResolvedValue(ANON_IDENTITY)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 for associate callers', async () => {
    mockGetCallerIdentity.mockResolvedValue(ASSOCIATE_IDENTITY)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 200 with CalibrationData shape for trainer', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockFindMany.mockResolvedValue([
      makeSession({ q1: { llmScore: 7, finalScore: 8 } }),
    ])
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      overrideRate: expect.any(Number),
      overrideCount: expect.any(Number),
      totalScoredQuestions: expect.any(Number),
      deltaBuckets: expect.any(Object),
    })
  })

  it('returns 200 for admin callers', async () => {
    mockGetCallerIdentity.mockResolvedValue(ADMIN_IDENTITY)
    mockFindMany.mockResolvedValue([])
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
  })

  it('correctly counts override questions (finalScore !== llmScore)', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockFindMany.mockResolvedValue([
      makeSession({
        q1: { llmScore: 7, finalScore: 8 },  // override (+1)
        q2: { llmScore: 5, finalScore: 5 },  // no override (0)
        q3: { llmScore: 9, finalScore: 7 },  // override (-2)
      }),
    ])
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.overrideCount).toBe(2)
    expect(body.totalScoredQuestions).toBe(3)
    expect(body.overrideRate).toBeCloseTo(66.67, 1)
  })

  it('skips questions with missing llmScore or finalScore', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockFindMany.mockResolvedValue([
      makeSession({
        q1: { llmScore: 7 },                        // missing finalScore — skip
        q2: { finalScore: 5 },                      // missing llmScore — skip
        q3: { llmScore: undefined, finalScore: undefined },  // both absent — skip
        q4: { llmScore: 8, finalScore: 9 },         // valid override
      }),
    ])
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.totalScoredQuestions).toBe(1)
    expect(body.overrideCount).toBe(1)
  })

  it('returns null overrideRate when no scored questions', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockFindMany.mockResolvedValue([])
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.overrideRate).toBeNull()
    expect(body.overrideCount).toBe(0)
    expect(body.totalScoredQuestions).toBe(0)
  })

  it('initializes all 7 delta buckets (-3 through +3)', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockFindMany.mockResolvedValue([])
    const res = await GET(makeRequest())
    const body = await res.json()
    // All 7 bucket keys must be present with zero counts
    expect(body.deltaBuckets).toMatchObject({
      '-3': 0, '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0, '3': 0,
    })
    expect(Object.keys(body.deltaBuckets)).toHaveLength(7)
  })

  it('populates deltaBuckets correctly for multiple sessions', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockFindMany.mockResolvedValue([
      makeSession({
        q1: { llmScore: 7, finalScore: 8 },  // delta +1
        q2: { llmScore: 9, finalScore: 7 },  // delta -2
      }),
      makeSession({
        q3: { llmScore: 5, finalScore: 5 },  // delta 0
        q4: { llmScore: 3, finalScore: 6 },  // delta +3
      }),
    ])
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.deltaBuckets['1']).toBe(1)
    expect(body.deltaBuckets['-2']).toBe(1)
    expect(body.deltaBuckets['0']).toBe(1)
    expect(body.deltaBuckets['3']).toBe(1)
  })

  it('clamps deltas outside [-3, +3] to boundary buckets', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockFindMany.mockResolvedValue([
      makeSession({
        q1: { llmScore: 1, finalScore: 8 },  // raw delta +7 → clamped to +3
        q2: { llmScore: 9, finalScore: 2 },  // raw delta -7 → clamped to -3
      }),
    ])
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.deltaBuckets['3']).toBe(1)
    expect(body.deltaBuckets['-3']).toBe(1)
  })

  it('gracefully skips sessions with null assessments', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockFindMany.mockResolvedValue([
      makeSession(null),
      makeSession({ q1: { llmScore: 6, finalScore: 8 } }),
    ])
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.totalScoredQuestions).toBe(1)
    expect(body.overrideCount).toBe(1)
  })

  it('passes cohort param to prisma query when ?cohort=<id> provided', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockFindMany.mockResolvedValue([])
    const req = makeRequest('http://localhost/api/trainer/calibration?cohort=5')
    await GET(req)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          associate: { cohortId: 5 },
        }),
      }),
    )
  })

  it('rejects non-numeric cohort param (treats as unfiltered)', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockFindMany.mockResolvedValue([])
    const req = makeRequest('http://localhost/api/trainer/calibration?cohort=abc')
    await GET(req)
    // Should still succeed, just unfiltered
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ associate: expect.anything() }),
      }),
    )
  })
})
