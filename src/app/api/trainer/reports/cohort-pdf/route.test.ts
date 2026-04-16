/**
 * Unit tests for GET /api/trainer/reports/cohort-pdf
 *
 * Auth guard: 401 for non-trainer/admin callers
 * Content-Type: application/pdf for trainer
 * Magic bytes: response body starts with %PDF
 *
 * Prisma, auth, and renderToBuffer are mocked — no DB or PDF render required.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

// --- Mock @/lib/prisma ---
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    $queryRaw: vi.fn(),
    cohort: {
      findUnique: vi.fn(),
    },
  }
  return { prisma: mockPrisma }
})

// --- Mock @/lib/identity ---
vi.mock('@/lib/identity', () => ({
  getCallerIdentity: vi.fn(),
}))

// --- Mock renderToBuffer — returns a Buffer starting with %PDF magic bytes ---
vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock pdf content')),
}))

// --- Mock the CohortAnalyticsPdf component ---
vi.mock('@/lib/pdf/CohortAnalyticsPdf', () => ({
  CohortAnalyticsPdf: vi.fn(() => null),
}))

import { prisma } from '@/lib/prisma'
import { getCallerIdentity } from '@/lib/identity'
import { GET } from '@/app/api/trainer/reports/cohort-pdf/route'

const mockQueryRaw = prisma.$queryRaw as ReturnType<typeof vi.fn>
const mockGetCallerIdentity = getCallerIdentity as ReturnType<typeof vi.fn>

function makeRequest(url = 'http://localhost/api/trainer/reports/cohort-pdf'): Request {
  return new Request(url)
}

const TRAINER_IDENTITY = { kind: 'trainer', userId: 'u1', email: 'trainer@example.com' }
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

const MOCK_GAP_ROWS = [
  {
    skill: 'React',
    topic: 'Hooks',
    associates_affected: BigInt(3),
    avg_gap_score: 2.5,
  },
]

const MOCK_ROSTER_SESSION_ROWS = [
  {
    associateId: 1,
    slug: 'jane-doe',
    display_name: 'Jane Doe',
    readiness_status: 'improving',
    readiness_score: null,
    recommended_area: 'React',
    session_count: BigInt(4),
    last_session_date: null,
    overall_score: 75.0,
    rn: BigInt(1),
  },
]

const MOCK_GAP_TOP_ROWS = [
  { associateId: 1, skill: 'React' },
]

describe('GET /api/trainer/reports/cohort-pdf', () => {
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

  it('returns Content-Type application/pdf for trainer', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockQueryRaw
      .mockResolvedValueOnce(MOCK_KPI_ROW)
      .mockResolvedValueOnce(MOCK_GAP_ROWS)
      .mockResolvedValueOnce(MOCK_ROSTER_SESSION_ROWS)
      .mockResolvedValueOnce(MOCK_GAP_TOP_ROWS)
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
  })

  it('response body starts with %PDF magic bytes', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockQueryRaw
      .mockResolvedValueOnce(MOCK_KPI_ROW)
      .mockResolvedValueOnce(MOCK_GAP_ROWS)
      .mockResolvedValueOnce(MOCK_ROSTER_SESSION_ROWS)
      .mockResolvedValueOnce(MOCK_GAP_TOP_ROWS)
    const res = await GET(makeRequest())
    const buffer = await res.arrayBuffer()
    const magic = Buffer.from(buffer).slice(0, 4).toString('ascii')
    expect(magic).toBe('%PDF')
  })
})
