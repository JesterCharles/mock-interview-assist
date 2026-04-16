import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCallerIdentity } from '@/lib/identity';
import { prisma } from '@/lib/prisma';
import type { CohortDTO } from '@/lib/cohort-types';

// Zod schema for cohort creation (D-04, D-16).
// endDate is optional/nullable because the underlying Cohort.endDate is nullable
// in prisma/schema.prisma. When provided, endDate must be >= startDate.
const CreateCohortSchema = z
  .object({
    name: z.string().min(1).max(100),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullable().optional(),
    description: z.string().max(500).nullable().optional(),
  })
  .refine((d) => !d.endDate || d.endDate >= d.startDate, {
    message: 'endDate must be >= startDate',
    path: ['endDate'],
  });

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

export async function GET() {
  const caller = await getCallerIdentity() // [AUDIT-VERIFIED: P20]
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cohorts = await prisma.cohort.findMany({
      include: { _count: { select: { associates: true } } },
      orderBy: { startDate: 'desc' },
    });
    const dtos: CohortDTO[] = cohorts.map((c) => toDTO(c as CohortRow));
    return NextResponse.json(dtos);
  } catch (error) {
    console.error('[/api/cohorts GET] Failed to list cohorts:', error);
    return NextResponse.json({ error: 'Failed to list cohorts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const caller = await getCallerIdentity() // [AUDIT-VERIFIED: P20]
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = CreateCohortSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { name, startDate, endDate, description } = parsed.data;

  try {
    const created = await prisma.cohort.create({
      data: {
        name,
        startDate,
        endDate: endDate ?? null,
        description: description ?? null,
      },
      include: { _count: { select: { associates: true } } },
    });
    return NextResponse.json(toDTO(created as CohortRow), { status: 201 });
  } catch (error) {
    // Prisma unique-constraint violation (D-16) — keep behavior open even though
    // current schema has no explicit unique on Cohort.name.
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Cohort already exists' },
        { status: 409 }
      );
    }
    console.error('[/api/cohorts POST] Failed to create cohort:', error);
    return NextResponse.json(
      { error: 'Failed to create cohort' },
      { status: 500 }
    );
  }
}
