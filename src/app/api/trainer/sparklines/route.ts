import { NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma'
import { getCallerIdentity } from '@/lib/identity'
import { prisma } from '@/lib/prisma'
import type { RosterSparklineData, SparklinePoint } from '@/lib/trainer-types'

interface SessionRow {
  associateId: number
  slug: string
  overall_score: number
  createdAt: Date | string
  rn: bigint | number
}

interface GapRow {
  associateId: number
  skill: string
}

/**
 * Linear regression slope over last 3 scores.
 * Returns the slope value (positive = improving, negative = declining, 0 = steady).
 */
function computeSlope(scores: number[]): number {
  const n = scores.length
  if (n < 2) return 0

  const last3 = scores.slice(-3)
  const m = last3.length
  const xBar = (m - 1) / 2
  const yBar = last3.reduce((s, v) => s + v, 0) / m

  let num = 0
  let den = 0
  for (let i = 0; i < m; i++) {
    num += (i - xBar) * (last3[i] - yBar)
    den += (i - xBar) ** 2
  }

  return den === 0 ? 0 : num / den
}

function computeTrendWord(
  scores: number[],
): 'improving' | 'declining' | 'steady' | 'new' {
  if (scores.length < 3) return 'new'
  const slope = computeSlope(scores)
  if (slope > 0) return 'improving'
  if (slope < 0) return 'declining'
  return 'steady'
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
    // Windowed query: ROW_NUMBER() OVER PARTITION BY associateId ORDER BY createdAt DESC
    // Returns top 6 sessions per associate in DESC order
    let sessionRows: SessionRow[]

    if (cohortId !== null) {
      sessionRows = await prisma.$queryRaw<SessionRow[]>(Prisma.sql`
        SELECT
          s."associateId",
          a.slug,
          (COALESCE(s."overallTechnicalScore", 0) + COALESCE(s."overallSoftSkillScore", 0)) / 2.0 as overall_score,
          s."createdAt",
          ROW_NUMBER() OVER (PARTITION BY s."associateId" ORDER BY s."createdAt" DESC) as rn
        FROM "Session" s
        JOIN "Associate" a ON a.id = s."associateId"
        WHERE s.status = 'completed'
          AND a."cohortId" = ${cohortId}
      `)
    } else {
      sessionRows = await prisma.$queryRaw<SessionRow[]>(Prisma.sql`
        SELECT
          s."associateId",
          a.slug,
          (COALESCE(s."overallTechnicalScore", 0) + COALESCE(s."overallSoftSkillScore", 0)) / 2.0 as overall_score,
          s."createdAt",
          ROW_NUMBER() OVER (PARTITION BY s."associateId" ORDER BY s."createdAt" DESC) as rn
        FROM "Session" s
        JOIN "Associate" a ON a.id = s."associateId"
        WHERE s.status = 'completed'
      `)
    }

    // Filter to rn <= 6 in application layer
    const filteredRows = sessionRows.filter((r) => Number(r.rn) <= 6)

    // Group by associateId
    const byAssociate = new Map<number, SessionRow[]>()
    for (const row of filteredRows) {
      const existing = byAssociate.get(row.associateId) ?? []
      existing.push(row)
      byAssociate.set(row.associateId, existing)
    }

    // Query top gap per associate: lowest weightedScore GapScore skill
    let gapRows: GapRow[] = []
    if (byAssociate.size > 0) {
      const associateIds = Array.from(byAssociate.keys())
      // Build parameterized IN clause
      const idList = associateIds.join(',')
      gapRows = await prisma.$queryRaw<GapRow[]>(Prisma.sql`
        SELECT DISTINCT ON (gs."associateId") gs."associateId", gs."skill"
        FROM "GapScore" gs
        WHERE gs."associateId" IN (${Prisma.raw(idList)})
        ORDER BY gs."associateId", gs."weightedScore" ASC
      `)
    }

    const topGapByAssociate = new Map<number, string>()
    for (const row of gapRows) {
      topGapByAssociate.set(row.associateId, row.skill)
    }

    // Build response
    const result: RosterSparklineData[] = []

    for (const [associateId, rows] of byAssociate.entries()) {
      const slug = rows[0].slug

      // rows are in DESC order (newest first) — reverse to chronological (oldest first)
      const chronological = [...rows].reverse()

      const sparkline: SparklinePoint[] = chronological.map((r) => ({
        score: Number(r.overall_score),
      }))

      const scores = sparkline.map((p) => p.score)
      const trendWord = computeTrendWord(scores)

      const lastMockDate = rows[0]?.createdAt
        ? new Date(rows[0].createdAt).toISOString()
        : null

      result.push({
        associateId,
        slug,
        sparkline,
        trendWord,
        topGap: topGapByAssociate.get(associateId) ?? null,
        lastMockDate,
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[/api/trainer/sparklines] Failed to fetch sparklines:', error)
    return NextResponse.json({ error: 'Failed to fetch sparkline data' }, { status: 500 })
  }
}
