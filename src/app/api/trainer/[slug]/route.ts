import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { AssociateDetail, SessionSummary, GapScoreEntry } from '@/lib/trainer-types'

// Slug validation — alphanumeric + hyphens only (T-06-04 defense-in-depth)
const SLUG_RE = /^[a-z0-9-]+$/

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Input validation — reject invalid slugs before querying DB (T-06-04)
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  }

  // Auth check — validate nlm_session cookie before returning data (T-06-05)
  const cookieStore = await cookies()
  const session = cookieStore.get('nlm_session')
  if (!session || session.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const associate = await prisma.associate.findUnique({
      where: { slug },
      include: {
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
      slug: associate.slug,
      displayName: associate.displayName ?? associate.slug,
      readinessStatus: (associate.readinessStatus as 'ready' | 'improving' | 'not_ready') ?? 'not_ready',
      readinessScore: null, // numeric score computed from GapScore aggregation — null until computed
      recommendedArea: associate.recommendedArea ?? null,
      sessionCount: associate._count.sessions,
      lastSessionDate: sessions[0]?.date ?? null,
      sessions,
      gapScores,
    }

    return NextResponse.json(detail)
  } catch (error) {
    console.error('[/api/trainer/[slug]] Failed to fetch associate detail:', error)
    return NextResponse.json({ error: 'Failed to fetch associate detail' }, { status: 500 })
  }
}
