import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthenticatedSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import type { CohortDTO } from '@/lib/cohort-types';

// Inline zod schemas to avoid cross-file zod imports (D-04).
// endDate nullable/optional matches the nullable column in prisma/schema.prisma.
const UpdateCohortSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().nullable().optional(),
    description: z.string().max(500).nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field required',
  })
  .refine(
    (d) =>
      !d.startDate || d.endDate === null || d.endDate === undefined
        ? true
        : d.endDate >= d.startDate,
    { message: 'endDate must be >= startDate', path: ['endDate'] }
  );

type CohortRow = {
  id: number;
  name: string;
  startDate: Date;
  endDate: Date | null;
  description: string | null;
  _count?: { associates: number };
};

function toDTO(row: CohortRow): CohortDTO {
  return {
    id: row.id,
    name: row.name,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate ? row.endDate.toISOString() : null,
    description: row.description ?? null,
    associateCount: row._count?.associates ?? 0,
  };
}

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
// GET /api/cohorts/[id]
// ---------------------------------------------------------------------------

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticatedSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const idNum = parseId(id);
  if (idNum === null) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    const cohort = await prisma.cohort.findUnique({
      where: { id: idNum },
      include: { _count: { select: { associates: true } } },
    });
    if (!cohort) {
      return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
    }
    return NextResponse.json(toDTO(cohort as CohortRow));
  } catch (error) {
    console.error('[/api/cohorts/[id] GET] Failed to fetch cohort:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cohort' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/cohorts/[id]
// ---------------------------------------------------------------------------

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticatedSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const idNum = parseId(id);
  if (idNum === null) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = UpdateCohortSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.startDate !== undefined) data.startDate = parsed.data.startDate;
  if (parsed.data.endDate !== undefined) data.endDate = parsed.data.endDate;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;

  try {
    // MD-01: cross-field validation against merged state. Schema refine only
    // catches cases where startDate is in the payload; a client patching only
    // { endDate } against a cohort with an earlier stored startDate would
    // otherwise bypass the check. Fetch existing row and merge before update.
    if (parsed.data.endDate !== undefined && parsed.data.endDate !== null) {
      const existing = await prisma.cohort.findUnique({
        where: { id: idNum },
        select: { startDate: true },
      });
      if (!existing) {
        return NextResponse.json(
          { error: 'Cohort not found' },
          { status: 404 }
        );
      }
      const mergedStart =
        parsed.data.startDate !== undefined
          ? parsed.data.startDate
          : existing.startDate;
      if (parsed.data.endDate < mergedStart) {
        return NextResponse.json(
          {
            error: 'Invalid input',
            issues: [
              {
                path: ['endDate'],
                message: 'endDate must be >= startDate',
              },
            ],
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.cohort.update({
      where: { id: idNum },
      data,
      include: { _count: { select: { associates: true } } },
    });
    return NextResponse.json(toDTO(updated as CohortRow));
  } catch (error) {
    if (isPrismaError(error, 'P2025')) {
      return NextResponse.json(
        { error: 'Cohort not found' },
        { status: 404 }
      );
    }
    if (isPrismaError(error, 'P2002')) {
      return NextResponse.json(
        { error: 'Cohort already exists' },
        { status: 409 }
      );
    }
    console.error('[/api/cohorts/[id] PATCH] Failed to update cohort:', error);
    return NextResponse.json(
      { error: 'Failed to update cohort' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/cohorts/[id] — non-cascading (D-06)
// ---------------------------------------------------------------------------
// Associates are unassigned (cohortId -> null) before the cohort row is deleted.
// Schema-level onDelete: SetNull (D-07) is a secondary safety net; the
// transaction is the primary contract so the behavior is explicit and testable.

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticatedSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const idNum = parseId(id);
  if (idNum === null) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.associate.updateMany({
        where: { cohortId: idNum },
        data: { cohortId: null },
      });
      await tx.cohort.delete({ where: { id: idNum } });
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (isPrismaError(error, 'P2025')) {
      return NextResponse.json(
        { error: 'Cohort not found' },
        { status: 404 }
      );
    }
    console.error('[/api/cohorts/[id] DELETE] Failed to delete cohort:', error);
    return NextResponse.json(
      { error: 'Failed to delete cohort' },
      { status: 500 }
    );
  }
}
