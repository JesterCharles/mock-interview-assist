/**
 * codingAttemptPoll.test.ts
 *
 * Phase 39 Plan 02 Task 1. Unit tests for the poll helper: aggregation,
 * verdict roll-up, score computation, idempotent persistence, non-blocking
 * signal writeback.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ---------- Mocks ----------
vi.mock('@/lib/prisma', () => ({
  prisma: {
    codingAttempt: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    codingTestCase: { findMany: vi.fn() },
    codingChallenge: { findUnique: vi.fn() },
    codingSkillSignal: { upsert: vi.fn() },
  },
}));

vi.mock('@/lib/judge0Client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/judge0Client')>('@/lib/judge0Client');
  return {
    ...actual,
    getSubmission: vi.fn(),
  };
});

// Phase 41: mock the GapScore writeback so we can assert the fire-and-forget
// call shape without spinning up a Prisma transaction harness.
vi.mock('@/lib/gapPersistence', () => ({
  persistCodingSignalToGapScore: vi.fn(async () => undefined),
}));

import {
  aggregateJudge0Results,
  computeFinalVerdict,
  computeScore,
  pollAndMaybeResolveAttempt,
  AttemptNotFoundError,
  type PerCaseResult,
} from './codingAttemptPoll';
import { prisma } from '@/lib/prisma';
import * as judge0Client from '@/lib/judge0Client';
import { persistCodingSignalToGapScore } from '@/lib/gapPersistence';

function j0Result(status: number, overrides: Partial<{ stdout: string; stderr: string; time: string; memory: number; token: string }> = {}) {
  return {
    token: overrides.token ?? 'tok',
    stdout: overrides.stdout ?? null,
    stderr: overrides.stderr ?? null,
    compile_output: null,
    message: null,
    status: { id: status, description: 'mock' },
    time: overrides.time ?? '0.010',
    memory: overrides.memory ?? 1024,
    exit_code: 0,
  };
}

describe('aggregateJudge0Results', () => {
  beforeEach(() => vi.resetAllMocks());

  it('any token still queued → allResolved: false', async () => {
    (judge0Client.getSubmission as Mock)
      .mockResolvedValueOnce(j0Result(3, { token: 't1' }))
      .mockResolvedValueOnce(j0Result(1, { token: 't2' }));

    const result = await aggregateJudge0Results(
      ['t1', 't2'],
      [
        { id: 'c1', isHidden: false, weight: 1 },
        { id: 'c2', isHidden: true, weight: 1 },
      ],
    );
    expect(result.allResolved).toBe(false);
  });

  it('all tokens resolved with status 3 → all pass', async () => {
    (judge0Client.getSubmission as Mock).mockResolvedValue(j0Result(3));

    const result = await aggregateJudge0Results(
      ['t1', 't2'],
      [
        { id: 'c1', isHidden: false, weight: 1 },
        { id: 'c2', isHidden: true, weight: 1 },
      ],
    );
    expect(result.allResolved).toBe(true);
    expect(result.perCase).toHaveLength(2);
    for (const pc of result.perCase) {
      expect(pc.passed).toBe(true);
      expect(pc.verdict).toBe('pass');
    }
  });

  it('visible fails (status 4) but hidden passes — still allResolved', async () => {
    (judge0Client.getSubmission as Mock)
      .mockResolvedValueOnce(j0Result(4, { token: 't1' }))
      .mockResolvedValueOnce(j0Result(3, { token: 't2' }));

    const result = await aggregateJudge0Results(
      ['t1', 't2'],
      [
        { id: 'c1', isHidden: false, weight: 1 },
        { id: 'c2', isHidden: true, weight: 2 },
      ],
    );
    expect(result.allResolved).toBe(true);
    expect(result.perCase[0].passed).toBe(false);
    expect(result.perCase[1].passed).toBe(true);
  });

  it('propagates stderr for MLE detection', async () => {
    (judge0Client.getSubmission as Mock).mockResolvedValue(
      j0Result(11, { stderr: 'MemoryError: out of memory' }),
    );

    const result = await aggregateJudge0Results(
      ['t1'],
      [{ id: 'c1', isHidden: false, weight: 1 }],
    );
    expect(result.allResolved).toBe(true);
    expect(result.perCase[0].verdict).toBe('mle');
  });
});

describe('computeFinalVerdict', () => {
  const mk = (verdict: PerCaseResult['verdict']): PerCaseResult => ({
    caseId: 'x', isHidden: false, weight: 1, verdict, passed: verdict === 'pass', stdout: null, durationMs: null,
  });

  it('all pass → pass', () => {
    expect(computeFinalVerdict([mk('pass'), mk('pass')])).toBe('pass');
  });

  it('any fail → fail', () => {
    expect(computeFinalVerdict([mk('pass'), mk('fail')])).toBe('fail');
  });

  it('any compile_error takes highest priority', () => {
    expect(computeFinalVerdict([mk('compile_error'), mk('timeout'), mk('fail')])).toBe('compile_error');
  });

  it('mle beats timeout', () => {
    expect(computeFinalVerdict([mk('mle'), mk('timeout'), mk('fail')])).toBe('mle');
  });

  it('timeout beats runtime_error', () => {
    expect(computeFinalVerdict([mk('timeout'), mk('runtime_error'), mk('fail')])).toBe('timeout');
  });

  it('runtime_error beats fail', () => {
    expect(computeFinalVerdict([mk('runtime_error'), mk('fail')])).toBe('runtime_error');
  });

  it('priority compile_error > mle > timeout > runtime_error > fail > pass', () => {
    expect(computeFinalVerdict([mk('pass')])).toBe('pass');
    expect(computeFinalVerdict([mk('pass'), mk('fail')])).toBe('fail');
    expect(computeFinalVerdict([mk('pass'), mk('runtime_error')])).toBe('runtime_error');
    expect(computeFinalVerdict([mk('pass'), mk('mle')])).toBe('mle');
  });
});

describe('computeScore', () => {
  const mk = (passed: boolean, weight: number): PerCaseResult => ({
    caseId: 'x', isHidden: false, weight, verdict: passed ? 'pass' : 'fail', passed, stdout: null, durationMs: null,
  });

  it('all pass, weights [1,1,2] → 100', () => {
    expect(computeScore([mk(true, 1), mk(true, 1), mk(true, 2)])).toBe(100);
  });

  it('2 of 3 pass, weights [1,2,1] → 75', () => {
    // pass [1,2] → (1+2)/(1+2+1) * 100 = 75
    expect(computeScore([mk(true, 1), mk(true, 2), mk(false, 1)])).toBe(75);
  });

  it('zero-weight edge → 0 (not NaN)', () => {
    expect(computeScore([mk(true, 0), mk(false, 0)])).toBe(0);
  });

  it('score always clamped to [0, 100]', () => {
    expect(computeScore([mk(true, 1)])).toBeLessThanOrEqual(100);
    expect(computeScore([mk(false, 1)])).toBeGreaterThanOrEqual(0);
  });

  it('empty perCase → 0', () => {
    expect(computeScore([])).toBe(0);
  });
});

describe('pollAndMaybeResolveAttempt', () => {
  beforeEach(() => vi.resetAllMocks());

  it('attempt not found → throws AttemptNotFoundError', async () => {
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue(null);

    await expect(pollAndMaybeResolveAttempt('missing')).rejects.toThrow(AttemptNotFoundError);
  });

  it('attempt already terminal → short-circuit, no Judge0 calls', async () => {
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue({
      id: 'a-1',
      verdict: 'pass',
      score: 100,
      visibleTestResults: [{ caseId: 'c1', passed: true, stdout: 'ok', durationMs: 10 }],
      hiddenTestResults: [{ caseId: 'h1', passed: true, durationMs: 10 }],
      judge0Token: JSON.stringify(['t1']),
      submittedAt: new Date('2026-01-01T00:00:00Z'),
      completedAt: new Date('2026-01-01T00:01:00Z'),
      challengeId: 'ch-1',
      challenge: { skillSlug: 'py' },
    });

    const result = await pollAndMaybeResolveAttempt('a-1');
    expect(result.resolved).toBe(true);
    expect(result.verdict).toBe('pass');
    expect(judge0Client.getSubmission).not.toHaveBeenCalled();
    expect(prisma.codingAttempt.update).not.toHaveBeenCalled();
  });

  it('pending + judge0 still running → verdict stays pending, no DB write', async () => {
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue({
      id: 'a-1',
      verdict: 'pending',
      score: null,
      visibleTestResults: [],
      hiddenTestResults: [],
      judge0Token: JSON.stringify(['t1', 't2']),
      submittedAt: new Date(),
      completedAt: null,
      challengeId: 'ch-1',
      challenge: { skillSlug: 'py' },
    });
    (prisma.codingTestCase.findMany as Mock).mockResolvedValue([
      { id: 'c1', isHidden: false, weight: 1, orderIndex: 0 },
    ]);
    // Simulate 2 tokens but only 1 visible case — hidden loaded separately would be needed.
    // For simplicity here: stub 2 getSubmission calls, 1 in-queue.
    (judge0Client.getSubmission as Mock)
      .mockResolvedValueOnce(j0Result(1))
      .mockResolvedValueOnce(j0Result(3));

    const result = await pollAndMaybeResolveAttempt('a-1');
    expect(result.resolved).toBe(false);
    expect(result.verdict).toBe('pending');
    expect(prisma.codingAttempt.update).not.toHaveBeenCalled();
    expect(prisma.codingSkillSignal.upsert).not.toHaveBeenCalled();
  });

  it('pending + all resolved → updates attempt, writes signal, returns resolved', async () => {
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue({
      id: 'a-1',
      verdict: 'pending',
      score: null,
      visibleTestResults: [],
      hiddenTestResults: [],
      judge0Token: JSON.stringify(['t-v', 't-h']),
      submittedAt: new Date('2026-01-01T00:00:00Z'),
      completedAt: null,
      challengeId: 'ch-1',
      challenge: { skillSlug: 'python-basics' },
    });
    (prisma.codingTestCase.findMany as Mock).mockResolvedValue([
      { id: 'v1', isHidden: false, weight: 1, orderIndex: 0 },
      { id: 'h1', isHidden: true, weight: 1, orderIndex: 0 },
    ]);
    (judge0Client.getSubmission as Mock)
      .mockResolvedValueOnce(j0Result(3, { stdout: 'out-v' }))
      .mockResolvedValueOnce(j0Result(3, { stdout: 'out-h' }));

    (prisma.codingAttempt.update as Mock).mockResolvedValue({ id: 'a-1' });
    (prisma.codingSkillSignal.upsert as Mock).mockResolvedValue({ id: 's-1' });

    const result = await pollAndMaybeResolveAttempt('a-1');
    expect(result.resolved).toBe(true);
    expect(result.verdict).toBe('pass');
    expect(result.score).toBe(100);

    // Attempt update must include verdict, score, completedAt, visible + hidden results
    const updateCall = (prisma.codingAttempt.update as Mock).mock.calls[0][0];
    expect(updateCall.data.verdict).toBe('pass');
    expect(updateCall.data.score).toBe(100);
    expect(updateCall.data.completedAt).toBeInstanceOf(Date);

    // Signal written with attemptId unique key
    expect(prisma.codingSkillSignal.upsert).toHaveBeenCalledOnce();
    const upsertCall = (prisma.codingSkillSignal.upsert as Mock).mock.calls[0][0];
    expect(upsertCall.where).toEqual({ attemptId: 'a-1' });
  });

  it('signal upsert uses attemptId unique key (idempotent on repeat)', async () => {
    // Setup resolved flow
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue({
      id: 'a-1',
      verdict: 'pending',
      score: null,
      visibleTestResults: [],
      hiddenTestResults: [],
      judge0Token: JSON.stringify(['t']),
      submittedAt: new Date(),
      completedAt: null,
      challengeId: 'ch-1',
      challenge: { skillSlug: 'py' },
    });
    (prisma.codingTestCase.findMany as Mock).mockResolvedValue([
      { id: 'v1', isHidden: false, weight: 1, orderIndex: 0 },
    ]);
    (judge0Client.getSubmission as Mock).mockResolvedValue(j0Result(3));
    (prisma.codingAttempt.update as Mock).mockResolvedValue({ id: 'a-1' });
    (prisma.codingSkillSignal.upsert as Mock).mockResolvedValue({ id: 's-1' });

    await pollAndMaybeResolveAttempt('a-1');
    expect(prisma.codingSkillSignal.upsert).toHaveBeenCalledOnce();
    const call = (prisma.codingSkillSignal.upsert as Mock).mock.calls[0][0];
    expect(call.where).toEqual({ attemptId: 'a-1' });
    // Upsert should use update:{} so double-fire is a no-op
    expect(call.update).toEqual({});
  });

  it('signalType derivation: fail with some hidden passed → partial', async () => {
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue({
      id: 'a-1',
      verdict: 'pending',
      score: null,
      visibleTestResults: [],
      hiddenTestResults: [],
      judge0Token: JSON.stringify(['t-v', 't-h1', 't-h2']),
      submittedAt: new Date(),
      completedAt: null,
      challengeId: 'ch-1',
      challenge: { skillSlug: 'py' },
    });
    (prisma.codingTestCase.findMany as Mock).mockResolvedValue([
      { id: 'v1', isHidden: false, weight: 1, orderIndex: 0 },
      { id: 'h1', isHidden: true, weight: 1, orderIndex: 0 },
      { id: 'h2', isHidden: true, weight: 1, orderIndex: 1 },
    ]);
    (judge0Client.getSubmission as Mock)
      .mockResolvedValueOnce(j0Result(3)) // visible pass
      .mockResolvedValueOnce(j0Result(3)) // hidden 1 pass
      .mockResolvedValueOnce(j0Result(4)); // hidden 2 fail
    (prisma.codingAttempt.update as Mock).mockResolvedValue({ id: 'a-1' });
    (prisma.codingSkillSignal.upsert as Mock).mockResolvedValue({ id: 's-1' });

    const result = await pollAndMaybeResolveAttempt('a-1');
    expect(result.verdict).toBe('fail'); // any hidden fail → fail
    const signalCall = (prisma.codingSkillSignal.upsert as Mock).mock.calls[0][0];
    expect(signalCall.create.signalType).toBe('partial');
  });

  it('signalType derivation: compile_error', async () => {
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue({
      id: 'a-2',
      verdict: 'pending',
      score: null,
      visibleTestResults: [],
      hiddenTestResults: [],
      judge0Token: JSON.stringify(['t']),
      submittedAt: new Date(),
      completedAt: null,
      challengeId: 'ch',
      challenge: { skillSlug: 'py' },
    });
    (prisma.codingTestCase.findMany as Mock).mockResolvedValue([
      { id: 'v', isHidden: false, weight: 1, orderIndex: 0 },
    ]);
    (judge0Client.getSubmission as Mock).mockResolvedValue(j0Result(6));
    (prisma.codingAttempt.update as Mock).mockResolvedValue({ id: 'a-2' });
    (prisma.codingSkillSignal.upsert as Mock).mockResolvedValue({ id: 's' });

    const result = await pollAndMaybeResolveAttempt('a-2');
    expect(result.verdict).toBe('compile_error');
    const call = (prisma.codingSkillSignal.upsert as Mock).mock.calls[0][0];
    expect(call.create.signalType).toBe('compile_error');
  });

  it('signal writeback throws → error caught, poll still resolves', async () => {
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue({
      id: 'a-3',
      verdict: 'pending',
      score: null,
      visibleTestResults: [],
      hiddenTestResults: [],
      judge0Token: JSON.stringify(['t']),
      submittedAt: new Date(),
      completedAt: null,
      challengeId: 'ch',
      challenge: { skillSlug: 'py' },
    });
    (prisma.codingTestCase.findMany as Mock).mockResolvedValue([
      { id: 'v', isHidden: false, weight: 1, orderIndex: 0 },
    ]);
    (judge0Client.getSubmission as Mock).mockResolvedValue(j0Result(3));
    (prisma.codingAttempt.update as Mock).mockResolvedValue({ id: 'a-3' });
    (prisma.codingSkillSignal.upsert as Mock).mockRejectedValue(new Error('boom'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await pollAndMaybeResolveAttempt('a-3');
    expect(result.resolved).toBe(true);
    expect(result.verdict).toBe('pass');

    // WR-01: signal writeback is fire-and-forget — the .catch runs on a later
    // microtask after the function returns. Flush the queue before asserting.
    await new Promise((resolve) => setImmediate(resolve));
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('WR-01: signal writeback does NOT block poll return (fire-and-forget)', async () => {
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue({
      id: 'a-ff',
      verdict: 'pending',
      score: null,
      visibleTestResults: [],
      hiddenTestResults: [],
      judge0Token: JSON.stringify(['t']),
      submittedAt: new Date(),
      completedAt: null,
      challengeId: 'ch',
      challenge: { skillSlug: 'py' },
    });
    (prisma.codingTestCase.findMany as Mock).mockResolvedValue([
      { id: 'v', isHidden: false, weight: 1, orderIndex: 0 },
    ]);
    (judge0Client.getSubmission as Mock).mockResolvedValue(j0Result(3));
    (prisma.codingAttempt.update as Mock).mockResolvedValue({ id: 'a-ff' });

    // Signal upsert that resolves only after an external latch — if the poll
    // awaited it, the test would hang.
    let resolveSignal: (value: unknown) => void = () => {};
    const signalPromise = new Promise((r) => {
      resolveSignal = r;
    });
    (prisma.codingSkillSignal.upsert as Mock).mockReturnValue(signalPromise);

    const start = Date.now();
    const result = await pollAndMaybeResolveAttempt('a-ff');
    const elapsed = Date.now() - start;

    // Poll must return promptly even while signal is still pending.
    expect(result.resolved).toBe(true);
    expect(elapsed).toBeLessThan(100);
    expect(prisma.codingSkillSignal.upsert).toHaveBeenCalledOnce();

    // Clean up dangling promise so Vitest doesn't see an unhandled rejection.
    resolveSignal({ id: 's' });
    await signalPromise;
  });

  it('hiddenTestResults stored as server-detail Array (caseId, passed, durationMs only — no stdin/expected)', async () => {
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue({
      id: 'a-4',
      verdict: 'pending',
      score: null,
      visibleTestResults: [],
      hiddenTestResults: [],
      judge0Token: JSON.stringify(['t-v', 't-h']),
      submittedAt: new Date(),
      completedAt: null,
      challengeId: 'ch',
      challenge: { skillSlug: 'py' },
    });
    (prisma.codingTestCase.findMany as Mock).mockResolvedValue([
      { id: 'v1', isHidden: false, weight: 1, orderIndex: 0 },
      { id: 'h1', isHidden: true, weight: 1, orderIndex: 0 },
    ]);
    (judge0Client.getSubmission as Mock).mockResolvedValue(j0Result(3));
    (prisma.codingAttempt.update as Mock).mockResolvedValue({ id: 'a-4' });
    (prisma.codingSkillSignal.upsert as Mock).mockResolvedValue({ id: 's' });

    await pollAndMaybeResolveAttempt('a-4');
    const call = (prisma.codingAttempt.update as Mock).mock.calls[0][0];
    const hiddenStored = call.data.hiddenTestResults as Array<Record<string, unknown>>;
    expect(Array.isArray(hiddenStored)).toBe(true);
    for (const h of hiddenStored) {
      expect(Object.keys(h).sort()).toEqual(['caseId', 'durationMs', 'passed']);
      expect(h).not.toHaveProperty('stdin');
      expect(h).not.toHaveProperty('expectedStdout');
      expect(h).not.toHaveProperty('stdout');
    }
  });

  it('visibleTestResults stored with caseId, passed, stdout, durationMs', async () => {
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue({
      id: 'a-5',
      verdict: 'pending',
      score: null,
      visibleTestResults: [],
      hiddenTestResults: [],
      judge0Token: JSON.stringify(['t-v']),
      submittedAt: new Date(),
      completedAt: null,
      challengeId: 'ch',
      challenge: { skillSlug: 'py' },
    });
    (prisma.codingTestCase.findMany as Mock).mockResolvedValue([
      { id: 'v1', isHidden: false, weight: 1, orderIndex: 0 },
    ]);
    (judge0Client.getSubmission as Mock).mockResolvedValue(j0Result(3, { stdout: 'hello' }));
    (prisma.codingAttempt.update as Mock).mockResolvedValue({ id: 'a-5' });
    (prisma.codingSkillSignal.upsert as Mock).mockResolvedValue({ id: 's' });

    await pollAndMaybeResolveAttempt('a-5');
    const call = (prisma.codingAttempt.update as Mock).mock.calls[0][0];
    const visible = call.data.visibleTestResults as Array<Record<string, unknown>>;
    expect(visible[0]).toMatchObject({ caseId: 'v1', passed: true, stdout: 'hello' });
  });

  // -------------------------------------------------------------------------
  // Phase 41: GapScore fire-and-forget wiring
  // -------------------------------------------------------------------------
  it('fires persistCodingSignalToGapScore with signal + challenge + associateId on resolve', async () => {
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue({
      id: 'a-gap',
      associateId: 77,
      verdict: 'pending',
      score: null,
      visibleTestResults: [],
      hiddenTestResults: [],
      judge0Token: JSON.stringify(['t']),
      submittedAt: new Date(),
      completedAt: null,
      challengeId: 'ch-gap',
      challenge: { skillSlug: 'python-fundamentals', difficulty: 'hard', language: 'python' },
    });
    (prisma.codingTestCase.findMany as Mock).mockResolvedValue([
      { id: 'v1', isHidden: false, weight: 1, orderIndex: 0 },
    ]);
    (judge0Client.getSubmission as Mock).mockResolvedValue(j0Result(3));
    (prisma.codingAttempt.update as Mock).mockResolvedValue({ id: 'a-gap' });
    (prisma.codingSkillSignal.upsert as Mock).mockResolvedValue({ id: 's-gap' });

    await pollAndMaybeResolveAttempt('a-gap');

    // The call is fire-and-forget — flush the microtask queue so the
    // .catch() (or resolved promise) settles before assertion.
    await Promise.resolve();

    expect(persistCodingSignalToGapScore).toHaveBeenCalledOnce();
    const [signalArg, challengeArg, associateIdArg] =
      (persistCodingSignalToGapScore as Mock).mock.calls[0];

    expect(signalArg).toMatchObject({
      attemptId: 'a-gap',
      skillSlug: 'python-fundamentals',
      signalType: 'pass',
    });
    expect(challengeArg).toEqual({ difficulty: 'hard', language: 'python' });
    expect(associateIdArg).toBe(77);
  });

  it('persistCodingSignalToGapScore rejection is swallowed (poll still resolves)', async () => {
    (prisma.codingAttempt.findUnique as Mock).mockResolvedValue({
      id: 'a-gap-err',
      associateId: 77,
      verdict: 'pending',
      score: null,
      visibleTestResults: [],
      hiddenTestResults: [],
      judge0Token: JSON.stringify(['t']),
      submittedAt: new Date(),
      completedAt: null,
      challengeId: 'ch',
      challenge: { skillSlug: 'py', difficulty: 'medium', language: 'python' },
    });
    (prisma.codingTestCase.findMany as Mock).mockResolvedValue([
      { id: 'v1', isHidden: false, weight: 1, orderIndex: 0 },
    ]);
    (judge0Client.getSubmission as Mock).mockResolvedValue(j0Result(3));
    (prisma.codingAttempt.update as Mock).mockResolvedValue({ id: 'a-gap-err' });
    (prisma.codingSkillSignal.upsert as Mock).mockResolvedValue({ id: 's' });
    (persistCodingSignalToGapScore as Mock).mockRejectedValueOnce(new Error('gap boom'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await pollAndMaybeResolveAttempt('a-gap-err');
    await Promise.resolve(); // let .catch run
    await Promise.resolve();

    expect(result.resolved).toBe(true);
    expect(result.verdict).toBe('pass');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
