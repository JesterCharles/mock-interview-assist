/**
 * GET /api/coding/challenges/[id] — Phase 40 Plan 03
 *
 * Returns the full challenge detail (description markdown, starters, visible
 * test cases, languages) for the solve view at /coding/[challengeId].
 *
 * Auth:
 *   - anonymous → 401
 *   - associate → must be in matching cohort OR challenge is global (cohortId=null)
 *   - trainer / admin → full access
 *
 * Hidden tests are NEVER returned — loaded separately by /submit for Judge0.
 *
 * `id` accepts EITHER the CUID primary key OR the slug; we try both so the
 * UI can link via either form (Phase 39 list returns id; challenge cards may
 * link via slug).
 */

import { NextResponse } from 'next/server';
import { getCallerIdentity } from '@/lib/identity';
import { prisma } from '@/lib/prisma';
import { loadChallenge } from '@/lib/coding-challenge-service';
import { codingApiError } from '@/lib/codingApiErrors';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const caller = await getCallerIdentity();
  if (caller.kind === 'anonymous') {
    return codingApiError('AUTH_REQUIRED', 'Sign-in required');
  }

  // Try id (cuid) first, fall back to slug.
  const challenge =
    (await prisma.codingChallenge.findUnique({ where: { id } })) ??
    (await prisma.codingChallenge.findUnique({ where: { slug: id } }));

  if (!challenge) {
    return codingApiError('NOT_FOUND', 'Challenge not found');
  }

  // Authorization (associate only; trainer/admin bypass).
  if (caller.kind === 'associate' && challenge.cohortId !== null) {
    const associate = await prisma.associate.findUnique({
      where: { id: caller.associateId },
      select: { cohortId: true },
    });
    if (associate?.cohortId !== challenge.cohortId) {
      return codingApiError(
        'FORBIDDEN',
        'Challenge is not available for your cohort',
      );
    }
  }

  // Load full content from coding-challenge-service (server-side module cache).
  let full;
  try {
    full = await loadChallenge(challenge.slug);
  } catch (err) {
    console.error('[coding/challenges/[id]] loadChallenge failed:', err);
    return codingApiError('INTERNAL', 'Failed to load challenge content');
  }

  // Also fetch visible test cases from DB (they're already synced per Phase 37).
  const visibleCases = await prisma.codingTestCase.findMany({
    where: { challengeId: challenge.id, isHidden: false },
    orderBy: { orderIndex: 'asc' },
    select: { id: true, stdin: true, expectedStdout: true },
  });

  const body = {
    id: challenge.id,
    slug: challenge.slug,
    title: challenge.title,
    description: full.readme,
    difficulty: challenge.difficulty,
    skillSlug: challenge.skillSlug,
    language: challenge.language,
    languages: full.meta.languages,
    starters: full.starters,
    visibleTests: visibleCases.map((c) => ({
      caseId: c.id,
      stdin: c.stdin,
      expectedStdout: c.expectedStdout,
    })),
  };

  return NextResponse.json(body, { status: 200 });
}
