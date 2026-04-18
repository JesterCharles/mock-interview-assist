/**
 * POST /api/coding/submit — Phase 39 Plan 01 Task 2
 *
 * Async-submit entry point for coding challenges. Never calls Judge0 with
 * wait=true. Never leaks hidden test fixtures.
 *
 * Flow (D-04):
 *   1. Zod-parse body
 *   2. getCallerIdentity — 401 if anonymous
 *   3. Trainers cannot submit in v1.4 (no associateId); 403 FORBIDDEN
 *   4. Load challenge — 404 if missing
 *   5. Authz: associate cohortId must match OR challenge.cohortId is null
 *   6. Language allowlist + challenge.language match
 *   7. Rate limit gate — 429 + Retry-After if blocked
 *   8. Load hidden tests (server-only) + visible test cases
 *   9. Create CodingAttempt(verdict='pending')
 *  10. judge0Client.submit per test case (no wait)
 *  11. Persist tokens JSON-stringified into judge0Token
 *  12. Return { attemptId } 201
 *
 * On Judge0 failure → delete the pending attempt + 503 JUDGE0_UNAVAILABLE.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCallerIdentity } from '@/lib/identity';
import { prisma } from '@/lib/prisma';
import {
  submit as judge0Submit,
  JUDGE0_LANGUAGE_MAP,
  type Judge0Language,
} from '@/lib/judge0Client';
import { loadHiddenTests } from '@/lib/coding-challenge-service';
import {
  checkCodingSubmitRateLimit,
  incrementCodingSubmitCount,
} from '@/lib/rateLimitService';
import { codingApiError } from '@/lib/codingApiErrors';

// WR-02 (Phase 36 review): cap code payload at 100KB.
const SubmitBodySchema = z.object({
  challengeId: z.string().min(1),
  language: z.string().min(1),
  code: z.string().min(1).max(100_000),
});

const SUPPORTED_LANGUAGES = Object.keys(JUDGE0_LANGUAGE_MAP) as Judge0Language[];

export async function POST(request: Request): Promise<NextResponse> {
  // 1. Caller identity (early short-circuit for anonymous — avoids unnecessary parsing)
  const caller = await getCallerIdentity();
  if (caller.kind === 'anonymous') {
    return codingApiError('AUTH_REQUIRED', 'Sign-in required');
  }

  // 2. Parse + validate body
  let parsedBody;
  try {
    const raw = await request.json();
    const result = SubmitBodySchema.safeParse(raw);
    if (!result.success) {
      return codingApiError('VALIDATION_ERROR', 'Invalid request body', result.error.issues);
    }
    parsedBody = result.data;
  } catch {
    return codingApiError('VALIDATION_ERROR', 'Invalid JSON body');
  }

  // 3. Trainers cannot submit — v1.4 requires associate identity (D-01 clarification)
  if (caller.kind !== 'associate') {
    return codingApiError(
      'FORBIDDEN',
      'Submit requires associate identity — trainer impersonation not supported in v1.4',
    );
  }

  // 4. Load challenge
  const challenge = await prisma.codingChallenge.findUnique({
    where: { id: parsedBody.challengeId },
    select: {
      id: true,
      slug: true,
      cohortId: true,
      language: true,
      skillSlug: true,
    },
  });
  if (!challenge) {
    return codingApiError('NOT_FOUND', 'Challenge not found');
  }

  // 5. Authorization: associate must be in matching cohort OR challenge is global
  if (challenge.cohortId !== null) {
    const associate = await prisma.associate.findUnique({
      where: { id: caller.associateId },
      select: { cohortId: true },
    });
    if (associate?.cohortId !== challenge.cohortId) {
      return codingApiError('FORBIDDEN', 'Challenge is not available for your cohort');
    }
  }

  // 6. Language allowlist + challenge-level match
  if (!SUPPORTED_LANGUAGES.includes(parsedBody.language as Judge0Language)) {
    return codingApiError(
      'LANGUAGE_NOT_SUPPORTED',
      `Language '${parsedBody.language}' is not in the allowlist`,
    );
  }
  if (challenge.language !== parsedBody.language) {
    return codingApiError(
      'LANGUAGE_NOT_SUPPORTED',
      `Challenge does not support '${parsedBody.language}'`,
    );
  }

  // 7. Rate limit gate
  const userKey = `associate:${caller.associateId}`;
  const rl = checkCodingSubmitRateLimit(userKey);
  if (!rl.allowed) {
    return codingApiError(
      'RATE_LIMITED',
      rl.error ?? 'Submit rate limit exceeded',
      undefined,
      rl.retryAfterSeconds !== undefined
        ? { retryAfterSeconds: rl.retryAfterSeconds }
        : undefined,
    );
  }

  // 8. Load test cases — visible from DB, hidden from private loader
  const visibleCases = await prisma.codingTestCase.findMany({
    where: { challengeId: challenge.id, isHidden: false },
    orderBy: { orderIndex: 'asc' },
    select: { id: true, stdin: true, expectedStdout: true, weight: true, orderIndex: true },
  });

  const hiddenCases = await loadHiddenTests(challenge.slug);

  // Order: visible first (by orderIndex), then hidden (by orderIndex). Tokens align by index.
  const allCases: Array<{ stdin: string; expectedStdout: string }> = [
    ...visibleCases.map((c) => ({ stdin: c.stdin, expectedStdout: c.expectedStdout })),
    ...hiddenCases.map((c) => ({ stdin: c.stdin, expectedStdout: c.expectedStdout })),
  ];

  // 9. Create CodingAttempt(pending) BEFORE Judge0 submit — so we can roll back on failure
  const attempt = await prisma.codingAttempt.create({
    data: {
      associateId: caller.associateId,
      challengeId: challenge.id,
      submittedCode: parsedBody.code,
      language: parsedBody.language,
      verdict: 'pending',
    },
    select: { id: true },
  });

  // 10. Submit to Judge0 — one submission per case. NO wait param.
  let tokens: string[];
  try {
    const submissions = await Promise.all(
      allCases.map((tc) =>
        judge0Submit({
          sourceCode: parsedBody.code,
          language: parsedBody.language as Judge0Language,
          stdin: tc.stdin,
          expectedStdout: tc.expectedStdout,
        }),
      ),
    );
    tokens = submissions.map((s) => s.token);
  } catch (err) {
    // Roll back the pending attempt so the user can retry
    try {
      await prisma.codingAttempt.delete({ where: { id: attempt.id } });
    } catch (delErr) {
      console.error('[coding/submit] failed to roll back attempt', attempt.id, delErr);
    }
    console.error('[coding/submit] Judge0 submit failed:', err);
    return codingApiError('JUDGE0_UNAVAILABLE', 'Code execution service unavailable');
  }

  // 11. Persist tokens — non-fatal if this fails; tokens can be re-fetched
  try {
    await prisma.codingAttempt.update({
      where: { id: attempt.id },
      data: { judge0Token: JSON.stringify(tokens) },
    });
  } catch (err) {
    console.error('[coding/submit] failed to persist tokens for attempt', attempt.id, err);
  }

  // 12. Increment rate limit counter, return attemptId
  incrementCodingSubmitCount(userKey);

  return NextResponse.json({ attemptId: attempt.id }, { status: 201 });
}
