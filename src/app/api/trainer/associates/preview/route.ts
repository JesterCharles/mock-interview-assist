import { NextRequest, NextResponse } from 'next/server'
import { getCallerIdentity } from '@/lib/identity'
import { prisma } from '@/lib/prisma'
import type { BackfillPreview } from '@/lib/trainer-types'

// GET /api/trainer/associates/preview — dry-run counts for pre-cutover sanity
// before Phase 18 email-auth enforcement. Pure math over Associate rows; no writes.
export async function GET(request: NextRequest) {
  const caller = await getCallerIdentity()
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const all = await prisma.associate.findMany({
      select: { email: true, _count: { select: { sessions: true } } },
    })
    const total = all.length
    const withEmail = all.filter((a) => a.email !== null).length
    const withoutEmail = total - withEmail
    const slugOnlyZeroSessions = all.filter(
      (a) => a.email === null && a._count.sessions === 0,
    ).length
    const payload: BackfillPreview = {
      total,
      withEmail,
      withoutEmail,
      slugOnlyZeroSessions,
      // Current DELETE rule refuses to drop associates with sessions, so
      // orphaned-sessions count is structurally always 0. Reserved for future
      // rule changes so the preview contract stays stable.
      sessionsOrphanedIfAllDeleted: 0,
    }
    return NextResponse.json(payload)
  } catch (error) {
    console.error('[/api/trainer/associates/preview] GET failed:', (error as Error).message)
    return NextResponse.json({ error: 'Failed to compute preview' }, { status: 500 })
  }
}
