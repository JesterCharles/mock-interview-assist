import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isAuthenticatedSession } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { AssociateDetail, SessionSummary, GapScoreEntry } from '@/lib/trainer-types'

// Validate readinessStatus from DB before casting to union type (WR-03)
const VALID_READINESS_STATUSES = new Set(['ready', 'improving', 'not_ready'])
function validatedReadinessStatus(raw: unknown): 'ready' | 'improving' | 'not_ready' {
  return typeof raw === 'string' && VALID_READINESS_STATUSES.has(raw)
    ? (raw as 'ready' | 'improving' | 'not_ready')
    : 'not_ready'
}

// Slug validation — alphanumeric + hyphens only (T-06-04 defense-in-depth)
const SLUG_RE = /^[a-z0-9-]+$/

// Plan 11-03: PATCH payload schema. cohortId is required (either positive int or null).
const PatchBodySchema = z.object({
  cohortId: z.number().int().positive().nullable(),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Auth check first — prevent slug probing by unauthenticated users (CR-04)
  if (!(await isAuthenticatedSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params

  // Input validation — reject invalid slugs before querying DB (T-06-04)
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  }

  try {
    const associate = await prisma.associate.findUnique({
      where: { slug },
      include: {
        cohort: { select: { id: true, name: true } },
        sessions: {
          orderBy: { date: 'desc' },
          take: 10,
          select: {
            id: true,
            date: true,
            overallTechnicalScore: true,
            overallSoftSkillScore: true,
            status: true,
            assessments: true,
          },
        },
        gapScores: {
          orderBy: [{ skill: 'asc' }, { weightedScore: 'asc' }],
        },
        _count: { select: { sessions: true } },
      },
    })

    if (!associate) {
      return NextResponse.json({ error: 'Associate not found' }, { status: 404 })
    }

    // Map sessions — serialize assessments JSON to simplified SessionSummary shape
    const sessions: SessionSummary[] = associate.sessions.map((s) => {
      // assessments is stored as JSON — cast and simplify to { questionId, llmScore, finalScore }
      const rawAssessments = (s.assessments as Record<string, {
        questionId?: string;
        llmScore?: number;
        finalScore?: number;
        [key: string]: unknown;
      }>) ?? {}

      const assessments: SessionSummary['assessments'] = {}
      for (const [key, val] of Object.entries(rawAssessments)) {
        assessments[key] = {
          questionId: val.questionId ?? key,
          llmScore: typeof val.llmScore === 'number' ? val.llmScore : undefined,
          finalScore: typeof val.finalScore === 'number' ? val.finalScore : undefined,
        }
      }

      return {
        id: s.id,
        date: s.date,
        overallTechnicalScore: s.overallTechnicalScore ?? null,
        overallSoftSkillScore: s.overallSoftSkillScore ?? null,
        status: s.status,
        assessments,
      }
    })

    // Map gap scores
    const gapScores: GapScoreEntry[] = associate.gapScores.map((g) => ({
      skill: g.skill,
      topic: g.topic === '' ? null : g.topic,
      weightedScore: g.weightedScore,
      sessionCount: g.sessionCount,
    }))

    const detail: AssociateDetail = {
      id: associate.id,
      slug: associate.slug,
      displayName: associate.displayName ?? associate.slug,
      readinessStatus: validatedReadinessStatus(associate.readinessStatus),
      readinessScore: null, // numeric score computed from GapScore aggregation — null until computed
      recommendedArea: associate.recommendedArea ?? null,
      sessionCount: associate._count.sessions,
      lastSessionDate: sessions[0]?.date ?? null,
      cohortId: associate.cohortId ?? null,
      cohortName: associate.cohort?.name ?? null,
      sessions,
      gapScores,
    }

    return NextResponse.json(detail)
  } catch (error) {
    console.error('[/api/trainer/[slug]] Failed to fetch associate detail:', error)
    return NextResponse.json({ error: 'Failed to fetch associate detail' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await isAuthenticatedSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = PatchBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const { cohortId } = parsed.data

  try {
    const updated = await prisma.associate.update({
      where: { slug },
      data: { cohortId },
      select: { slug: true, cohortId: true },
    })
    return NextResponse.json({ slug: updated.slug, cohortId: updated.cohortId })
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === 'P2025') {
      return NextResponse.json({ error: 'Associate not found' }, { status: 404 })
    }
    if (code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid cohortId — cohort does not exist' },
        { status: 400 }
      )
    }
    console.error('[/api/trainer/[slug]] PATCH failed:', error)
    return NextResponse.json({ error: 'Failed to update associate' }, { status: 500 })
  }
}
