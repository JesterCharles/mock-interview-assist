import { redirect } from 'next/navigation'
import { isAuthenticatedSession } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import type { CohortDTO } from '@/lib/cohort-types'
import CohortsClient from './CohortsClient'

export const dynamic = 'force-dynamic'

export default async function CohortsPage() {
  const authed = await isAuthenticatedSession()
  if (!authed) {
    redirect('/login')
  }

  const rows = await prisma.cohort.findMany({
    orderBy: { startDate: 'desc' },
    include: { _count: { select: { associates: true } } },
  })

  const initialCohorts: CohortDTO[] = rows.map((c) => ({
    id: c.id,
    name: c.name,
    startDate: c.startDate.toISOString(),
    endDate: c.endDate ? c.endDate.toISOString() : null,
    description: c.description,
    associateCount: c._count.associates,
  }))

  return <CohortsClient initialCohorts={initialCohorts} />
}
