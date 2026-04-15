/**
 * Unit tests for GET /api/trainer/associates/preview (Plan 17-02).
 *
 * Covers:
 * - Anonymous caller → 401
 * - Trainer caller → 200 + BackfillPreview
 * - slugOnlyZeroSessions counts only email IS NULL AND sessionCount === 0
 * - withEmail + withoutEmail === total (math sanity)
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
import { GET } from '@/app/api/trainer/associates/preview/route'

const mockFindMany = prisma.associate.findMany as unknown as ReturnType<typeof vi.fn>
const mockIdentity = getCallerIdentity as unknown as ReturnType<typeof vi.fn>

function makeReq(): NextRequest {
  return new NextRequest('http://localhost/api/trainer/associates/preview', { method: 'GET' })
}

describe('GET /api/trainer/associates/preview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for anonymous', async () => {
    mockIdentity.mockResolvedValue({ type: 'anonymous' })
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })

  it('returns correct counts for trainer', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' })
    mockFindMany.mockResolvedValue([
      { email: 'a@b.com', _count: { sessions: 2 } }, // withEmail
      { email: 'c@d.com', _count: { sessions: 0 } }, // withEmail
      { email: null, _count: { sessions: 3 } }, // withoutEmail, NOT deletable
      { email: null, _count: { sessions: 0 } }, // withoutEmail, deletable
      { email: null, _count: { sessions: 0 } }, // withoutEmail, deletable
    ])

    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      total: number
      withEmail: number
      withoutEmail: number
      slugOnlyZeroSessions: number
      sessionsOrphanedIfAllDeleted: number
    }
    expect(body.total).toBe(5)
    expect(body.withEmail).toBe(2)
    expect(body.withoutEmail).toBe(3)
    expect(body.slugOnlyZeroSessions).toBe(2)
    expect(body.sessionsOrphanedIfAllDeleted).toBe(0)
    // math sanity
    expect(body.withEmail + body.withoutEmail).toBe(body.total)
  })

  it('returns zeros when no associates exist', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' })
    mockFindMany.mockResolvedValue([])
    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      total: 0,
      withEmail: 0,
      withoutEmail: 0,
      slugOnlyZeroSessions: 0,
      sessionsOrphanedIfAllDeleted: 0,
    })
  })

  it('returns 500 when prisma throws', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' })
    mockFindMany.mockRejectedValue(new Error('db down'))
    const res = await GET(makeReq())
    expect(res.status).toBe(500)
  })
})
