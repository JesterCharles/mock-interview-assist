import { redirect } from 'next/navigation'
import { isAuthenticatedSession } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import CohortsClient, { type CohortWithCounts } from './CohortsClient'

export const dynamic = 'force-dynamic'

export default async function CohortsPage() {
  const authed = await isAuthenticatedSession()
  if (!authed) {
    redirect('/login')
  }

  // Fetch cohorts + readiness counts per cohort. Readiness counts are computed
  // from the Associate.readinessStatus column maintained by readinessService.
  const rows = await prisma.cohort.findMany({
    orderBy: { startDate: 'desc' },
    include: {
      _count: { select: { associates: true } },
      associates: {
        select: { readinessStatus: true },
      },
    },
  })

  const initialCohorts: CohortWithCounts[] = rows.map((c) => {
    let ready = 0
    let improving = 0
    let notReady = 0
    for (const a of c.associates) {
      if (a.readinessStatus === 'ready') ready += 1
      else if (a.readinessStatus === 'improving') improving += 1
      else notReady += 1
    }
    return {
      id: c.id,
      name: c.name,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate ? c.endDate.toISOString() : null,
      description: c.description,
      associateCount: c._count.associates,
      readyCount: ready,
      improvingCount: improving,
      notReadyCount: notReady,
    }
  })

  return <CohortsClient initialCohorts={initialCohorts} />
}
