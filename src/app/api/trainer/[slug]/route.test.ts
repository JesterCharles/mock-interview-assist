/**
 * Unit tests for /api/trainer/[slug] route (GET + PATCH).
 *
 * Prisma and auth are mocked — no DB connection or cookie required.
 *
 * Covers (Plan 11-03):
 * - GET regression: returns AssociateDetail with cohortId + cohortName when assigned
 * - PATCH: auth guard (401), slug validation (400), payload validation (400),
 *   success (200), null cohortId (200), P2025 -> 404, P2003 -> 400.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    associate: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  }
  return { prisma: mockPrisma }
})

vi.mock('@/lib/identity', () => ({
  getCallerIdentity: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getCallerIdentity } from '@/lib/identity'
import { GET, PATCH } from '@/app/api/trainer/[slug]/route'

const mockFindUnique = prisma.associate.findUnique as ReturnType<typeof vi.fn>
const mockUpdate = prisma.associate.update as ReturnType<typeof vi.fn>
const mockAuth = getCallerIdentity as ReturnType<typeof vi.fn>

function makeCtx(slug: string) {
  return { params: Promise.resolve({ slug }) }
}

function makeRequest(method: string, body?: unknown) {
  return new Request('http://localhost/api/trainer/some-slug', {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
}

// ---------------------------------------------------------------------------
// GET regression — cohort fields populated
// ---------------------------------------------------------------------------

describe('GET /api/trainer/[slug] cohort fields', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' })
  })

  it('returns cohortId + cohortName when associate is assigned to a cohort', async () => {
    mockFindUnique.mockResolvedValue({
      id: 1,
      slug: 'jane',
      displayName: 'Jane',
      readinessStatus: 'ready',
      recommendedArea: null,
      cohortId: 7,
      cohort: { id: 7, name: 'Spring 2026' },
      sessions: [],
      gapScores: [],
      _count: { sessions: 0 },
    })

    const res = await GET(makeRequest('GET'), makeCtx('jane'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cohortId).toBe(7)
    expect(body.cohortName).toBe('Spring 2026')
  })

  it('returns cohortId=null and cohortName=null when unassigned', async () => {
    mockFindUnique.mockResolvedValue({
      id: 2,
      slug: 'bob',
      displayName: 'Bob',
      readinessStatus: 'not_ready',
      recommendedArea: null,
      cohortId: null,
      cohort: null,
      sessions: [],
      gapScores: [],
      _count: { sessions: 0 },
    })

    const res = await GET(makeRequest('GET'), makeCtx('bob'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cohortId).toBeNull()
    expect(body.cohortName).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// PATCH
// ---------------------------------------------------------------------------

describe('PATCH /api/trainer/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' })
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ kind: 'anonymous' })
    const res = await PATCH(makeRequest('PATCH', { cohortId: 1 }), makeCtx('jane'))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid slug', async () => {
    const res = await PATCH(makeRequest('PATCH', { cohortId: 1 }), makeCtx('BAD SLUG!'))
    expect(res.status).toBe(400)
  })

  it('returns 400 when cohortId is not a number and not null', async () => {
    const res = await PATCH(makeRequest('PATCH', { cohortId: 'nope' }), makeCtx('jane'))
    expect(res.status).toBe(400)
  })

  it('returns 400 when cohortId is missing', async () => {
    const res = await PATCH(makeRequest('PATCH', {}), makeCtx('jane'))
    expect(res.status).toBe(400)
  })

  it('returns 200 with { slug, cohortId } on successful assignment', async () => {
    mockUpdate.mockResolvedValue({ slug: 'jane', cohortId: 7 })
    const res = await PATCH(makeRequest('PATCH', { cohortId: 7 }), makeCtx('jane'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ slug: 'jane', cohortId: 7 })
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'jane' },
        data: { cohortId: 7 },
      })
    )
  })

  it('returns 200 and nullifies cohortId when cohortId=null', async () => {
    mockUpdate.mockResolvedValue({ slug: 'jane', cohortId: null })
    const res = await PATCH(makeRequest('PATCH', { cohortId: null }), makeCtx('jane'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ slug: 'jane', cohortId: null })
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'jane' },
        data: { cohortId: null },
      })
    )
  })

  it('returns 404 when associate not found (P2025)', async () => {
    const p2025 = Object.assign(new Error('Record to update not found'), {
      code: 'P2025',
    })
    mockUpdate.mockRejectedValue(p2025)
    const res = await PATCH(makeRequest('PATCH', { cohortId: 1 }), makeCtx('missing'))
    expect(res.status).toBe(404)
  })

  it('returns 400 when cohort FK does not exist (P2003)', async () => {
    const p2003 = Object.assign(new Error('Foreign key constraint failed'), {
      code: 'P2003',
    })
    mockUpdate.mockRejectedValue(p2003)
    const res = await PATCH(makeRequest('PATCH', { cohortId: 9999 }), makeCtx('jane'))
    expect(res.status).toBe(400)
  })

  it('returns 400 when cohortId is not a positive integer', async () => {
    const res = await PATCH(makeRequest('PATCH', { cohortId: -1 }), makeCtx('jane'))
    expect(res.status).toBe(400)
  })
})
