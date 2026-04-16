import { NextRequest, NextResponse } from 'next/server'
import { getCallerIdentity } from '@/lib/identity'
import { prisma } from '@/lib/prisma'
import type { AssociateBackfillRow } from '@/lib/trainer-types'

// GET /api/trainer/associates — trainer-only list for the BACKFILL-02 admin UI.
// Returns AssociateBackfillRow[] ordered by createdAt asc so the admin can
// walk oldest-first when filling in emails. sessionCount drives the
// delete-safety UI on Plan 17-03.
export async function GET(request: NextRequest) {
  const caller = await getCallerIdentity()
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const rows = await prisma.associate.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { sessions: true } },
        cohort: { select: { id: true, name: true } },
      },
    })
    const payload: AssociateBackfillRow[] = rows.map((a) => ({
      id: a.id,
      slug: a.slug,
      displayName: a.displayName,
      email: a.email,
      sessionCount: a._count.sessions,
      cohortId: a.cohortId,
      cohortName: a.cohort?.name ?? null,
      createdAt: a.createdAt.toISOString(),
      lastInvitedAt: a.lastInvitedAt?.toISOString() ?? null,
    }))
    return NextResponse.json(payload)
  } catch (error) {
    // PII guard: never log raw email values — only the Error.message string.
    console.error('[/api/trainer/associates] GET failed:', (error as Error).message)
    return NextResponse.json({ error: 'Failed to fetch associates' }, { status: 500 })
  }
}
