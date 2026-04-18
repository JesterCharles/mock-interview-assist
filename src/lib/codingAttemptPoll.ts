/**
 * codingAttemptPoll.ts
 *
 * Phase 39 Plan 02 Task 1. Helper for GET /api/coding/attempts/[id]:
 *   - Fetch all Judge0 tokens
 *   - Aggregate per-test results into canonical perCase records
 *   - Compute final verdict via priority roll-up
 *   - Compute server-side weighted score
 *   - Persist attempt + fire-and-forget signal writeback
 *
 * The helper NEVER returns hidden case detail beyond {caseId, passed, durationMs}.
 * Hidden aggregate for the wire is computed by the route (not this helper).
 */

import { prisma } from '@/lib/prisma';
import { getSubmission } from '@/lib/judge0Client';
import { isCodingEnabled } from '@/lib/codingFeatureFlag';
import { normalizeJudge0Verdict, type CanonicalVerdict } from '@/lib/judge0Verdict';
import { mapSignalToScore, type SignalType } from '@/lib/codingSignalService';
import { persistCodingSignalToGapScore } from '@/lib/gapPersistence';
import { loadHiddenTests } from '@/lib/coding-challenge-service';
import { normalizeSqliteResult } from '@/lib/sqlResultNormalizer';
import type { SqlTestCase } from '@/lib/coding-bank-schemas';

export class AttemptNotFoundError extends Error {
  constructor(id: string) {
    super(`Attempt not found: ${id}`);
    this.name = 'AttemptNotFoundError';
  }
}

export interface PerCaseResult {
  caseId: string;
  isHidden: boolean;
  weight: number;
  verdict: CanonicalVerdict;
  passed: boolean;
  stdout: string | null;
  durationMs: number | null;
}

export interface AggregateResult {
  allResolved: boolean;
  perCase: PerCaseResult[];
}

export interface PollResult {
  resolved: boolean;
  verdict: CanonicalVerdict;
  score: number | null;
  visibleTestResults: Array<{
    caseId: string;
    passed: boolean;
    stdout: string | null;
    durationMs: number | null;
  }>;
  hiddenAggregate: { passed: number; total: number };
}

// ---------------------------------------------------------------------------
// Aggregate Judge0 results into perCase records
// ---------------------------------------------------------------------------

function judge0TimeToMs(time: string | null): number | null {
  if (!time) return null;
  const secs = parseFloat(time);
  if (!Number.isFinite(secs)) return null;
  return Math.round(secs * 1000);
}

export async function aggregateJudge0Results(
  tokens: string[],
  cases: Array<{ id: string; isHidden: boolean; weight: number }>,
  getSub = getSubmission,
): Promise<AggregateResult> {
  // Phase 50 (JUDGE-INTEG-02 / D-05): defense-in-depth short-circuit so a
  // background job or test harness never hits Judge0 (placeholder URL) when
  // the feature is flag-dark.
  if (!isCodingEnabled()) {
    return { allResolved: false, perCase: [] };
  }
  if (tokens.length !== cases.length) {
    // Defensive: mismatched counts indicates a bug in submit flow. Treat as not-yet-resolved.
    return { allResolved: false, perCase: [] };
  }

  const results = await Promise.all(tokens.map((t) => getSub(t)));

  const perCase: PerCaseResult[] = results.map((r, idx) => {
    const c = cases[idx];
    const { verdict } = normalizeJudge0Verdict(r.status.id, r.stderr);
    return {
      caseId: c.id,
      isHidden: c.isHidden,
      weight: c.weight,
      verdict,
      passed: verdict === 'pass',
      stdout: r.stdout,
      durationMs: judge0TimeToMs(r.time),
    };
  });

  const allResolved = perCase.every((pc) => pc.verdict !== 'pending');
  return { allResolved, perCase };
}

// ---------------------------------------------------------------------------
// Verdict priority roll-up
//   compile_error > mle > timeout > runtime_error > fail > pass
// ---------------------------------------------------------------------------

