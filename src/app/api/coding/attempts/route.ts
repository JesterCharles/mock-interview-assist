/**
 * GET /api/coding/attempts?challengeId=X&limit=10 — Phase 40 Plan 04 Task 3
 *
 * Returns last N attempts for (caller, challenge). Associates see their own
 * attempts only; trainers/admins may pass `?associateSlug=X` to scope to a
 * specific associate.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCallerIdentity } from '@/lib/identity';
import { prisma } from '@/lib/prisma';
import { codingApiError } from '@/lib/codingApiErrors';
import { isCodingEnabled } from '@/lib/codingFeatureFlag';
import { codingDisabledResponse } from '@/app/api/coding/_disabledResponse';

const QuerySchema = z.object({
  challengeId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(25).default(10),
  associateSlug: z.string().optional(),
});

export async function GET(request: Request): Promise<NextResponse> {
  // Phase 50 (JUDGE-INTEG-02 / D-05): flag gate — fires before auth + DB.
  if (!isCodingEnabled()) {
    return codingDisabledResponse();
  }

  const caller = await getCallerIdentity();
  if (caller.kind === 'anonymous') {
    return codingApiError('AUTH_REQUIRED', 'Sign-in required');
  }

  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return codingApiError(
      'VALIDATION_ERROR',
      'Invalid query parameters',
      parsed.error.issues,
    );
  }
  const { challengeId, limit, associateSlug } = parsed.data;

  // Resolve target associateId.
  let targetAssociateId: number | null = null;
  if (caller.kind === 'associate') {
    targetAssociateId = caller.associateId;
    if (associateSlug && associateSlug !== caller.associateSlug) {
      return codingApiError('FORBIDDEN', 'Cannot view another associate');
    }
  } else if (associateSlug) {
    // trainer / admin scoping by slug
    const assoc = await prisma.associate.findUnique({
      where: { slug: associateSlug },
      select: { id: true },
    });
    if (!assoc) {
      return codingApiError('NOT_FOUND', 'Associate not found');
    }
    targetAssociateId = assoc.id;
  }

  const where: { challengeId: string; associateId?: number } = { challengeId };
  if (targetAssociateId !== null) {
    where.associateId = targetAssociateId;
  }

  const rows = await prisma.codingAttempt.findMany({
    where,
    orderBy: { submittedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      verdict: true,
      language: true,
      submittedAt: true,
      score: true,
    },
  });

  const items = rows.map((r) => ({
    attemptId: r.id,
    verdict: r.verdict,
    language: r.language,
    submittedAt: r.submittedAt.toISOString(),
    score: r.score,
  }));

  return NextResponse.json({ items }, { status: 200 });
}
