import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCallerIdentity } from '@/lib/identity'
import { prisma } from '@/lib/prisma'

// CSRF defense-in-depth — reject cross-origin state changes before touching DB.
// Mirrors the pattern in src/app/api/github/cache/invalidate/route.ts. The
// nlm_session cookie is SameSite=strict but verifying Origin/Host here blocks
// same-site subdomain attacks and any future SameSite relaxation.
function checkOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (origin !== null && host !== null) {
    let originHost: string | null = null
    try {
      originHost = new URL(origin).host
    } catch {
      originHost = null
    }
    if (originHost !== host) {
      return NextResponse.json({ error: 'cross-origin' }, { status: 403 })
    }
  }
  return null
}

// Empty string clears the email; null also clears it; otherwise must validate.
const PatchBody = z.object({
  email: z.union([z.literal(''), z.string().email()]).nullable(),
})

function parseId(raw: string): number | null {
  const n = Number.parseInt(raw, 10)
  return Number.isInteger(n) && n > 0 ? n : null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = checkOrigin(request)
  if (originErr) return originErr

  const caller = await getCallerIdentity()
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id: idParam } = await params
  const id = parseId(idParam)
  if (id === null) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const parsed = PatchBody.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
  }
  const normalized = parsed.data.email === '' ? null : parsed.data.email

  try {
    const updated = await prisma.associate.update({
      where: { id },
      data: { email: normalized },
      select: { id: true, email: true },
    })
    return NextResponse.json(updated)
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === 'P2025') return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (code === 'P2002') {
      // Do NOT echo the rejected email value (PII + harvest signal on
      // enumeration via collision). Field-level marker only.
      return NextResponse.json(
        { error: 'email_taken', field: 'email' },
        { status: 409 },
      )
    }
    console.error(
      '[/api/trainer/associates/[id]] PATCH failed:',
      (error as Error).message,
    )
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = checkOrigin(request)
  if (originErr) return originErr

  const caller = await getCallerIdentity()
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id: idParam } = await params
  const id = parseId(idParam)
  if (id === null) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })

  // SERVER-SIDE orphan guard — re-count sessions from the DB. Never trust
  // client-supplied counts. If the row has any sessions, refuse delete.
  const target = await prisma.associate.findUnique({
    where: { id },
    select: { id: true, _count: { select: { sessions: true } } },
  })
  if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (target._count.sessions > 0) {
    return NextResponse.json(
      { error: 'has_sessions', sessionCount: target._count.sessions },
      { status: 409 },
    )
  }

  try {
    await prisma.associate.delete({ where: { id } })
    return NextResponse.json({ ok: true, id })
  } catch (error) {
    console.error(
      '[/api/trainer/associates/[id]] DELETE failed:',
      (error as Error).message,
    )
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  }
}
