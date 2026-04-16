/**
 * Unit tests for GET /api/trainer/associates (Plan 17-02).
 *
 * Covers:
 * - Anonymous caller → 401
 * - Trainer caller → 200 + AssociateBackfillRow[] ordered by createdAt asc
 * - sessionCount wired from _count.sessions
 * - email passes through (null for un-backfilled rows)
 * - Cohort name resolved from relation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    associate: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/identity', () => ({
  getCallerIdentity: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getCallerIdentity } from '@/lib/identity'
import { GET } from '@/app/api/trainer/associates/route'

const mockFindMany = prisma.associate.findMany as unknown as ReturnType<typeof vi.fn>
const mockIdentity = getCallerIdentity as unknown as ReturnType<typeof vi.fn>

function makeReq(): NextRequest {
  return new NextRequest('http://localhost/api/trainer/associates', { method: 'GET' })
}

describe('GET /api/trainer/associates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for anonymous caller', async () => {
    mockIdentity.mockResolvedValue({ kind: 'anonymous' })
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('returns 401 for associate caller (trainer-only)', async () => {
    mockIdentity.mockResolvedValue({ kind: 'associate', userId: 'u2', email: 'a@test.com', associateId: 1, associateSlug: 'alice' })
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })

  it('returns AssociateBackfillRow[] for trainer', async () => {
    mockIdentity.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' })
    const createdA = new Date('2026-03-01T00:00:00.000Z')
    const createdB = new Date('2026-04-01T00:00:00.000Z')
    const invitedAt = new Date('2026-04-10T12:00:00.000Z')
    mockFindMany.mockResolvedValue([
      {
        id: 1,
        slug: 'alice',
        displayName: 'Alice',
        email: 'alice@example.com',
        createdAt: createdA,
        lastInvitedAt: invitedAt,
        cohortId: 9,
        cohort: { id: 9, name: 'Spring 2026' },
        _count: { sessions: 3 },
      },
      {
        id: 2,
        slug: 'bob',
        displayName: null,
        email: null,
        createdAt: createdB,
        lastInvitedAt: null,
        cohortId: null,
        cohort: null,
        _count: { sessions: 0 },
      },
    ])

    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    const body = (await res.json()) as unknown[]
    expect(body).toEqual([
      {
        id: 1,
        slug: 'alice',
        displayName: 'Alice',
        email: 'alice@example.com',
        sessionCount: 3,
        cohortId: 9,
        cohortName: 'Spring 2026',
        createdAt: '2026-03-01T00:00:00.000Z',
        lastInvitedAt: '2026-04-10T12:00:00.000Z',
      },
      {
        id: 2,
        slug: 'bob',
        displayName: null,
        email: null,
        sessionCount: 0,
        cohortId: null,
        cohortName: null,
        createdAt: '2026-04-01T00:00:00.000Z',
        lastInvitedAt: null,
      },
    ])
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'asc' },
      }),
    )
  })

  it('returns 500 when prisma throws', async () => {
    mockIdentity.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' })
    mockFindMany.mockRejectedValue(new Error('db down'))
    const res = await GET(makeReq())
    expect(res.status).toBe(500)
  })
})
