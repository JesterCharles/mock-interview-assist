import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { RosterAssociate } from '@/lib/trainer-types'

export async function GET() {
  // Auth check — validate nlm_session cookie before returning data (T-06-01)
  const cookieStore = await cookies()
  const session = cookieStore.get('nlm_session')
  if (!session || session.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const associates = await prisma.associate.findMany({
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
      readinessStatus: (a.readinessStatus as 'ready' | 'improving' | 'not_ready') ?? 'not_ready',
      readinessScore: null, // score stored as part of readiness computation — null until computed
      recommendedArea: a.recommendedArea ?? null,
      sessionCount: a._count.sessions,
      lastSessionDate: a.sessions[0]?.date ?? null,
    }))

    return NextResponse.json(rosterData)
  } catch (error) {
    console.error('[/api/trainer] Failed to fetch roster:', error)
    return NextResponse.json({ error: 'Failed to fetch roster' }, { status: 500 })
  }
}
