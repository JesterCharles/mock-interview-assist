/**
 * /api/cohorts/[id]/curriculum/[weekId]
 *
 * PATCH  — partially update a curriculum week
 * DELETE — remove a curriculum week
 *
 * Both endpoints:
 * - Require trainer auth (D-13)
 * - Verify week.cohortId === params.id (cross-cohort tampering guard)
 * - Map Prisma P2002 → 409 on PATCH (Codex finding #9, D-24)
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCallerIdentity } from '@/lib/identity';
import { prisma } from '@/lib/prisma';
import { updateWeek, deleteWeek } from '@/lib/curriculumService';

// ---------------------------------------------------------------------------
// Zod schema for PATCH body (all fields optional)
// ---------------------------------------------------------------------------

const PatchWeekSchema = z
  .object({
    weekNumber: z.number().int().min(1).optional(),
    skillName: z.string().min(1).max(80).optional(),
    skillSlug: z
      .string()
      .min(1)
      .max(50)
      .regex(/^[a-z0-9][a-z0-9-]*$/, 'skillSlug must be lowercase-kebab (a-z, 0-9, hyphens)')
      .optional(),
    topicTags: z.array(z.string()).optional(),
    startDate: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field required',
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
// PATCH /api/cohorts/[id]/curriculum/[weekId]
// ---------------------------------------------------------------------------

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; weekId: string }> }
) {
  const caller = await getCallerIdentity()
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, weekId } = await params;
  const cohortId = parseId(id);
  const weekIdNum = parseId(weekId);

  if (cohortId === null) {
    return NextResponse.json({ error: 'Invalid cohort id' }, { status: 400 });
  }
  if (weekIdNum === null) {
    return NextResponse.json({ error: 'Invalid week id' }, { status: 400 });
  }

  // Fetch existing week to verify ownership
  const existing = await prisma.curriculumWeek.findUnique({
    where: { id: weekIdNum },
    select: { id: true, cohortId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Week not found' }, { status: 404 });
  }
  if (existing.cohortId !== cohortId) {
    // Cross-cohort tampering guard
    return NextResponse.json({ error: 'Week not found' }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = PatchWeekSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const updateData: Record<string, unknown> = {};
    if (parsed.data.weekNumber !== undefined) updateData.weekNumber = parsed.data.weekNumber;
    if (parsed.data.skillName !== undefined) updateData.skillName = parsed.data.skillName;
    if (parsed.data.skillSlug !== undefined) updateData.skillSlug = parsed.data.skillSlug;
    if (parsed.data.topicTags !== undefined) updateData.topicTags = parsed.data.topicTags;
    if (parsed.data.startDate !== undefined) updateData.startDate = new Date(parsed.data.startDate);

    const updated = await updateWeek(weekIdNum, updateData);
    return NextResponse.json(updated);
  } catch (error) {
    if (isPrismaError(error, 'P2002')) {
      return NextResponse.json(
        { error: 'Week number already exists for this cohort' },
        { status: 409 }
      );
    }
    if (isPrismaError(error, 'P2025')) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 });
    }
    console.error('[/api/cohorts/[id]/curriculum/[weekId] PATCH] Failed:', error);
    return NextResponse.json({ error: 'Failed to update curriculum week' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/cohorts/[id]/curriculum/[weekId]
// ---------------------------------------------------------------------------

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; weekId: string }> }
) {
  const caller = await getCallerIdentity()
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, weekId } = await params;
  const cohortId = parseId(id);
  const weekIdNum = parseId(weekId);

  if (cohortId === null) {
    return NextResponse.json({ error: 'Invalid cohort id' }, { status: 400 });
  }
  if (weekIdNum === null) {
    return NextResponse.json({ error: 'Invalid week id' }, { status: 400 });
  }

  // Fetch existing week to verify ownership
  const existing = await prisma.curriculumWeek.findUnique({
    where: { id: weekIdNum },
    select: { id: true, cohortId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Week not found' }, { status: 404 });
  }
  if (existing.cohortId !== cohortId) {
    // Cross-cohort tampering guard
    return NextResponse.json({ error: 'Week not found' }, { status: 404 });
  }

  try {
    await deleteWeek(weekIdNum);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (isPrismaError(error, 'P2025')) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 });
    }
    console.error('[/api/cohorts/[id]/curriculum/[weekId] DELETE] Failed:', error);
    return NextResponse.json({ error: 'Failed to delete curriculum week' }, { status: 500 });
  }
}
