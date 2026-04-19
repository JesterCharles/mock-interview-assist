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
import { isCodingEnabled } from '@/lib/codingFeatureFlag';
import { codingDisabledResponse } from '@/app/api/coding/_disabledResponse';
import {
  submit as judge0Submit,
  JUDGE0_LANGUAGE_MAP,
  type Judge0Language,
} from '@/lib/judge0Client';
import { loadHiddenTests, getSetupSql } from '@/lib/coding-challenge-service';
// Phase 42 §D-06: for SQL attempts, per-test `passed` is derived by
// `normalizeSqliteResult` (see src/lib/codingAttemptPoll.ts SQL branch).
// We do NOT pass expected_output to Judge0 for SQL — normalization runs
// server-side during poll, against trainer-authored expectedRows. This route
// only builds + submits the concatenated source; the verdict compare path
// lives in the poll helper.
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
  // Phase 50 (JUDGE-INTEG-02 / D-05): feature-flag gate. Fires BEFORE
  // identity check, body parse, and all DB reads. When CODING_CHALLENGES_ENABLED
  // !== 'true' we short-circuit with the canonical 503 + coming-soon body.
  if (!isCodingEnabled()) {
    return codingDisabledResponse();
  }

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

  let hiddenCases: Array<{ stdin: string; expectedStdout: string }>;
  try {
    hiddenCases = await loadHiddenTests(challenge.slug);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/GITHUB_CODING_PRIVATE_REPO not set|GITHUB_CODING_PRIVATE_TOKEN not set/.test(msg)) {
      // Local-seed demo fallback — hidden tests already in DB, bypass GitHub.
      console.warn('[coding/submit] private repo not configured — loading hidden tests from DB');
      const dbHidden = await prisma.codingTestCase.findMany({
        where: { challengeId: challenge.id, isHidden: true },
        orderBy: { orderIndex: 'asc' },
        select: { stdin: true, expectedStdout: true },
      });
      hiddenCases = dbHidden;
    } else {
      throw err;
    }
  }

  // Order: visible first (by orderIndex), then hidden (by orderIndex). Tokens align by index.
  const allCases: Array<{ stdin: string; expectedStdout: string }> = [
    ...visibleCases.map((c) => ({ stdin: c.stdin, expectedStdout: c.expectedStdout })),
    ...hiddenCases.map((c) => ({ stdin: c.stdin, expectedStdout: c.expectedStdout })),
  ];

  // Phase 42 §D-03: SQL pre-step. setup.sql is schema + seed authored by the
  // trainer and MUST stay server-only — this variable NEVER appears in any
  // Response.json(...) body below (verified by grep audit in Task 3 verify).
  let setupSql: string | null = null;
  if (parsedBody.language === 'sql') {
    try {
      setupSql = await getSetupSql(challenge.slug);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/GITHUB_CODING_PUBLIC_REPO not set|GITHUB_TOKEN not set/.test(msg)) {
        // Local demo fallback — trust stdin to carry full schema + seed.
        console.warn('[coding/submit] GitHub not configured — using empty setup.sql for', challenge.slug);
        setupSql = '';
      } else {
        console.error('[coding/submit] getSetupSql failed for', challenge.slug, err);
        return codingApiError(
          'VALIDATION_ERROR',
          'SQL challenge setup.sql unavailable',
        );
      }
    }
    if (setupSql === null) {
      return codingApiError(
        'VALIDATION_ERROR',
        'SQL challenge missing setup.sql',
      );
    }
  }

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
  //
  // HIDDEN TEST SHIELD — do not echo setupSql/tc.stdin/expectedRows into response.
  // The sourceCode built below (which may contain hidden trainer queries + setup.sql)
  // is handed to Judge0 via HTTPS; it never crosses a response-body boundary here.
  // For SQL language (§D-03 + D-04): concatenation order is
  //   `.mode tabs` + `.headers off` + setup.sql + user query + test query-per-case.
  // Expected-output stdout comparison is performed server-side via
  // sqlResultNormalizer during poll (see codingAttemptPoll.ts SQL branch).
  let tokens: string[];
  try {
    const submissions = await Promise.all(
      allCases.map((tc) => {
        let sourceCode: string;
        let submissionStdin: string;
        let submissionExpected: string | undefined;

        if (parsedBody.language === 'sql') {
          // setupSql is guaranteed non-null here (validated above for SQL branch).
          //
          // WR-01 (Phase 42 review): wrap the trainer test query in sentinel
          // SELECTs so sqlResultNormalizer can slice off any rows emitted by
          // the associate's user query (exploratory SELECTs, debug prints,
          // etc.) before comparing against expectedRows. Without these
          // markers, `SELECT * FROM users` in the user's answer prepends to
          // the test query's output and corrupts row-count/cell checks.
          sourceCode = [
            '.mode tabs',
            '.headers off',
            setupSql ?? '',
            parsedBody.code, // associate-submitted SQL (user query)
            "SELECT '---BEGIN-ANSWER---';",
            tc.stdin, // trainer-authored test query — NEVER surfaces to client for hidden tests
            "SELECT '---END-ANSWER---';",
          ].join('\n');
          // SQLite in Judge0 runs the source; stdin pipe is unused for SQL.
          submissionStdin = '';
          // Do NOT pass expected_output for SQL — our normalizer handles compare
          // (Judge0's built-in match cannot understand column/row order + coerce).
          submissionExpected = undefined;
        } else {
          sourceCode = parsedBody.code;
          submissionStdin = tc.stdin;
          submissionExpected = tc.expectedStdout;
        }

        return judge0Submit({
          sourceCode,
          language: parsedBody.language as Judge0Language,
          stdin: submissionStdin,
          expectedStdout: submissionExpected,
        });
      }),
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

  // 11. Persist tokens — FATAL if this fails. WR-02 (Phase 39 review):
  // If we leave the attempt pending with judge0Token=null, the poller
  // short-circuits on null token and the attempt hangs in pending forever
  // while the real Judge0 results become unrecoverable. Symmetric rollback
  // with the Judge0-failure path: delete the attempt so the client resubmits.
  try {
    await prisma.codingAttempt.update({
      where: { id: attempt.id },
      data: { judge0Token: JSON.stringify(tokens) },
    });
  } catch (err) {
    console.error('[coding/submit] failed to persist tokens for attempt', attempt.id, err);
    try {
      await prisma.codingAttempt.delete({ where: { id: attempt.id } });
    } catch (delErr) {
      console.error('[coding/submit] failed to roll back orphan attempt', attempt.id, delErr);
    }
    return codingApiError(
      'JUDGE0_UNAVAILABLE',
      'Code execution service unavailable — please retry',
    );
  }

  // 12. Increment rate limit counter, return attemptId
  incrementCodingSubmitCount(userKey);

  return NextResponse.json({ attemptId: attempt.id }, { status: 201 });
}