const VERDICT_PRIORITY: Record<CanonicalVerdict, number> = {
  compile_error: 6,
  mle: 5,
  timeout: 4,
  runtime_error: 3,
  fail: 2,
  pass: 1,
  pending: 0,
};

export function computeFinalVerdict(perCase: PerCaseResult[]): CanonicalVerdict {
  if (perCase.length === 0) return 'pending';
  let worst: CanonicalVerdict = 'pass';
  let worstPriority = VERDICT_PRIORITY.pass;
  for (const pc of perCase) {
    const p = VERDICT_PRIORITY[pc.verdict];
    if (p > worstPriority) {
      worst = pc.verdict;
      worstPriority = p;
    }
  }
  return worst;
}

// ---------------------------------------------------------------------------
// Weighted score computation
// ---------------------------------------------------------------------------

export function computeScore(perCase: PerCaseResult[]): number {
  if (perCase.length === 0) return 0;
  const totalWeight = perCase.reduce((s, pc) => s + pc.weight, 0);
  if (totalWeight <= 0) return 0;
  const passedWeight = perCase
    .filter((pc) => pc.passed)
    .reduce((s, pc) => s + pc.weight, 0);
  const score = (passedWeight / totalWeight) * 100;
  return Math.max(0, Math.min(100, score));
}

// ---------------------------------------------------------------------------
// Signal type derivation from final verdict + hidden pass counts
// ---------------------------------------------------------------------------

function deriveSignalType(
  finalVerdict: CanonicalVerdict,
  perCase: PerCaseResult[],
): SignalType {
  if (finalVerdict === 'pass') return 'pass';
  if (finalVerdict === 'compile_error') return 'compile_error';
  if (finalVerdict === 'timeout') return 'timeout';
  // For fail / runtime_error / mle: check partial credit
  const totalPassed = perCase.filter((pc) => pc.passed).length;
  if (totalPassed > 0) return 'partial';
  return 'fail';
}

// ---------------------------------------------------------------------------
// Main poll-and-resolve entrypoint
// ---------------------------------------------------------------------------

interface AttemptRow {
  id: string;
  associateId: number;
  verdict: string;
  score: number | null;
  visibleTestResults: unknown;
  hiddenTestResults: unknown;
  judge0Token: string | null;
  submittedAt: Date;
  completedAt: Date | null;
  challengeId: string;
  challenge: {
    skillSlug: string;
    // Phase 41: difficulty + language feed DIFFICULTY_MULTIPLIERS and
    // topic="coding:<language>" on the GapScore upsert.
    difficulty: 'easy' | 'medium' | 'hard';
    language: string;
  } | null;
}

function toPollResultFromPersisted(attempt: AttemptRow): PollResult {
  const hiddenStored = Array.isArray(attempt.hiddenTestResults)
    ? (attempt.hiddenTestResults as Array<{ passed?: boolean }>)
    : [];
  const visibleStored = Array.isArray(attempt.visibleTestResults)
    ? (attempt.visibleTestResults as PollResult['visibleTestResults'])
    : [];
  return {
    resolved: attempt.verdict !== 'pending',
    verdict: attempt.verdict as CanonicalVerdict,
    score: attempt.score,
    visibleTestResults: visibleStored,
    hiddenAggregate: {
      passed: hiddenStored.filter((h) => h.passed === true).length,
      total: hiddenStored.length,
    },
  };
}

