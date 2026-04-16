import { NextResponse } from 'next/server'
import { getCallerIdentity } from '@/lib/identity'
import { prisma } from '@/lib/prisma'
import { CohortSummary, RosterAssociate, RosterResponse } from '@/lib/trainer-types'

// Validate readinessStatus from DB before casting to union type (WR-03)
const VALID_READINESS_STATUSES = new Set(['ready', 'improving', 'not_ready'])
function validatedReadinessStatus(raw: unknown): 'ready' | 'improving' | 'not_ready' {
  return typeof raw === 'string' && VALID_READINESS_STATUSES.has(raw)
    ? (raw as 'ready' | 'improving' | 'not_ready')
    : 'not_ready'
}

export async function GET(request: Request) {
  const caller = await getCallerIdentity()
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse OPTIONAL query params (Plan 12-01).
  // - cohortId: filter roster to a single cohort. "all" or empty is treated as no filter.
  // - includeSummary=true: opt-in wrapped response `{ associates, summary }`.
  //   Only honored when a cohortId is actually scoped — summary on the full
  //   roster is noisy and not part of the cohort dashboard UX (D-04).
  const url = new URL(request.url)
  const cohortIdParam = url.searchParams.get('cohortId')
  const includeSummary = url.searchParams.get('includeSummary') === 'true'
  // Cohort FK is Int in the Prisma schema — parse and reject non-numeric values
  // (including "all" and "") to the unfiltered path.
  let cohortId: number | null = null
  if (cohortIdParam && cohortIdParam !== 'all' && cohortIdParam !== '') {
    const parsed = Number.parseInt(cohortIdParam, 10)
    if (Number.isInteger(parsed)) {
      cohortId = parsed
    }
  }

  try {
    // `where: undefined` preserves v1.0 behavior — associates with cohortId = null
    // continue to appear in the default (unfiltered) roster (D-02).
    const where = cohortId ? { cohortId } : undefined

    const associates = await prisma.associate.findMany({
      where,
      include: {
        _count: {
          select: { sessions: true },
        },
        sessions: {
          orderBy: { date: 'desc' },
          take: 1,
          select: { date: true },
        },
      },
      orderBy: { readinessStatus: 'asc' },
    })

    const rosterData: RosterAssociate[] = associates.map((a) => ({
      slug: a.slug,
      displayName: a.displayName ?? a.slug,
      // Pre-computed values from Associate model — DASH-05 (no gap recomputation on load)
      readinessStatus: validatedReadinessStatus(a.readinessStatus),
      readinessScore: null, // score stored as part of readiness computation — null until computed
      recommendedArea: a.recommendedArea ?? null,
      sessionCount: a._count.sessions,
      lastSessionDate: a.sessions[0]?.date ?? null,
    }))

    // Wrapped response is OPT-IN and only when cohort-scoped. All other paths
    // return a raw array to preserve the v1.0 contract consumed by
    // /trainer (page.tsx) and /dashboard (associate typeahead).
    if (includeSummary && cohortId) {
      const summary: CohortSummary = rosterData.reduce<CohortSummary>(
        (acc, a) => {
          if (a.readinessStatus === 'ready') acc.ready += 1
          else if (a.readinessStatus === 'improving') acc.improving += 1
          else acc.notReady += 1
          return acc
        },
        { ready: 0, improving: 0, notReady: 0 },
      )
      const payload: RosterResponse = { associates: rosterData, summary }
      return NextResponse.json(payload)
    }

    return NextResponse.json(rosterData)
  } catch (error) {
    console.error('[/api/trainer] Failed to fetch roster:', error)
    return NextResponse.json({ error: 'Failed to fetch roster' }, { status: 500 })
  }
}
