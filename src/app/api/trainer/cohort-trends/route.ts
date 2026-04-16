import { NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma'
import { getCallerIdentity } from '@/lib/identity'
import { prisma } from '@/lib/prisma'
import type { CohortTrendPoint } from '@/lib/trainer-types'

interface TrendRawRow {
  week_start: Date | string
  avg_score: number
  session_count: bigint | number
}

export async function GET(request: Request) {
  const caller = await getCallerIdentity()
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const cohortParam = url.searchParams.get('cohort')

  // No cohort param — return empty array (no meaningful global trend)
  if (!cohortParam) {
    return NextResponse.json([])
  }

  const cohortId = Number.parseInt(cohortParam, 10)
  if (!Number.isInteger(cohortId)) {
    return NextResponse.json([])
  }

  try {
    // Weekly buckets using DATE_TRUNC on createdAt (not a date string field — per D-22)
    // Returns up to 12 weeks of data in ascending order
    const rows = await prisma.$queryRaw<TrendRawRow[]>(Prisma.sql`
      SELECT
        DATE_TRUNC('week', s."createdAt") as week_start,
        AVG((COALESCE(s."overallTechnicalScore", 0) + COALESCE(s."overallSoftSkillScore", 0)) / 2.0) as avg_score,
        COUNT(*)::int as session_count
      FROM "Session" s
      JOIN "Associate" a ON a.id = s."associateId"
      WHERE a."cohortId" = ${cohortId}
        AND s."createdAt" >= (CURRENT_DATE - INTERVAL '12 weeks')
        AND s.status = 'completed'
      GROUP BY DATE_TRUNC('week', s."createdAt")
      ORDER BY week_start ASC
    `)

    const result: CohortTrendPoint[] = rows.map((row, index) => ({
      weekLabel: `W${index + 1}`,
      weekStart: new Date(row.week_start).toISOString(),
      avgScore: Number(row.avg_score),
      sessionCount: Number(row.session_count),
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('[/api/trainer/cohort-trends] Failed to fetch cohort trends:', error)
    return NextResponse.json({ error: 'Failed to fetch cohort trend data' }, { status: 500 })
  }
}
