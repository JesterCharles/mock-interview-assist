/**
 * /api/cohorts/[id]/curriculum
 *
 * GET  — list all weeks for a cohort (or ?taught=true for taught-only)
 * POST — create a new curriculum week
 *
 * Both endpoints require trainer auth (D-13).
 * POST maps Prisma P2002 → 409 (Codex finding #9, D-24).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthenticatedSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { listWeeks, getTaughtWeeks, createWeek } from '@/lib/curriculumService';

// ---------------------------------------------------------------------------
// Zod schema for POST body
// ---------------------------------------------------------------------------

const CreateWeekSchema = z.object({
  weekNumber: z.number().int().min(1),
  skillName: z.string().min(1).max(80),
  skillSlug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'skillSlug must be lowercase-kebab (a-z, 0-9, hyphens)'),
  topicTags: z.array(z.string()).default([]),
  startDate: z.string().datetime({ offset: true }).or(z.string().date()),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    !!error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: string }).code === code
  );
}

// ---------------------------------------------------------------------------
// GET /api/cohorts/[id]/curriculum
// ---------------------------------------------------------------------------

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticatedSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const cohortId = parseId(id);
  if (cohortId === null) {
    return NextResponse.json({ error: 'Invalid cohort id' }, { status: 400 });
  }

  // Verify cohort exists
  const cohort = await prisma.cohort.findUnique({ where: { id: cohortId }, select: { id: true } });
  if (!cohort) {
    return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
  }

  try {
    const url = new URL(req.url);
    const taught = url.searchParams.get('taught') === 'true';

    const weeks = taught
      ? await getTaughtWeeks(cohortId)
      : await listWeeks(cohortId);

    return NextResponse.json(weeks);
  } catch (error) {
    console.error('[/api/cohorts/[id]/curriculum GET] Failed:', error);
    return NextResponse.json({ error: 'Failed to fetch curriculum weeks' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/cohorts/[id]/curriculum
// ---------------------------------------------------------------------------

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticatedSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const cohortId = parseId(id);
  if (cohortId === null) {
    return NextResponse.json({ error: 'Invalid cohort id' }, { status: 400 });
  }

  // Verify cohort exists
  const cohort = await prisma.cohort.findUnique({ where: { id: cohortId }, select: { id: true } });
  if (!cohort) {
    return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = CreateWeekSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const week = await createWeek(cohortId, {
      weekNumber: parsed.data.weekNumber,
      skillName: parsed.data.skillName,
      skillSlug: parsed.data.skillSlug,
      topicTags: parsed.data.topicTags,
      startDate: new Date(parsed.data.startDate),
    });

    return NextResponse.json(week, { status: 201 });
  } catch (error) {
    if (isPrismaError(error, 'P2002')) {
      return NextResponse.json(
        { error: 'Week number already exists for this cohort' },
        { status: 409 }
      );
    }
    console.error('[/api/cohorts/[id]/curriculum POST] Failed:', error);
    return NextResponse.json({ error: 'Failed to create curriculum week' }, { status: 500 });
  }
}
