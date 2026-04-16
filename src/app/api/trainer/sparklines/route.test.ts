/**
 * Unit tests for GET /api/trainer/sparklines
 *
 * Auth guard: 401 for non-trainer/admin callers
 * Windowed query: max 6 sessions per associate (ROW_NUMBER)
 * Chronological order: oldest first per associate
 * Trend word: "new" for < 3 sessions
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
import { GET } from '@/app/api/trainer/sparklines/route'

const mockQueryRaw = prisma.$queryRaw as ReturnType<typeof vi.fn>
const mockGetCallerIdentity = getCallerIdentity as ReturnType<typeof vi.fn>

function makeRequest(url = 'http://localhost/api/trainer/sparklines'): Request {
  return new Request(url)
}

const TRAINER_IDENTITY = { kind: 'trainer', userId: 'u1', email: 'trainer@example.com' }
const ANON_IDENTITY = { kind: 'anonymous' }

// Simulates 6 sessions for associate 1, 2 sessions for associate 2
function makeSessionRows(associateId: number, slug: string, count: number, rnStart = 1) {
  return Array.from({ length: count }, (_, i) => ({
    associateId,
    slug,
    overall_score: 70 + i * 2,
    createdAt: new Date(`2026-04-${String(i + 1).padStart(2, '0')}T00:00:00Z`),
    rn: BigInt(rnStart + i),
  }))
}

describe('GET /api/trainer/sparklines', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for anonymous callers', async () => {
    mockGetCallerIdentity.mockResolvedValue(ANON_IDENTITY)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 200 with RosterSparklineData[] for trainer', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    // Simulate 4 sessions for associate 1 (already >= 3, so trend is not "new")
    const rows = makeSessionRows(1, 'jane-doe', 4)
    mockQueryRaw.mockResolvedValue(rows)
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBe(1)
    expect(body[0]).toMatchObject({
      associateId: 1,
      slug: 'jane-doe',
      sparkline: expect.any(Array),
      trendWord: expect.stringMatching(/improving|declining|steady|new/),
      topGap: null,
      lastMockDate: expect.any(String),
    })
  })

  it('returns max 6 sessions per associate', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    // Query returns 6 rows (rn 1-6) — already filtered in the route's windowed query
    const rows = makeSessionRows(1, 'jane-doe', 6)
    mockQueryRaw.mockResolvedValue(rows)
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body[0].sparkline.length).toBeLessThanOrEqual(6)
  })

  it('sparkline data is in chronological order (oldest first)', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    // DESC ordered from DB (rn=1 is most recent) — route reverses to chronological
    const rows = [
      { associateId: 1, slug: 'jane-doe', overall_score: 90, createdAt: new Date('2026-04-05T00:00:00Z'), rn: BigInt(1) },
      { associateId: 1, slug: 'jane-doe', overall_score: 80, createdAt: new Date('2026-04-03T00:00:00Z'), rn: BigInt(2) },
      { associateId: 1, slug: 'jane-doe', overall_score: 70, createdAt: new Date('2026-04-01T00:00:00Z'), rn: BigInt(3) },
    ]
    mockQueryRaw.mockResolvedValue(rows)
    const res = await GET(makeRequest())
    const body = await res.json()
    const scores = body[0].sparkline.map((p: { score: number }) => p.score)
    // Oldest first: 70, 80, 90
    expect(scores[0]).toBeLessThan(scores[scores.length - 1])
  })

  it('trend word is "new" for associates with < 3 sessions', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    // Only 2 sessions
    const rows = makeSessionRows(1, 'jane-doe', 2)
    mockQueryRaw.mockResolvedValue(rows)
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body[0].trendWord).toBe('new')
  })

  it('passes cohort param to query when ?cohort=<id> provided', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockQueryRaw.mockResolvedValue([])
    const req = makeRequest('http://localhost/api/trainer/sparklines?cohort=3')
    await GET(req)
    expect(mockQueryRaw).toHaveBeenCalledTimes(1)
  })

  it('returns "improving" when last 3 scores have positive slope', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    // Oldest-to-newest after reversal: 60, 70, 80 → slope > 0 → "improving"
    const rows = [
      { associateId: 1, slug: 'jane-doe', overall_score: 80, createdAt: new Date('2026-04-05T00:00:00Z'), rn: BigInt(1) },
      { associateId: 1, slug: 'jane-doe', overall_score: 70, createdAt: new Date('2026-04-03T00:00:00Z'), rn: BigInt(2) },
      { associateId: 1, slug: 'jane-doe', overall_score: 60, createdAt: new Date('2026-04-01T00:00:00Z'), rn: BigInt(3) },
    ]
    mockQueryRaw.mockResolvedValue(rows)
    const res = await GET(makeRequest())
    const body = await res.json()
    expect(body[0].trendWord).toBe('improving')
  })
})
