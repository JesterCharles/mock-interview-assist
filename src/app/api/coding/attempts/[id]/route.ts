/**
 * GET /api/coding/attempts/[id] — Phase 39 Plan 02 Task 2
 *
 * Poll endpoint for async coding submissions. Returns normalized verdict,
 * visible test details, and hidden test aggregate (passed/total) — NEVER
 * hidden fixture content.
 *
 * Enforces hidden-test shield via Zod `.strict()` output schema: any attempt
 * to serialize hidden case detail trips the shield and returns 500 INTERNAL.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCallerIdentity } from '@/lib/identity';
import { prisma } from '@/lib/prisma';
import {
  pollAndMaybeResolveAttempt,
  AttemptNotFoundError,
} from '@/lib/codingAttemptPoll';
import { codingApiError } from '@/lib/codingApiErrors';
import { isCodingEnabled } from '@/lib/codingFeatureFlag';
import { codingDisabledResponse } from '@/app/api/coding/_disabledResponse';

// Zod output schema — enforced BEFORE serialization.
// This is the hidden-test shield: any regression surfacing hidden case detail
// (e.g., hiddenTestResults as array of full objects) will fail parse → 500.
const AttemptResponseSchema = z
  .object({
    attemptId: z.string(),
    verdict: z.enum([
      'pending',
      'pass',
      'fail',
      'timeout',
      'mle',
      'runtime_error',
      'compile_error',
    ]),
    score: z.number().min(0).max(100).nullable(),
    visibleTestResults: z.array(
      z
        .object({
          caseId: z.string(),
          passed: z.boolean(),
          stdout: z.string().nullable(),
          durationMs: z.number().nullable(),
        })
        .strict(),
    ),
    hiddenTestResults: z
      .object({
        passed: z.number().int().min(0),
        total: z.number().int().min(0),
      })
      .strict(),
    submittedAt: z.string(),
    completedAt: z.string().nullable(),
  })
  .strict();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  // Phase 50 (JUDGE-INTEG-02 / D-05): flag gate — fires before params + DB.
  if (!isCodingEnabled()) {
    return codingDisabledResponse();
  }

  const { id } = await params;

  const caller = await getCallerIdentity();
  if (caller.kind === 'anonymous') {
    return codingApiError('AUTH_REQUIRED', 'Sign-in required');
  }

  // Load attempt for authz + timestamps
  const attempt = await prisma.codingAttempt.findUnique({
    where: { id },
    select: {
      id: true,
      associateId: true,
      verdict: true,
      submittedAt: true,
      completedAt: true,
    },
  });
  if (!attempt) {
    return codingApiError('NOT_FOUND', 'Attempt not found');
  }

  // Authz: associate must own the attempt; trainer/admin bypass
  if (caller.kind === 'associate' && attempt.associateId !== caller.associateId) {
    return codingApiError('FORBIDDEN', 'Attempt does not belong to caller');
  }

  // Delegate aggregation + persistence + signal to helper
  let pollResult;
  try {
    pollResult = await pollAndMaybeResolveAttempt(id);
  } catch (err) {
    if (err instanceof AttemptNotFoundError) {
      return codingApiError('NOT_FOUND', 'Attempt not found');
    }
    console.error('[coding/attempts] poll failed:', err);
    return codingApiError('INTERNAL', 'Poll failed');
  }

  // Re-read for fresh completedAt (helper may have just persisted it)
  const fresh = await prisma.codingAttempt.findUnique({
    where: { id },
    select: { submittedAt: true, completedAt: true },
  });
  const submittedAt = (fresh?.submittedAt ?? attempt.submittedAt).toISOString();
  const completedAt = fresh?.completedAt?.toISOString() ?? null;

  const responseBody = {
    attemptId: id,
    verdict: pollResult.verdict,
    score: pollResult.score,
    visibleTestResults: pollResult.visibleTestResults,
    hiddenTestResults: pollResult.hiddenAggregate,
    submittedAt,
    completedAt,
  };

  const parsed = AttemptResponseSchema.safeParse(responseBody);
  if (!parsed.success) {
    console.error(
      '[coding/attempts] SHIELD TRIPPED — response schema violation for attempt',
      id,
      parsed.error.issues,
    );
    return codingApiError('INTERNAL', 'Response shape error');
  }

  return NextResponse.json(parsed.data, { status: 200 });
}
