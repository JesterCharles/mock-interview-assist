import { NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma'
import { getCallerIdentity } from '@/lib/identity'
import { prisma } from '@/lib/prisma'
import type { KpiData } from '@/lib/trainer-types'

interface KpiRawRow {
  avg_readiness: number | null
  mocks_this_week: bigint | number
  at_risk_count: bigint | number
  top_gap_skill: string | null
  avg_variance: number | null
}

export async function GET(request: Request) {
  const caller = await getCallerIdentity()
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const cohortParam = url.searchParams.get('cohort')
  let cohortId: number | null = null
  if (cohortParam) {
    const parsed = Number.parseInt(cohortParam, 10)
    if (Number.isInteger(parsed)) {
      cohortId = parsed
    }
  }

  try {
    let rows: KpiRawRow[]

    if (cohortId !== null) {
      // Cohort-scoped query
      rows = await prisma.$queryRaw<KpiRawRow[]>(Prisma.sql`
        SELECT
          (
            COUNT(CASE WHEN a."readinessStatus" = 'ready' THEN 1 END)::float /
            NULLIF(COUNT(*), 0) * 100
          ) as avg_readiness,
          (
            SELECT COUNT(*)
            FROM "Session" s2
            JOIN "Associate" a2 ON a2.id = s2."associateId"
            WHERE a2."cohortId" = ${cohortId}
              AND s2."createdAt" >= NOW() - INTERVAL '7 days'
          ) as mocks_this_week,
          COUNT(CASE WHEN a."readinessStatus" = 'not_ready' THEN 1 END) as at_risk_count,
          (
            SELECT gs."skill"
            FROM "GapScore" gs
            JOIN "Associate" ga ON ga.id = gs."associateId"
            WHERE ga."cohortId" = ${cohortId}
            GROUP BY gs."skill"
            ORDER BY AVG(gs."weightedScore") ASC
            LIMIT 1
          ) as top_gap_skill,
          (
            SELECT AVG(s3."aiTrainerVariance")
            FROM "Session" s3
            JOIN "Associate" a3 ON a3.id = s3."associateId"
            WHERE a3."cohortId" = ${cohortId}
              AND s3."aiTrainerVariance" IS NOT NULL
          ) as avg_variance
        FROM "Associate" a
        WHERE a."cohortId" = ${cohortId}
      `)
    } else {
      // All-associates query
      rows = await prisma.$queryRaw<KpiRawRow[]>(Prisma.sql`
        SELECT
          (
            COUNT(CASE WHEN a."readinessStatus" = 'ready' THEN 1 END)::float /
            NULLIF(COUNT(*), 0) * 100
          ) as avg_readiness,
          (
            SELECT COUNT(*)
            FROM "Session" s2
            WHERE s2."createdAt" >= NOW() - INTERVAL '7 days'
          ) as mocks_this_week,
          COUNT(CASE WHEN a."readinessStatus" = 'not_ready' THEN 1 END) as at_risk_count,
          (
            SELECT gs."skill"
            FROM "GapScore" gs
            GROUP BY gs."skill"
            ORDER BY AVG(gs."weightedScore") ASC
            LIMIT 1
          ) as top_gap_skill,
          (
            SELECT AVG(s3."aiTrainerVariance")
            FROM "Session" s3
            WHERE s3."aiTrainerVariance" IS NOT NULL
          ) as avg_variance
        FROM "Associate" a
      `)
    }

    const row = rows[0]

    // CRITICAL: Convert bigint COUNT values to Number to avoid JSON serialization errors
    const kpiData: KpiData = {
      avgReadiness: row?.avg_readiness ?? null,
      mocksThisWeek: Number(row?.mocks_this_week ?? 0),
      atRiskCount: Number(row?.at_risk_count ?? 0),
      topGapSkill: row?.top_gap_skill ?? null,
      avgVariance: row?.avg_variance ?? null,
    }

    return NextResponse.json(kpiData)
  } catch (error) {
    console.error('[/api/trainer/kpis] Failed to fetch KPIs:', error)
    return NextResponse.json({ error: 'Failed to fetch KPI data' }, { status: 500 })
  }
}
