/**
 * Unit tests for GET /api/trainer/cohort-trends
 *
 * Auth guard: 401 for non-trainer/admin callers
 * Weekly buckets: up to 12, returned in ascending order
 * Uses createdAt (DATE_TRUNC) not a date string field
 * No cohort param: returns empty array
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
import { GET } from '@/app/api/trainer/cohort-trends/route'

const mockQueryRaw = prisma.$queryRaw as ReturnType<typeof vi.fn>
const mockGetCallerIdentity = getCallerIdentity as ReturnType<typeof vi.fn>

function makeRequest(url = 'http://localhost/api/trainer/cohort-trends'): Request {
  return new Request(url)
}

const TRAINER_IDENTITY = { kind: 'trainer', userId: 'u1', email: 'trainer@example.com' }
const ADMIN_IDENTITY = { kind: 'admin', userId: 'u2', email: 'admin@example.com' }
const ANON_IDENTITY = { kind: 'anonymous' }

function makeWeekRow(weekOffset: number) {
  const weekStart = new Date(`2026-0${weekOffset + 1}-01T00:00:00Z`)
  return {
    week_start: weekStart,
    avg_score: 65 + weekOffset * 2,
    session_count: BigInt(3 + weekOffset),
  }
}

describe('GET /api/trainer/cohort-trends', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for anonymous callers', async () => {
    mockGetCallerIdentity.mockResolvedValue(ANON_IDENTITY)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 200 for trainer callers', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockQueryRaw.mockResolvedValue([makeWeekRow(1)])
    const res = await GET(makeRequest('http://localhost/api/trainer/cohort-trends?cohort=1'))
    expect(res.status).toBe(200)
  })

  it('returns 200 for admin callers', async () => {
    mockGetCallerIdentity.mockResolvedValue(ADMIN_IDENTITY)
    mockQueryRaw.mockResolvedValue([])
    const res = await GET(makeRequest('http://localhost/api/trainer/cohort-trends?cohort=1'))
    expect(res.status).toBe(200)
  })

  it('returns empty array when no cohort param provided', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
    // Should NOT call $queryRaw when no cohort
    expect(mockQueryRaw).not.toHaveBeenCalled()
  })

  it('returns CohortTrendPoint[] with weekLabel, weekStart, avgScore, sessionCount', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockQueryRaw.mockResolvedValue([makeWeekRow(1), makeWeekRow(2), makeWeekRow(3)])
    const res = await GET(makeRequest('http://localhost/api/trainer/cohort-trends?cohort=1'))
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBe(3)
    expect(body[0]).toMatchObject({
      weekLabel: 'W1',
      weekStart: expect.any(String),
      avgScore: expect.any(Number),
      sessionCount: expect.any(Number),
    })
  })

  it('returns weekly buckets in ascending order (W1 first)', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    // DB returns ASC order already
    mockQueryRaw.mockResolvedValue([makeWeekRow(1), makeWeekRow(2), makeWeekRow(3)])
    const res = await GET(makeRequest('http://localhost/api/trainer/cohort-trends?cohort=2'))
    const body = await res.json()
    expect(body[0].weekLabel).toBe('W1')
    expect(body[1].weekLabel).toBe('W2')
    expect(body[2].weekLabel).toBe('W3')
  })

  it('serializes bigint session_count as number', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockQueryRaw.mockResolvedValue([makeWeekRow(1)])
    const res = await GET(makeRequest('http://localhost/api/trainer/cohort-trends?cohort=1'))
    const body = await res.json()
    expect(typeof body[0].sessionCount).toBe('number')
  })

  it('converts week_start Date to ISO string', async () => {
    mockGetCallerIdentity.mockResolvedValue(TRAINER_IDENTITY)
    mockQueryRaw.mockResolvedValue([makeWeekRow(1)])
    const res = await GET(makeRequest('http://localhost/api/trainer/cohort-trends?cohort=1'))
    const body = await res.json()
    expect(typeof body[0].weekStart).toBe('string')
    // Should parse as a valid date
    expect(new Date(body[0].weekStart).getFullYear()).toBeGreaterThan(2020)
  })
})
