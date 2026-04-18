/**
 * route.test.ts — GET /api/coding/attempts/[id]
 *
 * Phase 39 Plan 02 Task 2. Tests for auth + authz + Zod output shield +
 * idempotent poll + hidden-test shield.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

vi.mock('@/lib/identity', () => ({
  getCallerIdentity: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    codingAttempt: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/codingAttemptPoll', async () => {
  const actual = await vi.importActual<typeof import('@/lib/codingAttemptPoll')>(
    '@/lib/codingAttemptPoll',
  );
  return {
    ...actual,
    pollAndMaybeResolveAttempt: vi.fn(),
  };
});

import { GET } from './route';
import { getCallerIdentity } from '@/lib/identity';
import { prisma } from '@/lib/prisma';
import * as pollHelper from '@/lib/codingAttemptPoll';

const HIDDEN_SENTINEL = 'HIDDEN_FIXTURE_SHOULD_NEVER_LEAK';

function buildReq(): Request {
  return new Request('http://localhost/api/coding/attempts/abc-1');
}

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

function standardPollResult(overrides: Partial<{
  resolved: boolean;
  verdict: string;
  score: number | null;
  visibleTestResults: unknown;
  hiddenAggregate: unknown;
}> = {}) {
  return {
    resolved: overrides.resolved ?? true,
    verdict: overrides.verdict ?? 'pass',
    score: overrides.score ?? 100,
    visibleTestResults: overrides.visibleTestResults ?? [
      { caseId: 'v1', passed: true, stdout: 'ok', durationMs: 10 },
    ],
    hiddenAggregate: overrides.hiddenAggregate ?? { passed: 1, total: 1 },
  };
}

function standardAttemptRow(overrides: Partial<{
  associateId: number;
  verdict: string;
  completedAt: Date | null;
}> = {}) {
  return {
    id: 'abc-1',
    associateId: overrides.associateId ?? 42,
    verdict: overrides.verdict ?? 'pass',
    submittedAt: new Date('2026-01-01T00:00:00Z'),
    completedAt:
      'completedAt' in overrides
        ? overrides.completedAt
        : new Date('2026-01-01T00:01:00Z'),
  };
}

describe('GET /api/coding/attempts/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('Test 1: anonymous → 401 AUTH_REQUIRED', async () => {
    (getCallerIdentity as Mock).mockResolvedValue({ kind: 'anonymous' });

    const res = await GET(buildReq() as any, paramsFor('abc-1'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTH_REQUIRED');
  });

  it('Test 2: associate caller whose associateId ≠ attempt.associateId → 403 FORBIDDEN', async () => {
    (getCallerIdentity as Mock).mockResolvedValue({
      kind: 'associate', userId: 'u', email: 'a', associateId: 99, associateSlug: 's',
    });
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue(standardAttemptRow({ associateId: 42 }));

    const res = await GET(buildReq() as any, paramsFor('abc-1'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('Test 3: associate caller whose associateId === attempt.associateId → 200', async () => {
    (getCallerIdentity as Mock).mockResolvedValue({
      kind: 'associate', userId: 'u', email: 'a', associateId: 42, associateSlug: 's',
    });
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue(standardAttemptRow({ associateId: 42 }));
    (pollHelper.pollAndMaybeResolveAttempt as Mock).mockResolvedValue(standardPollResult());

    const res = await GET(buildReq() as any, paramsFor('abc-1'));
    expect(res.status).toBe(200);
  });

  it('Test 4: trainer caller → 200 regardless of ownership', async () => {
    (getCallerIdentity as Mock).mockResolvedValue({
      kind: 'trainer', userId: 't-1', email: 't@x.com',
    });
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue(standardAttemptRow({ associateId: 42 }));
    (pollHelper.pollAndMaybeResolveAttempt as Mock).mockResolvedValue(standardPollResult());

    const res = await GET(buildReq() as any, paramsFor('abc-1'));
    expect(res.status).toBe(200);
  });

  it('Test 5: attempt id not found → 404 NOT_FOUND', async () => {
    (getCallerIdentity as Mock).mockResolvedValue({
      kind: 'associate', userId: 'u', email: 'a', associateId: 42, associateSlug: 's',
    });
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue(null);

    const res = await GET(buildReq() as any, paramsFor('missing'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('Test 6: pending attempt → response with pending verdict, empty visible, zero hidden aggregate', async () => {
    (getCallerIdentity as Mock).mockResolvedValue({
      kind: 'associate', userId: 'u', email: 'a', associateId: 42, associateSlug: 's',
    });
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue(standardAttemptRow({
      verdict: 'pending',
      completedAt: null,
    }));
    (pollHelper.pollAndMaybeResolveAttempt as Mock).mockResolvedValue({
      resolved: false,
      verdict: 'pending',
      score: null,
      visibleTestResults: [],
      hiddenAggregate: { passed: 0, total: 2 },
    });

    const res = await GET(buildReq() as any, paramsFor('abc-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verdict).toBe('pending');
    expect(body.score).toBeNull();
    expect(body.visibleTestResults).toEqual([]);
    expect(body.hiddenTestResults).toEqual({ passed: 0, total: 2 });
    expect(body.completedAt).toBeNull();
  });

  it('Test 7: resolved attempt response shape — no stdin/expectedStdout anywhere', async () => {
    (getCallerIdentity as Mock).mockResolvedValue({
      kind: 'associate', userId: 'u', email: 'a', associateId: 42, associateSlug: 's',
    });
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue(standardAttemptRow());
    (pollHelper.pollAndMaybeResolveAttempt as Mock).mockResolvedValue(standardPollResult({
      verdict: 'fail',
      score: 50,
    }));

    const res = await GET(buildReq() as any, paramsFor('abc-1'));
    const body = await res.json();
    expect(body.verdict).toBe('fail');
    expect(body.score).toBe(50);
    expect(body.hiddenTestResults).toEqual({ passed: 1, total: 1 });

    // No forbidden keys anywhere
    const text = JSON.stringify(body);
    expect(text).not.toContain('stdin');
    expect(text).not.toContain('expectedStdout');
  });

  it('Test 8: malformed hiddenAggregate (array instead of object) → 500 INTERNAL (shield)', async () => {
    (getCallerIdentity as Mock).mockResolvedValue({
      kind: 'associate', userId: 'u', email: 'a', associateId: 42, associateSlug: 's',
    });
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue(standardAttemptRow());
    // Helper returns hiddenAggregate as array → must trip shield
    (pollHelper.pollAndMaybeResolveAttempt as Mock).mockResolvedValue({
      resolved: true,
      verdict: 'pass',
      score: 100,
      visibleTestResults: [],
      hiddenAggregate: [
        { caseId: 'h1', stdin: HIDDEN_SENTINEL, expectedStdout: 'secret', passed: true },
      ],
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET(buildReq() as any, paramsFor('abc-1'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL');
    // Shield means response body does NOT leak the hidden sentinel
    const text = JSON.stringify(body);
    expect(text).not.toContain(HIDDEN_SENTINEL);

    consoleSpy.mockRestore();
  });

  it('Test 9: repeat polls on resolved attempt — helper called once per GET (route-level idempotency delegated to helper)', async () => {
    (getCallerIdentity as Mock).mockResolvedValue({
      kind: 'associate', userId: 'u', email: 'a', associateId: 42, associateSlug: 's',
    });
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue(standardAttemptRow());
    (pollHelper.pollAndMaybeResolveAttempt as Mock).mockResolvedValue(standardPollResult());

    await GET(buildReq() as any, paramsFor('abc-1'));
    await GET(buildReq() as any, paramsFor('abc-1'));

    // Each GET calls helper once; helper itself handles short-circuit / idempotency
    expect(pollHelper.pollAndMaybeResolveAttempt).toHaveBeenCalledTimes(2);
  });

  it('Test 10: helper throws AttemptNotFoundError → 404 NOT_FOUND', async () => {
    (getCallerIdentity as Mock).mockResolvedValue({
      kind: 'associate', userId: 'u', email: 'a', associateId: 42, associateSlug: 's',
    });
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue(standardAttemptRow());
    (pollHelper.pollAndMaybeResolveAttempt as Mock).mockRejectedValue(
      new pollHelper.AttemptNotFoundError('abc-1'),
    );

    const res = await GET(buildReq() as any, paramsFor('abc-1'));
    expect(res.status).toBe(404);
  });

  it('Test 11: hidden-test shield — all scenarios', async () => {
    (getCallerIdentity as Mock).mockResolvedValue({
      kind: 'associate', userId: 'u', email: 'a', associateId: 42, associateSlug: 's',
    });
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue(standardAttemptRow());
    (pollHelper.pollAndMaybeResolveAttempt as Mock).mockResolvedValue(standardPollResult());

    const res = await GET(buildReq() as any, paramsFor('abc-1'));
    const text = await res.text();
    // Even standard result passes through — no stdin/expected fields present
    expect(text).not.toMatch(/stdin/i);
    expect(text).not.toMatch(/expectedStdout/i);
  });

  it('Test 12: hiddenTestResults is strictly { passed, total } object', async () => {
    (getCallerIdentity as Mock).mockResolvedValue({
      kind: 'associate', userId: 'u', email: 'a', associateId: 42, associateSlug: 's',
    });
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue(standardAttemptRow());
    (pollHelper.pollAndMaybeResolveAttempt as Mock).mockResolvedValue(standardPollResult());

    const res = await GET(buildReq() as any, paramsFor('abc-1'));
    const body = await res.json();
    expect(typeof body.hiddenTestResults).toBe('object');
    expect(Array.isArray(body.hiddenTestResults)).toBe(false);
    expect(Object.keys(body.hiddenTestResults).sort()).toEqual(['passed', 'total']);
  });
});
