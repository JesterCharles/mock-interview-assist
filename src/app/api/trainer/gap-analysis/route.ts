import { NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma'
import { getCallerIdentity } from '@/lib/identity'
import { prisma } from '@/lib/prisma'
import type { GapAnalysisRow, GapDrillThroughRow } from '@/lib/trainer-types'

interface AggregationRawRow {
  skill: string
  topic: string
  associates_affected: bigint | number
  avg_gap_score: number
}

interface DrillThroughRawRow {
  slug: string
  display_name: string | null
  gap_score: number
  last_session: Date | string | null
}

export async function GET(request: Request) {
  const caller = await getCallerIdentity()
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const skillParam = url.searchParams.get('skill')
  const topicParam = url.searchParams.get('topic')
  const cohortParam = url.searchParams.get('cohort')

  // Parse optional cohort id
  let cohortId: number | null = null
  if (cohortParam) {
    const parsed = Number.parseInt(cohortParam, 10)
    if (Number.isInteger(parsed)) {
      cohortId = parsed
    }
  }

  // Drill-through mode: skill AND topic must both be present (or neither)
  const hasDrill = skillParam !== null || topicParam !== null
  if (hasDrill && (!skillParam || !topicParam)) {
    return NextResponse.json(
      { error: 'Both skill and topic params required for drill-through' },
      { status: 400 }
    )
  }

  try {
    // --- Drill-through mode ---
    if (skillParam && topicParam) {
      let rows: DrillThroughRawRow[]

      if (cohortId !== null) {
        rows = await prisma.$queryRaw<DrillThroughRawRow[]>(Prisma.sql`
          SELECT a.slug, a."displayName" as display_name,
            gs."weightedScore" as gap_score,
            (SELECT MAX(s."createdAt") FROM "Session" s WHERE s."associateId" = a.id) as last_session
          FROM "GapScore" gs
          JOIN "Associate" a ON a.id = gs."associateId"
          WHERE gs.skill = ${skillParam}
            AND gs.topic = ${topicParam}
            AND a."cohortId" = ${cohortId}
          ORDER BY gs."weightedScore" ASC
        `)
      } else {
        rows = await prisma.$queryRaw<DrillThroughRawRow[]>(Prisma.sql`
          SELECT a.slug, a."displayName" as display_name,
            gs."weightedScore" as gap_score,
            (SELECT MAX(s."createdAt") FROM "Session" s WHERE s."associateId" = a.id) as last_session
          FROM "GapScore" gs
          JOIN "Associate" a ON a.id = gs."associateId"
          WHERE gs.skill = ${skillParam}
            AND gs.topic = ${topicParam}
          ORDER BY gs."weightedScore" ASC
        `)
      }

      const result: GapDrillThroughRow[] = rows.map((row) => ({
        slug: row.slug,
        displayName: row.display_name ?? row.slug,
        gapScore: row.gap_score,
        lastSessionDate:
          row.last_session instanceof Date
            ? row.last_session.toISOString()
            : typeof row.last_session === 'string'
            ? row.last_session
            : null,
      }))

      return NextResponse.json(result)
    }

    // --- Aggregation mode ---
    let rows: AggregationRawRow[]

    if (cohortId !== null) {
      rows = await prisma.$queryRaw<AggregationRawRow[]>(Prisma.sql`
        SELECT gs.skill, gs.topic,
          COUNT(DISTINCT gs."associateId") as associates_affected,
          AVG(gs."weightedScore") as avg_gap_score
        FROM "GapScore" gs
        JOIN "Associate" a ON a.id = gs."associateId"
        WHERE gs.topic != ''
          AND a."cohortId" = ${cohortId}
        GROUP BY gs.skill, gs.topic
        ORDER BY associates_affected DESC, avg_gap_score ASC
      `)
    } else {
      rows = await prisma.$queryRaw<AggregationRawRow[]>(Prisma.sql`
        SELECT gs.skill, gs.topic,
          COUNT(DISTINCT gs."associateId") as associates_affected,
          AVG(gs."weightedScore") as avg_gap_score
        FROM "GapScore" gs
        WHERE gs.topic != ''
        GROUP BY gs.skill, gs.topic
        ORDER BY associates_affected DESC, avg_gap_score ASC
      `)
    }

    const result: GapAnalysisRow[] = rows.map((row) => ({
      skill: row.skill,
      topic: row.topic,
      // CRITICAL: BigInt COUNT → Number to avoid JSON serialization errors
      associatesAffected: Number(row.associates_affected),
      avgGapScore: row.avg_gap_score,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('[/api/trainer/gap-analysis] Failed to fetch gap analysis:', error)
    return NextResponse.json({ error: 'Failed to fetch gap analysis data' }, { status: 500 })
  }
}
