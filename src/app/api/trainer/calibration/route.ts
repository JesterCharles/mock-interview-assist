import { NextResponse } from 'next/server'
import { getCallerIdentity } from '@/lib/identity'
import { prisma } from '@/lib/prisma'
import type { CalibrationData } from '@/lib/trainer-types'

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
    const sessions = await prisma.session.findMany({
      where: {
        status: 'completed',
        ...(cohortId !== null ? { associate: { cohortId } } : {}),
      },
      select: {
        assessments: true,
        aiTrainerVariance: true,
      },
    })

    // Initialize delta buckets for -3 through +3
    const deltaBuckets: Record<string, number> = {
      '-3': 0,
      '-2': 0,
      '-1': 0,
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
    }

    let overrideCount = 0
    let totalScoredQuestions = 0

    for (const session of sessions) {
      // Skip sessions with null assessments (graceful fallback per D-19)
      if (!session.assessments) continue

      // assessments is stored as JSON — cast to the expected shape
      const assessments = session.assessments as Record<
        string,
        { llmScore?: number; finalScore?: number }
      >

      for (const entry of Object.values(assessments)) {
        if (
          typeof entry.llmScore !== 'number' ||
          typeof entry.finalScore !== 'number'
        ) {
          continue
        }

        totalScoredQuestions++

        if (entry.finalScore !== entry.llmScore) {
          overrideCount++
        }

        // Compute delta, round to nearest integer, clamp to [-3, +3]
        const rawDelta = Math.round(entry.finalScore - entry.llmScore)
        const clampedDelta = Math.max(-3, Math.min(3, rawDelta))
        deltaBuckets[String(clampedDelta)]++
      }
    }

    const overrideRate =
      totalScoredQuestions > 0
        ? (overrideCount / totalScoredQuestions) * 100
        : null

    const calibrationData: CalibrationData = {
      overrideRate,
      overrideCount,
      totalScoredQuestions,
      deltaBuckets,
    }

    return NextResponse.json(calibrationData)
  } catch (error) {
    console.error('[/api/trainer/calibration] Failed to compute calibration data:', error)
    return NextResponse.json({ error: 'Failed to compute calibration data' }, { status: 500 })
  }
}
