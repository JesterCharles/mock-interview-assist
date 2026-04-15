/**
 * Unit tests for PATCH/DELETE /api/trainer/associates/[id] (Plan 17-02).
 *
 * Covers:
 * - PATCH: anonymous → 401; cross-origin → 403; valid email → 200; empty → null;
 *   malformed → 400; P2002 collision → 409 `{ error:'email_taken', field:'email' }`
 *   with no email value echoed back; P2025 → 404
 * - DELETE: anonymous → 401; cross-origin → 403; sessions > 0 → 409 `has_sessions`;
 *   sessions === 0 → 200; missing row → 404
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    associate: {
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
import { PATCH, DELETE } from '@/app/api/trainer/associates/[id]/route'

const mockUpdate = prisma.associate.update as unknown as ReturnType<typeof vi.fn>
const mockFindUnique = prisma.associate.findUnique as unknown as ReturnType<typeof vi.fn>
const mockDelete = prisma.associate.delete as unknown as ReturnType<typeof vi.fn>
const mockIdentity = getCallerIdentity as unknown as ReturnType<typeof vi.fn>

function makePatch(
  id: string,
  body: unknown,
  opts?: { origin?: string; host?: string },
): { req: NextRequest; params: Promise<{ id: string }> } {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts?.origin) headers['origin'] = opts.origin
  // `host` is a forbidden header in fetch but NextRequest lets us set it.
  if (opts?.host) headers['host'] = opts.host
  const req = new NextRequest(`http://localhost/api/trainer/associates/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
  return { req, params: Promise.resolve({ id }) }
}

function makeDelete(
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

describe('PATCH /api/trainer/associates/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for anonymous', async () => {
    mockIdentity.mockResolvedValue({ type: 'anonymous' })
    const { req, params } = makePatch('1', { email: 'a@b.com' })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(401)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 403 for cross-origin request', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' })
    const { req, params } = makePatch(
      '1',
      { email: 'a@b.com' },
      { origin: 'http://evil.com', host: 'localhost' },
    )
    const res = await PATCH(req, { params })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('cross-origin')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 200 and updated row for valid email', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' })
    mockUpdate.mockResolvedValue({ id: 1, email: 'user@example.com' })
    const { req, params } = makePatch('1', { email: 'user@example.com' })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: 1, email: 'user@example.com' })
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { email: 'user@example.com' },
      select: { id: true, email: true },
    })
  })

  it('treats empty string as clear (null)', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' })
    mockUpdate.mockResolvedValue({ id: 1, email: null })
    const { req, params } = makePatch('1', { email: '' })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { email: null } }),
    )
  })

  it('treats explicit null as clear', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' })
    mockUpdate.mockResolvedValue({ id: 1, email: null })
    const { req, params } = makePatch('1', { email: null })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { email: null } }),
    )
  })

  it('returns 400 for malformed email', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' })
    const { req, params } = makePatch('1', { email: 'not-an-email' })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(400)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid id', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' })
    const { req, params } = makePatch('abc', { email: 'a@b.com' })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(400)
  })

  it('returns 409 { error:email_taken, field:email } on P2002 without echoing email', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' })
    const p2002 = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
    })
    mockUpdate.mockRejectedValue(p2002)
    const rejected = 'collide@example.com'
    const { req, params } = makePatch('1', { email: rejected })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body).toEqual({ error: 'email_taken', field: 'email' })
    // PII: response must NOT contain the submitted email string.
    expect(JSON.stringify(body)).not.toContain(rejected)
  })

  it('returns 404 on P2025 (row not found)', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' })
    const p2025 = Object.assign(new Error('Record not found'), { code: 'P2025' })
    mockUpdate.mockRejectedValue(p2025)
    const { req, params } = makePatch('999', { email: 'a@b.com' })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(404)
  })

  it('returns 500 on unknown prisma error', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' })
    mockUpdate.mockRejectedValue(new Error('boom'))
    const { req, params } = makePatch('1', { email: 'a@b.com' })
    const res = await PATCH(req, { params })
    expect(res.status).toBe(500)
  })

  it('returns 400 on invalid JSON body', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' })
    const req = new NextRequest('http://localhost/api/trainer/associates/1', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: 'not-json',
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/trainer/associates/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for anonymous', async () => {
    mockIdentity.mockResolvedValue({ type: 'anonymous' })
    const { req, params } = makeDelete('1')
    const res = await DELETE(req, { params })
    expect(res.status).toBe(401)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('returns 403 for cross-origin', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' })
    const { req, params } = makeDelete('1', {
      origin: 'http://evil.com',
      host: 'localhost',
    })
    const res = await DELETE(req, { params })
    expect(res.status).toBe(403)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('returns 200 and deletes when sessionCount === 0', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' })
    mockFindUnique.mockResolvedValue({ id: 1, _count: { sessions: 0 } })
    mockDelete.mockResolvedValue({ id: 1 })
    const { req, params } = makeDelete('1')
    const res = await DELETE(req, { params })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, id: 1 })
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 1 } })
  })

  it('returns 409 has_sessions when sessionCount > 0, row preserved', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' })
    mockFindUnique.mockResolvedValue({ id: 1, _count: { sessions: 3 } })
    const { req, params } = makeDelete('1')
    const res = await DELETE(req, { params })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('has_sessions')
    expect(body.sessionCount).toBe(3)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('returns 404 when row does not exist', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' })
    mockFindUnique.mockResolvedValue(null)
    const { req, params } = makeDelete('999')
    const res = await DELETE(req, { params })
    expect(res.status).toBe(404)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid id', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' })
    const { req, params } = makeDelete('not-a-number')
    const res = await DELETE(req, { params })
    expect(res.status).toBe(400)
  })

  it('returns 500 when delete throws unexpectedly', async () => {
    mockIdentity.mockResolvedValue({ type: 'trainer' })
    mockFindUnique.mockResolvedValue({ id: 1, _count: { sessions: 0 } })
    mockDelete.mockRejectedValue(new Error('boom'))
    const { req, params } = makeDelete('1')
    const res = await DELETE(req, { params })
    expect(res.status).toBe(500)
  })
})
