import React from 'react'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { Prisma } from '@/generated/prisma'
import { getCallerIdentity } from '@/lib/identity'
import { prisma } from '@/lib/prisma'
import { CohortAnalyticsPdf } from '@/lib/pdf/CohortAnalyticsPdf'
import type { KpiData, GapAnalysisRow, RosterAssociate } from '@/lib/trainer-types'

// ─── Raw query row types ───────────────────────────────────────────────────────

interface KpiRawRow {
  avg_readiness: number | null
  mocks_this_week: bigint | number
  at_risk_count: bigint | number
  top_gap_skill: string | null
  avg_variance: number | null
}

interface AggregationRawRow {
  skill: string
  topic: string
  associates_affected: bigint | number
  avg_gap_score: number
}

interface RosterSessionRow {
  associateId: number
  slug: string
  display_name: string | null
  readiness_status: string | null
  readiness_score: number | null
  recommended_area: string | null
  session_count: bigint | number
  last_session_date: Date | string | null
  overall_score: number
  rn: bigint | number
}

interface GapTopRow {
  associateId: number
  skill: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function computeTrendWord(scores: number[]): 'improving' | 'declining' | 'steady' | 'new' {
  if (scores.length < 3) return 'new'
  const slope = computeSlope(scores)
  if (slope > 0) return 'improving'
  if (slope < 0) return 'declining'
  return 'steady'
}

const VALID_READINESS_STATUSES = new Set(['ready', 'improving', 'not_ready'])
function validatedReadinessStatus(raw: unknown): 'ready' | 'improving' | 'not_ready' {
  return typeof raw === 'string' && VALID_READINESS_STATUSES.has(raw)
    ? (raw as 'ready' | 'improving' | 'not_ready')
    : 'not_ready'
}

// ─── Route handler ────────────────────────────────────────────────────────────

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
    // ── 1. Cohort name ─────────────────────────────────────────────────────
    let cohortName = 'All Associates'
    if (cohortId !== null) {
      const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } })
      if (cohort) cohortName = cohort.name
    }

    // ── 2. Parallel DB queries ──────────────────────────────────────────────
    const [kpiRows, gapRows, sessionRows] = await Promise.all([
      // KPI
      cohortId !== null
        ? prisma.$queryRaw<KpiRawRow[]>(Prisma.sql`
            SELECT
              (COUNT(CASE WHEN a."readinessStatus" = 'ready' THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100) as avg_readiness,
              (SELECT COUNT(*) FROM "Session" s2 JOIN "Associate" a2 ON a2.id = s2."associateId" WHERE a2."cohortId" = ${cohortId} AND s2."createdAt" >= NOW() - INTERVAL '7 days') as mocks_this_week,
              COUNT(CASE WHEN a."readinessStatus" = 'not_ready' THEN 1 END) as at_risk_count,
              (SELECT gs."skill" FROM "GapScore" gs JOIN "Associate" ga ON ga.id = gs."associateId" WHERE ga."cohortId" = ${cohortId} GROUP BY gs."skill" ORDER BY AVG(gs."weightedScore") ASC LIMIT 1) as top_gap_skill,
              (SELECT AVG(s3."aiTrainerVariance") FROM "Session" s3 JOIN "Associate" a3 ON a3.id = s3."associateId" WHERE a3."cohortId" = ${cohortId} AND s3."aiTrainerVariance" IS NOT NULL) as avg_variance
            FROM "Associate" a WHERE a."cohortId" = ${cohortId}
          `)
        : prisma.$queryRaw<KpiRawRow[]>(Prisma.sql`
            SELECT
              (COUNT(CASE WHEN a."readinessStatus" = 'ready' THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100) as avg_readiness,
              (SELECT COUNT(*) FROM "Session" s2 WHERE s2."createdAt" >= NOW() - INTERVAL '7 days') as mocks_this_week,
              COUNT(CASE WHEN a."readinessStatus" = 'not_ready' THEN 1 END) as at_risk_count,
              (SELECT gs."skill" FROM "GapScore" gs GROUP BY gs."skill" ORDER BY AVG(gs."weightedScore") ASC LIMIT 1) as top_gap_skill,
              (SELECT AVG(s3."aiTrainerVariance") FROM "Session" s3 WHERE s3."aiTrainerVariance" IS NOT NULL) as avg_variance
            FROM "Associate" a
          `),

      // Gap aggregation
      cohortId !== null
        ? prisma.$queryRaw<AggregationRawRow[]>(Prisma.sql`
            SELECT gs.skill, gs.topic,
              COUNT(DISTINCT gs."associateId") as associates_affected,
              AVG(gs."weightedScore") as avg_gap_score
            FROM "GapScore" gs
            JOIN "Associate" a ON a.id = gs."associateId"
            WHERE gs.topic != '' AND a."cohortId" = ${cohortId}
            GROUP BY gs.skill, gs.topic
            ORDER BY associates_affected DESC, avg_gap_score ASC
          `)
        : prisma.$queryRaw<AggregationRawRow[]>(Prisma.sql`
            SELECT gs.skill, gs.topic,
              COUNT(DISTINCT gs."associateId") as associates_affected,
              AVG(gs."weightedScore") as avg_gap_score
            FROM "GapScore" gs
            WHERE gs.topic != ''
            GROUP BY gs.skill, gs.topic
            ORDER BY associates_affected DESC, avg_gap_score ASC
          `),

      // Roster + sparkline sessions (top 6 per associate, windowed)
      cohortId !== null
        ? prisma.$queryRaw<RosterSessionRow[]>(Prisma.sql`
            SELECT
              a.id as "associateId",
              a.slug,
              a."displayName" as display_name,
              a."readinessStatus" as readiness_status,
              a."readinessScore" as readiness_score,
              a."recommendedArea" as recommended_area,
              (SELECT COUNT(*) FROM "Session" sc WHERE sc."associateId" = a.id) as session_count,
              (SELECT MAX(sc2."createdAt") FROM "Session" sc2 WHERE sc2."associateId" = a.id) as last_session_date,
              COALESCE(s."overallTechnicalScore", 0) as overall_score,
              ROW_NUMBER() OVER (PARTITION BY a.id ORDER BY s."createdAt" DESC) as rn
            FROM "Associate" a
            LEFT JOIN "Session" s ON s."associateId" = a.id AND s.status = 'completed'
            WHERE a."cohortId" = ${cohortId}
          `)
        : prisma.$queryRaw<RosterSessionRow[]>(Prisma.sql`
            SELECT
              a.id as "associateId",
              a.slug,
              a."displayName" as display_name,
              a."readinessStatus" as readiness_status,
              a."readinessScore" as readiness_score,
              a."recommendedArea" as recommended_area,
              (SELECT COUNT(*) FROM "Session" sc WHERE sc."associateId" = a.id) as session_count,
              (SELECT MAX(sc2."createdAt") FROM "Session" sc2 WHERE sc2."associateId" = a.id) as last_session_date,
              COALESCE(s."overallTechnicalScore", 0) as overall_score,
              ROW_NUMBER() OVER (PARTITION BY a.id ORDER BY s."createdAt" DESC) as rn
            FROM "Associate" a
            LEFT JOIN "Session" s ON s."associateId" = a.id AND s.status = 'completed'
          `),
    ])

    // ── 3. Build KPI ────────────────────────────────────────────────────────
    const kpiRow = kpiRows[0]
    const kpi: KpiData = {
      avgReadiness: kpiRow?.avg_readiness ?? null,
      mocksThisWeek: Number(kpiRow?.mocks_this_week ?? 0),
      atRiskCount: Number(kpiRow?.at_risk_count ?? 0),
      topGapSkill: kpiRow?.top_gap_skill ?? null,
      avgVariance: kpiRow?.avg_variance ?? null,
    }

    // ── 4. Build gap rows ───────────────────────────────────────────────────
    const gaps: GapAnalysisRow[] = gapRows.map((row) => ({
      skill: row.skill,
      topic: row.topic,
      associatesAffected: Number(row.associates_affected),
      avgGapScore: row.avg_gap_score,
    }))

    // ── 5. Build roster from session rows ───────────────────────────────────
    // Filter to rn <= 6 (top 6 sessions per associate)
    const filtered = sessionRows.filter((r) => Number(r.rn) <= 6)

    // Group sessions by associate — collect scores in DESC order then reverse to chronological
    const sessionsByAssociate = new Map<number, RosterSessionRow[]>()
    for (const row of filtered) {
      const existing = sessionsByAssociate.get(row.associateId) ?? []
      existing.push(row)
      sessionsByAssociate.set(row.associateId, existing)
    }

    // Top gap per associate: build from gap rows if available, else query
    const associateIds = Array.from(sessionsByAssociate.keys())
    let topGapByAssociate = new Map<number, string>()
    if (associateIds.length > 0) {
      const idList = associateIds.join(',')
      const gapTopRows = await prisma.$queryRaw<GapTopRow[]>(Prisma.sql`
        SELECT DISTINCT ON (gs."associateId") gs."associateId", gs."skill"
        FROM "GapScore" gs
        WHERE gs."associateId" IN (${Prisma.raw(idList)})
        ORDER BY gs."associateId", gs."weightedScore" ASC
      `)
      for (const row of gapTopRows) {
        topGapByAssociate.set(row.associateId, row.skill)
      }
    }

    // Deduplicate associates (a LEFT JOIN can return the same associate multiple times)
    const seenAssociates = new Map<number, RosterAssociate & { trendWord: string; topGap: string | null; sparklineScores: number[] }>()

    for (const [associateId, rows] of sessionsByAssociate.entries()) {
      if (seenAssociates.has(associateId)) continue
      const firstRow = rows[0]
      // rows are DESC order (newest first), reverse to chronological
      const chronological = [...rows].reverse()
      const sparklineScores = chronological.map((r) => Number(r.overall_score))
      const trendWord = computeTrendWord(sparklineScores)

      seenAssociates.set(associateId, {
        slug: firstRow.slug,
        displayName: firstRow.display_name ?? firstRow.slug,
        readinessStatus: validatedReadinessStatus(firstRow.readiness_status),
        readinessScore: firstRow.readiness_score ?? null,
        recommendedArea: firstRow.recommended_area ?? null,
        sessionCount: Number(firstRow.session_count ?? 0),
        lastSessionDate: firstRow.last_session_date
          ? new Date(firstRow.last_session_date).toISOString()
          : null,
        trendWord,
        topGap: topGapByAssociate.get(associateId) ?? null,
        sparklineScores,
      })
    }

    // Also include associates with no sessions (LEFT JOIN produces NULL session rows with rn=1)
    // These appear in sessionRows with rn=1 and overall_score=0 from LEFT JOIN; deduplicate
    const allAssociateIds = new Set<number>()
    for (const row of sessionRows) {
      if (!allAssociateIds.has(row.associateId)) {
        allAssociateIds.add(row.associateId)
        if (!seenAssociates.has(row.associateId)) {
          seenAssociates.set(row.associateId, {
            slug: row.slug,
            displayName: row.display_name ?? row.slug,
            readinessStatus: validatedReadinessStatus(row.readiness_status),
            readinessScore: row.readiness_score ?? null,
            recommendedArea: row.recommended_area ?? null,
            sessionCount: Number(row.session_count ?? 0),
            lastSessionDate: row.last_session_date
              ? new Date(row.last_session_date).toISOString()
              : null,
            trendWord: 'new',
            topGap: topGapByAssociate.get(row.associateId) ?? null,
            sparklineScores: [],
          })
        }
      }
    }

    const roster = Array.from(seenAssociates.values())

    // ── 6. Render PDF ───────────────────────────────────────────────────────
    const generatedDate = new Date().toISOString().split('T')[0]
    const buffer = await renderToBuffer(
      React.createElement(CohortAnalyticsPdf, {
        cohortName,
        generatedDate,
        kpi,
        gaps,
        roster,
      })
    )

    const safeName = cohortName.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
    const filename = `nlm-cohort-${safeName}-${generatedDate}.pdf`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[/api/trainer/reports/cohort-pdf] Failed to generate PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
