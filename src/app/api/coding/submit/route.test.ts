/**
 * route.test.ts — POST /api/coding/submit
 *
 * Phase 39 Plan 01 Task 2. Unit tests for the async submit pipeline.
 * All external deps mocked: prisma, judge0Client, identity, coding-challenge-service,
 * rateLimitService.
 *
 * Asserts the hidden-test shield (Test 14) and the no-wait-true contract (Test 12).
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ---------- Mocks (must be set up BEFORE module import) ----------
vi.mock('@/lib/identity', () => ({
  getCallerIdentity: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    codingChallenge: { findUnique: vi.fn() },
    associate: { findUnique: vi.fn() },
    codingTestCase: { findMany: vi.fn() },
    codingAttempt: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/judge0Client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/judge0Client')>('@/lib/judge0Client');
  return {
    ...actual,
    submit: vi.fn(),
  };
});

vi.mock('@/lib/coding-challenge-service', () => ({
  loadHiddenTests: vi.fn(),
}));

vi.mock('@/lib/rateLimitService', () => ({
  checkCodingSubmitRateLimit: vi.fn(),
  incrementCodingSubmitCount: vi.fn(),
}));

import { POST } from './route';
import { getCallerIdentity } from '@/lib/identity';
import { prisma } from '@/lib/prisma';
import * as judge0Client from '@/lib/judge0Client';
import { loadHiddenTests } from '@/lib/coding-challenge-service';
import {
  checkCodingSubmitRateLimit,
  incrementCodingSubmitCount,
} from '@/lib/rateLimitService';

// Shared fixtures
const HIDDEN_STDIN_SENTINEL = 'SECRET_STDIN_XYZ_DO_NOT_LEAK';
const HIDDEN_EXPECTED_SENTINEL = 'SECRET_OUT_XYZ_DO_NOT_LEAK';

function buildRequest(body: unknown): Request {
  return new Request('http://localhost/api/coding/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function happyPathSetup(overrides: Partial<{
  caller: Awaited<ReturnType<typeof getCallerIdentity>>;
  challenge: unknown;
  associateCohortId: number | null;
}> = {}) {
  const caller = overrides.caller ?? {
    kind: 'associate' as const,
    userId: 'u-1',
    email: 'a@x.com',
    associateId: 42,
    associateSlug: 'alice',
  };
  (getCallerIdentity as Mock).mockResolvedValue(caller);

  const challenge = overrides.challenge ?? {
    id: 'ch-1',
    slug: 'two-sum',
    cohortId: null,
    language: 'python',
    skillSlug: 'python-basics',
  };
  (prisma.codingChallenge.findUnique as Mock).mockResolvedValue(challenge);

  (prisma.associate.findUnique as Mock).mockResolvedValue({
    cohortId: overrides.associateCohortId ?? null,
  });

  (prisma.codingTestCase.findMany as Mock).mockResolvedValue([
    { id: 'tc-v-1', isHidden: false, stdin: '1 2', expectedStdout: '3', weight: 1, orderIndex: 0 },
  ]);

  (loadHiddenTests as Mock).mockResolvedValue([
    {
      id: 'tc-h-1',
      stdin: HIDDEN_STDIN_SENTINEL,
      expectedStdout: HIDDEN_EXPECTED_SENTINEL,
      weight: 2,
      orderIndex: 0,
    },
  ]);

  (checkCodingSubmitRateLimit as Mock).mockReturnValue({
    allowed: true,
    hourlyRemaining: 29,
    dailyRemaining: 199,
  });

  (prisma.codingAttempt.create as Mock).mockResolvedValue({
    id: 'attempt-1',
    verdict: 'pending',
  });
  (prisma.codingAttempt.update as Mock).mockResolvedValue({ id: 'attempt-1' });

  (judge0Client.submit as Mock).mockImplementation(async () => ({ token: `tok-${Math.random()}` }));
}

describe('POST /api/coding/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1: anonymous caller → 401 AUTH_REQUIRED', async () => {
    (getCallerIdentity as Mock).mockResolvedValue({ kind: 'anonymous' });

    const res = await POST(buildRequest({
      challengeId: 'ch-1',
      language: 'python',
      code: 'print(1)',
    }) as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('Test 2: malformed body (missing challengeId) → 400 VALIDATION_ERROR', async () => {
    (getCallerIdentity as Mock).mockResolvedValue({
      kind: 'associate', userId: 'u', email: 'a@x', associateId: 1, associateSlug: 's',
    });

    const res = await POST(buildRequest({ language: 'python', code: 'x' }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.error.details)).toBe(true);
  });

  it('Test 3: challenge not found → 404 NOT_FOUND', async () => {
    happyPathSetup();
    (prisma.codingChallenge.findUnique as Mock).mockResolvedValue(null);

    const res = await POST(buildRequest({
      challengeId: 'missing',
      language: 'python',
      code: 'print(1)',
    }) as any);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('Test 4: associate with mismatched cohort → 403 FORBIDDEN', async () => {
    happyPathSetup({
      challenge: { id: 'ch-1', slug: 's', cohortId: 99, language: 'python', skillSlug: 'py' },
      associateCohortId: 5,
    });

    const res = await POST(buildRequest({
      challengeId: 'ch-1',
      language: 'python',
      code: 'x',
    }) as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('Test 5: associate + challenge.cohortId=null → allowed through', async () => {
    happyPathSetup({
      challenge: { id: 'ch-1', slug: 's', cohortId: null, language: 'python', skillSlug: 'py' },
      associateCohortId: 5,
    });

    const res = await POST(buildRequest({
      challengeId: 'ch-1',
      language: 'python',
      code: 'print(1)',
    }) as any);
    expect(res.status).toBe(201);
  });

  it('Test 6: associate + matching cohort → allowed', async () => {
    happyPathSetup({
      challenge: { id: 'ch-1', slug: 's', cohortId: 5, language: 'python', skillSlug: 'py' },
      associateCohortId: 5,
    });

    const res = await POST(buildRequest({
      challengeId: 'ch-1',
      language: 'python',
      code: 'print(1)',
    }) as any);
    expect(res.status).toBe(201);
  });

  it('Test 7: trainer caller → 403 FORBIDDEN (v1.4 submit requires associate identity)', async () => {
    // Per plan clarification: trainers have no associateId; submit requires associate kind
    happyPathSetup({
      caller: { kind: 'trainer', userId: 't-1', email: 't@x.com' } as any,
    });

    const res = await POST(buildRequest({
      challengeId: 'ch-1',
      language: 'python',
      code: 'print(1)',
    }) as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('Test 8: unsupported language "ruby" → 400 LANGUAGE_NOT_SUPPORTED', async () => {
    happyPathSetup();

    const res = await POST(buildRequest({
      challengeId: 'ch-1',
      language: 'ruby',
      code: 'x',
    }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('LANGUAGE_NOT_SUPPORTED');
  });

  it('Test 9: language not matching challenge.language → 400 LANGUAGE_NOT_SUPPORTED', async () => {
    happyPathSetup({
      challenge: { id: 'ch-1', slug: 's', cohortId: null, language: 'python', skillSlug: 'py' },
    });

    const res = await POST(buildRequest({
      challengeId: 'ch-1',
      language: 'javascript',
      code: 'x',
    }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('LANGUAGE_NOT_SUPPORTED');
  });

  it('Test 10: rate limit exceeded → 429 RATE_LIMITED with Retry-After', async () => {
    happyPathSetup();
    (checkCodingSubmitRateLimit as Mock).mockReturnValue({
      allowed: false,
      hourlyRemaining: 0,
      dailyRemaining: 150,
      retryAfterSeconds: 420,
      error: 'Hourly limit hit',
    });

    const res = await POST(buildRequest({
      challengeId: 'ch-1',
      language: 'python',
      code: 'x',
    }) as any);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('420');
    const body = await res.json();
    expect(body.error.code).toBe('RATE_LIMITED');
  });

  it('Test 11: happy path creates attempt with pending verdict, stores tokens, returns attemptId', async () => {
    happyPathSetup();

    const res = await POST(buildRequest({
      challengeId: 'ch-1',
      language: 'python',
      code: 'print(1)',
    }) as any);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ attemptId: 'attempt-1' });

    // Create with pending
    expect(prisma.codingAttempt.create).toHaveBeenCalledOnce();
    const createCall = (prisma.codingAttempt.create as Mock).mock.calls[0][0];
    expect(createCall.data.verdict).toBe('pending');
    expect(createCall.data.associateId).toBe(42);

    // Judge0 called once per test case (1 visible + 1 hidden = 2)
    expect(judge0Client.submit).toHaveBeenCalledTimes(2);

    // Update with token JSON
    expect(prisma.codingAttempt.update).toHaveBeenCalledOnce();
    const updateCall = (prisma.codingAttempt.update as Mock).mock.calls[0][0];
    expect(typeof updateCall.data.judge0Token).toBe('string');
    const tokens = JSON.parse(updateCall.data.judge0Token);
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens).toHaveLength(2);
  });

  it('Test 12: judge0Client.submit NEVER called with wait=true', async () => {
    happyPathSetup();

    await POST(buildRequest({
      challengeId: 'ch-1',
      language: 'python',
      code: 'print(1)',
    }) as any);

    const calls = (judge0Client.submit as Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    for (const [opts] of calls) {
      expect(opts).not.toHaveProperty('wait');
      // extra paranoia: no key with 'wait' substring
      for (const key of Object.keys(opts)) {
        expect(key.toLowerCase()).not.toContain('wait');
      }
    }
  });

  it('Test 13: success response body is EXACTLY {attemptId} — nothing else', async () => {
    happyPathSetup();

    const res = await POST(buildRequest({
      challengeId: 'ch-1',
      language: 'python',
      code: 'print(1)',
    }) as any);
    const body = await res.json();
    expect(Object.keys(body)).toEqual(['attemptId']);
  });

  it('Test 14: hidden test inputs NEVER leak in any response body', async () => {
    const scenarios = [
      // happy path
      async () => {
        happyPathSetup();
        return POST(buildRequest({ challengeId: 'ch-1', language: 'python', code: 'print(1)' }) as any);
      },
      // 403 (cohort mismatch)
      async () => {
        happyPathSetup({
          challenge: { id: 'ch-1', slug: 's', cohortId: 99, language: 'python', skillSlug: 'py' },
          associateCohortId: 5,
        });
        return POST(buildRequest({ challengeId: 'ch-1', language: 'python', code: 'x' }) as any);
      },
      // 429
      async () => {
        happyPathSetup();
        (checkCodingSubmitRateLimit as Mock).mockReturnValue({
          allowed: false, hourlyRemaining: 0, dailyRemaining: 0, retryAfterSeconds: 1, error: 'e',
        });
        return POST(buildRequest({ challengeId: 'ch-1', language: 'python', code: 'x' }) as any);
      },
    ];

    for (const run of scenarios) {
      const res = await run();
      const text = await res.text();
      expect(text).not.toContain(HIDDEN_STDIN_SENTINEL);
      expect(text).not.toContain(HIDDEN_EXPECTED_SENTINEL);
    }
  });

  it('Test 15: Judge0 unavailable → 503 JUDGE0_UNAVAILABLE, attempt is rolled back', async () => {
    happyPathSetup();
    (judge0Client.submit as Mock).mockRejectedValue(new Error('connection refused'));
    (prisma.codingAttempt.delete as Mock).mockResolvedValue({ id: 'attempt-1' });

    const res = await POST(buildRequest({
      challengeId: 'ch-1',
      language: 'python',
      code: 'print(1)',
    }) as any);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe('JUDGE0_UNAVAILABLE');

    expect(prisma.codingAttempt.delete).toHaveBeenCalledWith({
      where: { id: 'attempt-1' },
    });
  });

  it('Test 16: incrementCodingSubmitCount called exactly once on successful submit', async () => {
    happyPathSetup();

    await POST(buildRequest({
      challengeId: 'ch-1',
      language: 'python',
      code: 'print(1)',
    }) as any);

    expect(incrementCodingSubmitCount).toHaveBeenCalledTimes(1);
    expect(incrementCodingSubmitCount).toHaveBeenCalledWith('associate:42');
  });

  it('Test 17: CodingAttempt.associateId equals caller.associateId (no cross-user write)', async () => {
    happyPathSetup();

    await POST(buildRequest({
      challengeId: 'ch-1',
      language: 'python',
      code: 'print(1)',
    }) as any);

    const createCall = (prisma.codingAttempt.create as Mock).mock.calls[0][0];
    expect(createCall.data.associateId).toBe(42);
  });

  it('Test: oversized code payload rejected (WR-02 Phase 36 review — max 100_000)', async () => {
    happyPathSetup();

    const hugeCode = 'x'.repeat(100_001);
    const res = await POST(buildRequest({
      challengeId: 'ch-1',
      language: 'python',
      code: hugeCode,
    }) as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
