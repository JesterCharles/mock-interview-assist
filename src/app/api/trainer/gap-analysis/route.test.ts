/**
 * Unit tests for GET /api/trainer/gap-analysis
 *
 * Aggregation mode (no skill param):
 *   - Returns GapAnalysisRow[] sorted by associates_affected DESC
 *   - ?cohort=<id> scopes to that cohort
 *   - BigInt COUNT values serialized as numbers
 *
 * Drill-through mode (skill + topic params):
 *   - Returns GapDrillThroughRow[] for the given skill+topic
 *   - ?cohort=<id> scopes to that cohort
 *
 * Auth: 401 for non-trainer/admin callers
 *
 * Prisma + auth are mocked — no DB connection required.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

// --- Mock @/lib/prisma ---
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    $queryRaw: vi.fn(),
  }
  return { prisma: mockPrisma }
})

// --- Mock @/lib/identity ---
vi.mock('@/lib/identity', () => ({
  getCallerIdentity: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getCallerIdentity } from '@/lib/identity'
import { GET } from '@/app/api/trainer/gap-analysis/route'

const mockQueryRaw = prisma.$queryRaw as ReturnType<typeof vi.fn>
const mockGetCallerIdentity = getCallerIdentity as ReturnType<typeof vi.fn>

function makeRequest(url = 'http://localhost/api/trainer/gap-analysis'): Request {
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

const MOCK_AGGREGATION_ROWS = [
  {
    skill: 'React',
    topic: 'Hooks',
    associates_affected: BigInt(5),
    avg_gap_score: 42.0,
  },
  {
    skill: 'TypeScript',
    topic: 'Generics',
    associates_affected: BigInt(3),
    avg_gap_score: 55.0,
  },
]

const MOCK_DRILL_ROWS = [
  {
    slug: 'alice',
    display_name: 'Alice Smith',
    gap_score: 38.0,
    last_session: new Date('2026-04-10T10:00:00Z'),
  },
  {
    slug: 'bob',
    display_name: 'Bob Jones',
    gap_score: 50.0,
    last_session: null,
  },
]

describe('GET /api/trainer/gap-analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Auth guards
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

  // Aggregation mode
  it('returns GapAnalysisRow[] in aggregation mode (no skill param)', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockQueryRaw.mockResolvedValue(MOCK_AGGREGATION_ROWS)
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toMatchObject({
      skill: 'React',
      topic: 'Hooks',
      associatesAffected: 5,
      avgGapScore: 42.0,
    })
  })

  it('returns 200 for admin callers in aggregation mode', async () => {
    mockGetCallerIdentity.mockResolvedValue(ADMIN_IDENTITY)
    mockQueryRaw.mockResolvedValue(MOCK_AGGREGATION_ROWS)
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
  })

  it('serializes bigint COUNT (associates_affected) as numbers', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockQueryRaw.mockResolvedValue(MOCK_AGGREGATION_ROWS)
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(typeof body[0].associatesAffected).toBe('number')
    expect(body[0].associatesAffected).toBe(5)
  })

  it('passes cohort param to query when ?cohort=<id> provided (aggregation)', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockQueryRaw.mockResolvedValue(MOCK_AGGREGATION_ROWS)
    const req = makeRequest('http://localhost/api/trainer/gap-analysis?cohort=3')
    await GET(req)
    expect(mockQueryRaw).toHaveBeenCalledTimes(1)
  })

  it('ignores non-numeric cohort param', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockQueryRaw.mockResolvedValue(MOCK_AGGREGATION_ROWS)
    const req = makeRequest('http://localhost/api/trainer/gap-analysis?cohort=abc')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  // Drill-through mode
  it('returns GapDrillThroughRow[] when skill+topic params present', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockQueryRaw.mockResolvedValue(MOCK_DRILL_ROWS)
    const req = makeRequest(
      'http://localhost/api/trainer/gap-analysis?skill=React&topic=Hooks'
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]).toMatchObject({
      slug: 'alice',
      displayName: 'Alice Smith',
      gapScore: 38.0,
    })
  })

  it('returns null lastSessionDate when last_session is null in drill-through', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockQueryRaw.mockResolvedValue(MOCK_DRILL_ROWS)
    const req = makeRequest(
      'http://localhost/api/trainer/gap-analysis?skill=React&topic=Hooks'
    )
    const res = await GET(req)
    const body = await res.json()
    expect(body[1].lastSessionDate).toBeNull()
  })

  it('converts Date last_session to ISO string in drill-through', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockQueryRaw.mockResolvedValue(MOCK_DRILL_ROWS)
    const req = makeRequest(
      'http://localhost/api/trainer/gap-analysis?skill=React&topic=Hooks'
    )
    const res = await GET(req)
    const body = await res.json()
    expect(typeof body[0].lastSessionDate).toBe('string')
  })

  it('returns 400 when only skill param provided (missing topic)', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    const req = makeRequest(
      'http://localhost/api/trainer/gap-analysis?skill=React'
    )
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('scopes drill-through to cohort when ?cohort=<id> provided', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockQueryRaw.mockResolvedValue(MOCK_DRILL_ROWS)
    const req = makeRequest(
      'http://localhost/api/trainer/gap-analysis?skill=React&topic=Hooks&cohort=2'
    )
    await GET(req)
    expect(mockQueryRaw).toHaveBeenCalledTimes(1)
  })
})
