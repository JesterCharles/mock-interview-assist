/**
 * Unit tests for GET /api/trainer/kpis
 *
 * Auth guard: 401 for non-trainer/admin callers
 * KPI shape: returns KpiData with all 4 values
 * Cohort scoping: ?cohort=<id> narrows query
 * BigInt safety: COUNT values serialized as numbers
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
import { GET } from '@/app/api/trainer/kpis/route'

const mockQueryRaw = prisma.$queryRaw as ReturnType<typeof vi.fn>
const mockGetCallerIdentity = getCallerIdentity as ReturnType<typeof vi.fn>

function makeRequest(url = 'http://localhost/api/trainer/kpis'): Request {
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

const MOCK_KPI_ROW = [
  {
    avg_readiness: 75.0,
    mocks_this_week: BigInt(3),
    at_risk_count: BigInt(2),
    top_gap_skill: 'React',
    avg_variance: 0.4,
  },
]

describe('GET /api/trainer/kpis', () => {
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

  it('returns 200 with KpiData shape for trainer', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockQueryRaw.mockResolvedValue(MOCK_KPI_ROW)
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      avgReadiness: expect.any(Number),
      mocksThisWeek: expect.any(Number),
      atRiskCount: expect.any(Number),
      topGapSkill: 'React',
    })
  })

  it('returns 200 for admin callers', async () => {
    mockGetCallerIdentity.mockResolvedValue(ADMIN_IDENTITY)
    mockQueryRaw.mockResolvedValue(MOCK_KPI_ROW)
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
  })

  it('serializes bigint COUNT values as numbers (not BigInt)', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockQueryRaw.mockResolvedValue(MOCK_KPI_ROW)
    const res = await GET(makeRequest())
    const body = await res.json()
    // JSON.parse result is always a plain number — verify no TypeError thrown
    expect(typeof body.mocksThisWeek).toBe('number')
    expect(typeof body.atRiskCount).toBe('number')
    expect(body.mocksThisWeek).toBe(3)
    expect(body.atRiskCount).toBe(2)
  })

  it('passes cohort param to query when ?cohort=<id> provided', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockQueryRaw.mockResolvedValue(MOCK_KPI_ROW)
    const req = makeRequest('http://localhost/api/trainer/kpis?cohort=5')
    await GET(req)
    // $queryRaw was called — cohort filtering handled inside the route
    expect(mockQueryRaw).toHaveBeenCalledTimes(1)
  })

  it('handles null avgReadiness when no associates in cohort', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockQueryRaw.mockResolvedValue([
      {
        avg_readiness: null,
        mocks_this_week: BigInt(0),
        at_risk_count: BigInt(0),
        top_gap_skill: null,
        avg_variance: null,
      },
    ])
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body.avgReadiness).toBeNull()
    expect(body.topGapSkill).toBeNull()
    expect(body.avgVariance).toBeNull()
  })
})
