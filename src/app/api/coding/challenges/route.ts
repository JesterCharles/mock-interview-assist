/**
 * GET /api/coding/challenges — Phase 39 Plan 03 Task 2
 *
 * Cursor-paginated list endpoint with cohort + curriculum scoping.
 *
 * Scope rules (D-02, D-13, D-14):
 *   - Anonymous → 401
 *   - Trainer → all challenges
 *   - Associate without cohort → challenges where cohortId IS NULL
 *   - Associate with cohort → cohortId IS NULL OR caller's cohortId
 *     AND, if cohort has curriculum weeks, skillSlug IN taught slugs
 *
 * Response items exclude description + test cases. Latest-attempt join
 * returns {verdict, submittedAt} per associate.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCallerIdentity } from '@/lib/identity';
import { prisma } from '@/lib/prisma';
import { codingApiError } from '@/lib/codingApiErrors';
import { isCodingEnabled } from '@/lib/codingFeatureFlag';
import { codingDisabledResponse } from '@/app/api/coding/_disabledResponse';

const QuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  language: z
    .enum(['python', 'javascript', 'typescript', 'java', 'sql', 'csharp'])
    .optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  status: z.enum(['unstarted', 'attempted', 'passed']).optional(),
  week: z.coerce.number().int().min(1).optional(),
});

interface ListItem {
  id: string;
  slug: string;
  title: string;
  language: string;
  difficulty: string;
  skillSlug: string;
  cohortId: number | null;
  latestAttempt: { verdict: string; submittedAt: string } | null;
}

type WhereClause = {
  language?: string;
  difficulty?: string;
  cohortId?: number | null;
  OR?: Array<{ cohortId: number | null }>;
  skillSlug?: { in: string[] };
};

export async function GET(request: Request): Promise<NextResponse> {
  // Phase 50 (JUDGE-INTEG-02 / D-05): flag gate — fires before auth + DB.
  if (!isCodingEnabled()) {
    return codingDisabledResponse();
  }

  const caller = await getCallerIdentity();
  if (caller.kind === 'anonymous') {
    return codingApiError('AUTH_REQUIRED', 'Sign-in required');
  }

  // Parse query string
  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return codingApiError(
      'VALIDATION_ERROR',
      'Invalid query parameters',
      parsed.error.issues,
    );
  }
  const { cursor, limit, language, difficulty, status, week } = parsed.data;

  // Build base where clause
  const where: WhereClause = {};
  if (language) where.language = language;
  if (difficulty) where.difficulty = difficulty;

  // Scope by caller kind
  if (caller.kind === 'associate') {
    const assoc = await prisma.associate.findUnique({
      where: { id: caller.associateId },
      select: { cohortId: true },
    });
    const assocCohortId = assoc?.cohortId ?? null;

    if (assocCohortId === null) {
      // Associate without cohort sees only global challenges
      where.cohortId = null;
    } else {
      where.OR = [{ cohortId: null }, { cohortId: assocCohortId }];

      // Curriculum narrowing by skillSlug
      const weekFilter =
        week !== undefined
          ? { cohortId: assocCohortId, weekNumber: week }
          : { cohortId: assocCohortId };
      const weeks = await prisma.curriculumWeek.findMany({
        where: weekFilter,
        select: { skillSlug: true },
      });

      if (weeks.length > 0) {
        const slugs = Array.from(new Set(weeks.map((w) => w.skillSlug)));
        where.skillSlug = { in: slugs };
      } else if (week !== undefined) {
        // Requested ?week=N but no curriculum week matches → empty result
        where.skillSlug = { in: [] };
      }
      // else: no curriculum at all — skip skillSlug narrowing (D-14)
    }
  }
  // trainer / admin: no extra scope

  // Paginated query. Stable ordering: createdAt DESC, id DESC.
  const rawItems = await prisma.codingChallenge.findMany({
    where: where as Parameters<typeof prisma.codingChallenge.findMany>[0] extends
      | undefined
      | { where?: infer W }
      ? W
      : never,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      slug: true,
      title: true,
      language: true,
      difficulty: true,
      skillSlug: true,
      cohortId: true,
    },
  });

  const hasMore = rawItems.length > limit;
  const pageItems = hasMore ? rawItems.slice(0, limit) : rawItems;

  // Latest-attempt join for associates; trainers get null
  let itemsWithLatest: ListItem[] = pageItems.map((c) => ({
    ...c,
    latestAttempt: null,
  }));

  if (caller.kind === 'associate' && pageItems.length > 0) {
    const attempts = await prisma.codingAttempt.findMany({
      where: {
        associateId: caller.associateId,
        challengeId: { in: pageItems.map((c) => c.id) },
      },
      orderBy: [{ submittedAt: 'desc' }],
      select: { challengeId: true, verdict: true, submittedAt: true },
    });

    const latestByChallenge = new Map<string, { verdict: string; submittedAt: Date }>();
    for (const a of attempts) {
      if (!latestByChallenge.has(a.challengeId)) {
        latestByChallenge.set(a.challengeId, {
          verdict: a.verdict,
          submittedAt: a.submittedAt,
        });
      }
    }

    itemsWithLatest = pageItems.map((c) => {
      const la = latestByChallenge.get(c.id);
      return {
        ...c,
        latestAttempt: la
          ? { verdict: la.verdict, submittedAt: la.submittedAt.toISOString() }
          : null,
      };
    });
  }

  // Status filter applied AFTER latest-attempt join (associate-only semantic)
  if (status && caller.kind === 'associate') {
    itemsWithLatest = itemsWithLatest.filter((it) => {
      if (status === 'unstarted') return it.latestAttempt === null;
      if (status === 'attempted')
        return it.latestAttempt !== null && it.latestAttempt.verdict !== 'pass';
      if (status === 'passed') return it.latestAttempt?.verdict === 'pass';
      return true;
    });
  }

  const nextCursor = hasMore ? pageItems[pageItems.length - 1].id : null;

  return NextResponse.json({ items: itemsWithLatest, nextCursor }, { status: 200 });
}
