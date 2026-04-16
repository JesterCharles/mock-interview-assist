/**
 * Unit tests for GET /api/trainer/reports/associate-pdf
 *
 * Auth guard: 401 for non-trainer/admin callers
 * Missing slug: 400
 * Content-Type: application/pdf for trainer with valid slug
 * Magic bytes: response body starts with %PDF
 *
 * Prisma, auth, and renderToBuffer are mocked — no DB or PDF render required.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

// --- Mock @/lib/prisma ---
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    associate: {
      findUnique: vi.fn(),
    },
    gapScore: {
      findMany: vi.fn(),
    },
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

// --- Mock renderToBuffer — returns a Buffer starting with %PDF magic bytes ---
vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock pdf content')),
}))

// --- Mock the AssociateAnalyticsPdf component ---
vi.mock('@/lib/pdf/AssociateAnalyticsPdf', () => ({
  AssociateAnalyticsPdf: vi.fn(() => null),
}))

import { prisma } from '@/lib/prisma'
import { getCallerIdentity } from '@/lib/identity'
import { GET } from '@/app/api/trainer/reports/associate-pdf/route'

const mockFindUniqueAssociate = prisma.associate.findUnique as ReturnType<typeof vi.fn>
const mockFindManyGapScore = prisma.gapScore.findMany as ReturnType<typeof vi.fn>
const mockFindManySession = prisma.session.findMany as ReturnType<typeof vi.fn>
const mockGetCallerIdentity = getCallerIdentity as ReturnType<typeof vi.fn>

function makeRequest(url = 'http://localhost/api/trainer/reports/associate-pdf'): Request {
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

const MOCK_ASSOCIATE = {
  id: 1,
  slug: 'jane-doe',
  displayName: 'Jane Doe',
  readinessStatus: 'improving',
  readinessScore: null,
  recommendedArea: 'React',
  cohortId: null,
  cohort: null,
}

const MOCK_GAP_SCORES = [
  { skill: 'React', topic: 'Hooks', weightedScore: 2.5, sessionCount: 3 },
]

const MOCK_SESSIONS = [
  {
    id: 'sess-1',
    date: '2026-04-01',
    overallTechnicalScore: 75,
    overallSoftSkillScore: 70,
    status: 'completed',
    assessments: {},
    techMap: {},
    createdAt: new Date('2026-04-01'),
  },
]

describe('GET /api/trainer/reports/associate-pdf', () => {
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

  it('returns 400 when slug param is missing', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    const res = await GET(makeRequest('http://localhost/api/trainer/reports/associate-pdf'))
    expect(res.status).toBe(400)
  })

  it('returns Content-Type application/pdf for trainer with valid slug', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockFindUniqueAssociate.mockResolvedValue(MOCK_ASSOCIATE)
    mockFindManyGapScore.mockResolvedValue(MOCK_GAP_SCORES)
    mockFindManySession.mockResolvedValue(MOCK_SESSIONS)
    const res = await GET(makeRequest('http://localhost/api/trainer/reports/associate-pdf?slug=jane-doe'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
  })

  it('response body starts with %PDF magic bytes', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockFindUniqueAssociate.mockResolvedValue(MOCK_ASSOCIATE)
    mockFindManyGapScore.mockResolvedValue(MOCK_GAP_SCORES)
    mockFindManySession.mockResolvedValue(MOCK_SESSIONS)
    const res = await GET(makeRequest('http://localhost/api/trainer/reports/associate-pdf?slug=jane-doe'))
    const buffer = await res.arrayBuffer()
    const magic = Buffer.from(buffer).slice(0, 4).toString('ascii')
    expect(magic).toBe('%PDF')
  })

  it('returns 404 when associate not found', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockFindUniqueAssociate.mockResolvedValue(null)
    const res = await GET(makeRequest('http://localhost/api/trainer/reports/associate-pdf?slug=unknown'))
    expect(res.status).toBe(404)
  })
})