export async function pollAndMaybeResolveAttempt(attemptId: string): Promise<PollResult> {
  // Phase 50 (JUDGE-INTEG-02 / D-05): short-circuit before any I/O when the
  // feature is flag-dark. The API route wrapping this (/api/coding/attempts/[id])
  // already returns 503 via its own guard; this is defense-in-depth for any
  // background job or direct helper consumer.
  if (!isCodingEnabled()) {
    return {
      resolved: false,
      verdict: 'pending',
      score: null,
      visibleTestResults: [],
      hiddenAggregate: { passed: 0, total: 0 },
    };
  }

  const attempt = (await prisma.codingAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      verdict: true,
      score: true,
      visibleTestResults: true,
      hiddenTestResults: true,
      judge0Token: true,
      submittedAt: true,
      completedAt: true,
      associateId: true,
      challengeId: true,
      challenge: { select: { skillSlug: true, difficulty: true, language: true } },
    },
  })) as AttemptRow | null;

  if (!attempt) {
    throw new AttemptNotFoundError(attemptId);
  }

  // Short-circuit: already terminal
  if (attempt.verdict !== 'pending') {
    return toPollResultFromPersisted(attempt);
  }

  // Parse stored tokens
  if (!attempt.judge0Token) {
    // No tokens persisted yet — treat as still pending
    return toPollResultFromPersisted(attempt);
  }
  let tokens: string[];
  try {
    const parsed = JSON.parse(attempt.judge0Token);
    if (!Array.isArray(parsed)) throw new Error('not-array');
    tokens = parsed.map((t) => String(t));
  } catch (err) {
    console.error('[codingAttemptPoll] malformed judge0Token for attempt', attemptId, err);
    return toPollResultFromPersisted(attempt);
  }

  // Load test cases in the same order submit used: visible orderIndex, then hidden orderIndex
  const cases = await prisma.codingTestCase.findMany({
    where: { challengeId: attempt.challengeId },
    orderBy: [{ isHidden: 'asc' }, { orderIndex: 'asc' }],
    select: { id: true, isHidden: true, weight: true, orderIndex: true },
  });

  const orderedCases = cases.map((c) => ({
    id: c.id,
    isHidden: c.isHidden,
    weight: c.weight,
  }));

  // Aggregate
  const agg = await aggregateJudge0Results(tokens, orderedCases);
  if (!agg.allResolved) {
    return toPollResultFromPersisted(attempt);
  }

  // Phase 42 §D-06: SQL attempts ignore Judge0's built-in stdout compare and
  // re-derive `passed` via sqlResultNormalizer against trainer-authored
  // expectedRows. Judge0's status.id==3 is used only for pending/error states
  // — once the submission completes, the test outcome is whatever our
  // normalizer says.
  //
  // HIDDEN TEST SHIELD — hidden test `expectedRows` stays in this helper's
  // scope; only the derived `passed` boolean flows out (via perCase).
  if (attempt.challenge?.language === 'sql') {
    // Re-load visible + hidden cases with their SQL-specific fields (expectedRows,
    // flags). Visible cases live in DB sans SQL fields; hidden cases come from
    // the private repo via loadHiddenTests. We re-parse through SqlTestCaseSchema
    // via the bank contract — but since DB strips the rich fields, we match by
    // orderIndex + id. Pragmatic approach: re-fetch via loadHiddenTests for
    // hidden (SQL-aware), and reconstruct visible from the bank loader.
    //
    // Note: this opens a per-poll public-repo fetch for SQL attempts; the
    // public-fetch cache (getCachedPublic) short-circuits via ETag in the
    // steady state, so cost is bounded.
    try {
      const ch = await prisma.codingChallenge.findUnique({
        where: { id: attempt.challengeId },
        select: { slug: true },
      });
      const hiddenSql = ch
        ? ((await loadHiddenTests(ch.slug)) as SqlTestCase[])
        : [];
      // hiddenSql is keyed by id — zip with perCase filtered to hidden in submit order.
      const hiddenById = new Map(hiddenSql.map((tc) => [tc.id, tc]));
      agg.perCase = agg.perCase.map((pc) => {
        if (!pc.isHidden) return pc;
        const tc = hiddenById.get(pc.caseId);
        if (!tc || tc.expectedRows === undefined) return pc;
        const normResult = normalizeSqliteResult(pc.stdout ?? '', tc);
        return {
          ...pc,
          passed: normResult.passed,
          // Preserve underlying verdict classification (pass/fail only — compile/runtime
          // errors should keep their Judge0-derived verdict).
          verdict:
            pc.verdict === 'pass' || pc.verdict === 'fail'
              ? normResult.passed
                ? 'pass'
                : 'fail'
              : pc.verdict,
        };
      });
    } catch (err) {
      console.error(
        '[codingAttemptPoll] SQL re-normalize failed; falling back to Judge0 verdicts',
        attemptId,
        err,
      );
    }
  }

  // Compute final verdict + score
  const finalVerdict = computeFinalVerdict(agg.perCase);
  const score = computeScore(agg.perCase);

  // Build persisted shapes
  const visibleResults = agg.perCase
    .filter((pc) => !pc.isHidden)
    .map((pc) => ({
      caseId: pc.caseId,
      passed: pc.passed,
      stdout: pc.stdout,
      durationMs: pc.durationMs,
    }));

  const hiddenResults = agg.perCase
    .filter((pc) => pc.isHidden)
    .map((pc) => ({
      caseId: pc.caseId,
      passed: pc.passed,
      durationMs: pc.durationMs,
    }));

  // Persist (race-safe: only update if still pending)
  try {
    await prisma.codingAttempt.update({
      where: { id: attemptId, verdict: 'pending' },
      data: {
        verdict: finalVerdict,
        score,
        visibleTestResults: visibleResults,
        hiddenTestResults: hiddenResults,
        completedAt: new Date(),
      },
    });
  } catch (err) {
    // Race condition: another poll won. Not fatal — re-read and return persisted state.
    console.warn('[codingAttemptPoll] race on resolve for', attemptId, err);
    const refreshed = (await prisma.codingAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        verdict: true,
        score: true,
        visibleTestResults: true,
        hiddenTestResults: true,
        judge0Token: true,
        submittedAt: true,
        completedAt: true,
        associateId: true,
        challengeId: true,
        challenge: { select: { skillSlug: true, difficulty: true, language: true } },
      },
    })) as AttemptRow | null;
    if (refreshed) return toPollResultFromPersisted(refreshed);
    throw err;
  }

  // Fire-and-forget signal writeback (non-blocking — D-11 contract).
  // WR-01 (Phase 39 review): must NOT await — a slow/failed signal write
  // must not delay the poll response. Errors are logged, never thrown.
  const signalType = deriveSignalType(finalVerdict, agg.perCase);
  const skillSlug = attempt.challenge?.skillSlug ?? 'unknown';
  // For partial, compute testsPassed/totalTests from all cases
  const totalTests = agg.perCase.length;
  const testsPassed = agg.perCase.filter((pc) => pc.passed).length;
  const mapped = mapSignalToScore(
    signalType === 'partial'
      ? { skillSlug, signalType, testsPassed, totalTests }
      : { skillSlug, signalType },
  );

  void prisma.codingSkillSignal
    .upsert({
      where: { attemptId },
      create: {
        attemptId,
        skillSlug: mapped.skillSlug,
        signalType,
        weight: mapped.weight,
        mappedScore: mapped.rawScore,
      },
      update: {},
    })
    .catch((err) => {
      console.error('[codingAttemptPoll] signal writeback failed for', attemptId, err);
    });

  // Phase 41: feed the coding signal into GapScore with difficulty weighting.
  // Fire-and-forget — must NOT delay the poll response (CODING-SCORE-01, 5s
  // budget; upsert is < 100ms). Guarded by challenge presence so malformed
  // data cannot throw synchronously.
  if (attempt.challenge) {
    void persistCodingSignalToGapScore(
      {
        attemptId,
        skillSlug: mapped.skillSlug,
        signalType,
        weight: mapped.weight,
        mappedScore: mapped.rawScore,
      },
      {
        difficulty: attempt.challenge.difficulty,
        language: attempt.challenge.language,
      },
      attempt.associateId,
    ).catch((gapErr) => {
      console.error(
        '[codingAttemptPoll] persistCodingSignalToGapScore failed for',
        attemptId,
        gapErr instanceof Error ? gapErr.message : String(gapErr),
      );
    });
  }

  const hiddenPassedCount = agg.perCase.filter((pc) => pc.isHidden && pc.passed).length;
  const hiddenTotal = agg.perCase.filter((pc) => pc.isHidden).length;

  return {
    resolved: true,
    verdict: finalVerdict,
    score,
    visibleTestResults: visibleResults,
    hiddenAggregate: { passed: hiddenPassedCount, total: hiddenTotal },
  };
}
