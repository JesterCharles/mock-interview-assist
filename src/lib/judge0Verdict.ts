/**
 * judge0Verdict.ts
 *
 * Pure mapping from Judge0 status codes to canonical verdict enum used
 * throughout the coding execution API. NO I/O, NO imports beyond types.
 *
 * See Phase 39 CONTEXT D-09 for status code table. MLE detection is a
 * heuristic layered on top of runtime_error statuses (7-12): Judge0 does
 * not emit a dedicated MLE status, so we sniff stderr.
 */

export type CanonicalVerdict =
  | 'pass'
  | 'fail'
  | 'timeout'
  | 'mle'
  | 'runtime_error'
  | 'compile_error'
  | 'pending';

/**
 * Judge0 status code table (verbatim from D-09).
 *   1  In Queue        → pending
 *   2  Processing      → pending
 *   3  Accepted        → pass
 *   4  Wrong Answer    → fail
 *   5  Time Limit      → timeout
 *   6  Compilation Err → compile_error
 *   7  SIGSEGV         → runtime_error
 *   8  SIGXFSZ         → runtime_error
 *   9  SIGFPE          → runtime_error
 *  10  SIGABRT         → runtime_error
 *  11  NZEC            → runtime_error
 *  12  Other           → runtime_error
 *  13  Internal Error  → runtime_error (+ logForOps)
 *  14  Exec Format Err → runtime_error
 */
export const JUDGE0_STATUS_MAP: Record<number, CanonicalVerdict> = {
  1: 'pending',
  2: 'pending',
  3: 'pass',
  4: 'fail',
  5: 'timeout',
  6: 'compile_error',
  7: 'runtime_error',
  8: 'runtime_error',
  9: 'runtime_error',
  10: 'runtime_error',
  11: 'runtime_error',
  12: 'runtime_error',
  13: 'runtime_error',
  14: 'runtime_error',
};

export class UnknownJudge0StatusError extends Error {
  constructor(status: number) {
    super(`Unknown Judge0 status: ${status}`);
    this.name = 'UnknownJudge0StatusError';
  }
}

const MLE_STDERR_PATTERN = /out of memory|memory limit exceeded|MemoryError/i;

/**
 * Normalize a Judge0 status code to a canonical verdict.
 *
 * @param status  Judge0 status code (1..14)
 * @param stderr  Optional stderr — used for MLE heuristic on runtime_error statuses
 * @returns       `{ verdict, logForOps? }`; `logForOps: true` only for status 13
 * @throws        UnknownJudge0StatusError if status is not in the table
 */
export function normalizeJudge0Verdict(
  status: number,
  stderr?: string | null,
): { verdict: CanonicalVerdict; logForOps?: boolean } {
  const mapped = JUDGE0_STATUS_MAP[status];
  if (mapped === undefined) {
    throw new UnknownJudge0StatusError(status);
  }

  // MLE heuristic: only applies to runtime_error statuses (7-12, excluding 13/14).
  // Status 13 is internal error (separate), status 14 is exec format error (not memory).
  const isRuntimeErrorBucket = status >= 7 && status <= 12;
  if (isRuntimeErrorBucket && stderr && MLE_STDERR_PATTERN.test(stderr)) {
    return { verdict: 'mle' };
  }

  if (status === 13) {
    return { verdict: 'runtime_error', logForOps: true };
  }

  return { verdict: mapped };
}
