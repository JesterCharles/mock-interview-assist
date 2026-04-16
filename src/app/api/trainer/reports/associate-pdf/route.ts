import React from 'react'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { getCallerIdentity } from '@/lib/identity'
import { prisma } from '@/lib/prisma'
import { AssociateAnalyticsPdf } from '@/lib/pdf/AssociateAnalyticsPdf'
import type { GapScoreEntry, SessionSummary } from '@/lib/trainer-types'

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

  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'Missing required param: slug' }, { status: 400 })
  }

  try {
    // ── 1. Fetch associate ──────────────────────────────────────────────────
    const associate = await prisma.associate.findUnique({
      where: { slug },
      include: { cohort: true },
    })
    if (!associate) {
      return NextResponse.json({ error: 'Associate not found' }, { status: 404 })
    }

    // ── 2. Fetch gap scores + sessions in parallel ──────────────────────────
    const [rawGapScores, rawSessions] = await Promise.all([
      prisma.gapScore.findMany({
        where: { associate: { slug } },
        orderBy: { weightedScore: 'asc' },
      }),
      prisma.session.findMany({
        where: { associate: { slug } },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    // ── 3. Map to template types ────────────────────────────────────────────
    const gapScores: GapScoreEntry[] = rawGapScores.map((gs) => ({
      skill: gs.skill,
      topic: gs.topic ?? null,
      weightedScore: gs.weightedScore,
      sessionCount: gs.sessionCount,
    }))

    const sessions: SessionSummary[] = rawSessions.map((s) => ({
      id: s.id,
      date: s.date instanceof Date ? s.date.toISOString() : String(s.date),
      overallTechnicalScore: s.overallTechnicalScore ?? null,
      overallSoftSkillScore: s.overallSoftSkillScore ?? null,
      status: s.status ?? 'completed',
      assessments:
        s.assessments && typeof s.assessments === 'object' && !Array.isArray(s.assessments)
          ? (s.assessments as Record<string, { questionId: string; llmScore?: number; finalScore?: number }>)
          : {},
    }))

    // ── 4. Build per-skill sparklines from sessions ─────────────────────────
    // Group overall scores by skill derived from techMap stored in session
    const skillScoreMap = new Map<string, number[]>()
    for (const s of rawSessions) {
      // techMap: { [weekNum]: skillName } stored as JSON in session
      const techMap =
        s.techMap && typeof s.techMap === 'object' && !Array.isArray(s.techMap)
          ? (s.techMap as Record<string, string>)
          : {}
      const overallScore =
        s.overallTechnicalScore != null
          ? s.overallTechnicalScore
          : s.overallSoftSkillScore ?? 0
      // Each session contributes its overall score to every skill in its techMap
      const skills = Object.values(techMap)
      if (skills.length === 0) continue
      for (const skill of skills) {
        const existing = skillScoreMap.get(skill) ?? []
        existing.push(Number(overallScore))
        skillScoreMap.set(skill, existing)
      }
    }

    // Fall back to gap score skills if techMap-derived skills are empty
    if (skillScoreMap.size === 0) {
      const uniqueSkills = [...new Set(gapScores.map((g) => g.skill))]
      for (const skill of uniqueSkills) {
        skillScoreMap.set(skill, [])
      }
    }

    const skillSparklines = Array.from(skillScoreMap.entries()).map(([skill, scores]) => ({
      skill,
      scores,
    }))

    // ── 5. Render PDF ───────────────────────────────────────────────────────
    const generatedDate = new Date().toISOString().split('T')[0]
    const buffer = await renderToBuffer(
      React.createElement(AssociateAnalyticsPdf, {
        associate: {
          displayName: associate.displayName ?? associate.slug,
          slug: associate.slug,
          readinessStatus: validatedReadinessStatus(associate.readinessStatus),
          readinessScore: associate.readinessScore ?? null,
          recommendedArea: associate.recommendedArea ?? null,
          cohortName: associate.cohort?.name ?? null,
        },
        generatedDate,
        gapScores,
        sessions,
        skillSparklines,
      })
    )

    const filename = `nlm-${slug}-${generatedDate}.pdf`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[/api/trainer/reports/associate-pdf] Failed to generate PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
