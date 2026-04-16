/**
 * Integration-style tests for the trainer backfill admin surface (Plan 17-04).
 *
 * Exercises the full route lifecycle (list → PATCH → DELETE) end-to-end with
 * mocked Prisma + identity. This is the Phase 18 regression net for
 * BACKFILL-01 (schema-field presence) and BACKFILL-02 (route contract).
 *
 * Scenario coverage matrix:
 *  1. List as anonymous → 401
 *  2. List as trainer → 200 with mapped rows
 *  3. PATCH cross-origin → 403 (before auth check)
 *  4. PATCH as anonymous → 401
 *  5. PATCH valid email → 200
 *  6. PATCH P2002 collision → 409 email_taken (response opaque to PII)
 *  7. PATCH malformed email → 400 invalid_payload
 *  8. DELETE associate with sessions > 0 → 409 has_sessions, no delete call
 *  9. DELETE orphan → 200 { ok: true, id }
 * 10. DELETE cross-origin → 403
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    associate: {
      findMany: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('@/lib/identity', () => ({
  getCallerIdentity: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getCallerIdentity } from '@/lib/identity'
import { GET as LIST } from '@/app/api/trainer/associates/route'
import { PATCH, DELETE } from '@/app/api/trainer/associates/[id]/route'

const mockFindMany = prisma.associate.findMany as unknown as ReturnType<typeof vi.fn>
const mockUpdate = prisma.associate.update as unknown as ReturnType<typeof vi.fn>
const mockFindUnique = prisma.associate.findUnique as unknown as ReturnType<typeof vi.fn>
const mockDelete = prisma.associate.delete as unknown as ReturnType<typeof vi.fn>
const mockIdentity = getCallerIdentity as unknown as ReturnType<typeof vi.fn>

function makeListReq(): NextRequest {
  return new NextRequest('http://localhost/api/trainer/associates', {
    method: 'GET',
  })
}

function makePatchReq(
  id: string,
  body: unknown,
  opts?: { origin?: string; host?: string },
): { req: NextRequest; params: Promise<{ id: string }> } {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts?.origin) headers['origin'] = opts.origin
  if (opts?.host) headers['host'] = opts.host
  const req = new NextRequest(`http://localhost/api/trainer/associates/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
  return { req, params: Promise.resolve({ id }) }
}

function makeDeleteReq(
  id: string,
  opts?: { origin?: string; host?: string },
): { req: NextRequest; params: Promise<{ id: string }> } {
  const headers: Record<string, string> = {}
  if (opts?.origin) headers['origin'] = opts.origin
  if (opts?.host) headers['host'] = opts.host
  const req = new NextRequest(`http://localhost/api/trainer/associates/${id}`, {
    method: 'DELETE',
    headers,
  })
  return { req, params: Promise.resolve({ id }) }
}

describe('trainer backfill integration (list + PATCH + DELETE)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1.
  it('LIST: anonymous caller → 401, no DB query', async () => {
    mockIdentity.mockResolvedValue({ kind: 'anonymous' })
    const res = await LIST(makeListReq())
    expect(res.status).toBe(401)
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  // 2.
  it('LIST: trainer caller → 200 with AssociateBackfillRow[] mapped from Prisma', async () => {
    mockIdentity.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' })
    mockFindMany.mockResolvedValue([
      {
        id: 1,
        slug: 'alice',
        displayName: 'Alice',
        email: 'alice@example.com',
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        cohortId: 9,
        cohort: { id: 9, name: 'Spring 2026' },
        _count: { sessions: 3 },
      },
      {
        id: 2,
        slug: 'bob',
        displayName: null,
        email: null,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
        cohortId: null,
        cohort: null,
        _count: { sessions: 0 },
      },
    ])
    const res = await LIST(makeListReq())
    expect(res.status).toBe(200)
    const body = (await res.json()) as Array<{
      id: number
      slug: string
      email: string | null
      sessionCount: number
      cohortName: string | null
    }>
    expect(body).toHaveLength(2)
    expect(body[0]).toMatchObject({
      id: 1,
      slug: 'alice',
      email: 'alice@example.com',
      sessionCount: 3,
      cohortName: 'Spring 2026',
    })
    expect(body[1]).toMatchObject({
      id: 2,
      slug: 'bob',
      email: null,
      sessionCount: 0,
      cohortName: null,
    })
  })

  // 3.
  it('PATCH: cross-origin → 403 before auth check (DB never touched)', async () => {
    // Identity should NOT even be consulted, but mock it anyway so a stray
    // call wouldn't throw — the assertion that matters is no DB write.
    mockIdentity.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' })
    const { req, params } = makePatchReq(
      '1',
      { email: 'a@b.com' },
      { origin: 'http://evil.com', host: 'localhost' },
    )
    const res = await PATCH(req, { params })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'cross-origin' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  // 4.
  it('PATCH: anonymous caller → 401', async () => {
    mockIdentity.mockResolvedValue({ kind: 'anonymous' })
    const { req, params } = makePatchReq('1', { email: 'a@b.com' })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(401)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  // 5.
  it('PATCH: trainer with valid email → 200 with updated row', async () => {
    mockIdentity.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' })
    mockUpdate.mockResolvedValue({ id: 1, email: 'new@example.com' })
    const { req, params } = makePatchReq('1', { email: 'new@example.com' })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: 1, email: 'new@example.com' })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { email: 'new@example.com' },
      select: { id: true, email: true },
    })
  })

  // 6.
  it('PATCH: P2002 collision → 409 email_taken, response body does NOT contain submitted email', async () => {
    mockIdentity.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' })
    const p2002 = Object.assign(new Error('Unique constraint failed on the fields: (`email`)'), {
      code: 'P2002',
    })
    mockUpdate.mockRejectedValue(p2002)
    const submittedEmail = 'attempted@email.com'
    const { req, params } = makePatchReq('1', { email: submittedEmail })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body).toEqual({ error: 'email_taken', field: 'email' })
    // PII non-disclosure assertion — locks in the no-echo invariant.
    expect(JSON.stringify(body)).not.toContain(submittedEmail)
    expect(JSON.stringify(body)).not.toContain('attempted')
  })

  // 7.
  it('PATCH: malformed email → 400 invalid_payload, no DB write', async () => {
    mockIdentity.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' })
    const { req, params } = makePatchReq('1', { email: 'not-an-email' })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_payload')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  // 8.
  it('DELETE: associate with sessions > 0 → 409 has_sessions, prisma.delete NEVER called', async () => {
    mockIdentity.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' })
    mockFindUnique.mockResolvedValue({ id: 1, _count: { sessions: 3 } })
    const { req, params } = makeDeleteReq('1')
    const res = await DELETE(req, { params })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('has_sessions')
    expect(body.sessionCount).toBe(3)
    // Critical orphan-guard invariant: row preserved.
    expect(mockDelete).not.toHaveBeenCalled()
  })

  // 9.
  it('DELETE: orphan associate (sessions === 0) → 200 { ok: true, id }', async () => {
    mockIdentity.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' })
    mockFindUnique.mockResolvedValue({ id: 1, _count: { sessions: 0 } })
    mockDelete.mockResolvedValue({ id: 1 })
    const { req, params } = makeDeleteReq('1')
    const res = await DELETE(req, { params })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, id: 1 })
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 1 } })
  })

  // 10.
  it('DELETE: cross-origin → 403, no DB lookup or delete', async () => {
    mockIdentity.mockResolvedValue({ kind: 'trainer', userId: 'u1', email: 'trainer@test.com' })
    const { req, params } = makeDeleteReq('1', {
      origin: 'http://evil.com',
      host: 'localhost',
    })
    const res = await DELETE(req, { params })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'cross-origin' })
    expect(mockFindUnique).not.toHaveBeenCalled()
    expect(mockDelete).not.toHaveBeenCalled()
  })
})
