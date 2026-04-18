/**
 * judge0Verdict.test.ts
 *
 * Unit tests for Judge0 status → canonical verdict mapping.
 * Phase 39 Plan 01 Task 1.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeJudge0Verdict,
  JUDGE0_STATUS_MAP,
  UnknownJudge0StatusError,
  type CanonicalVerdict,
} from './judge0Verdict';

describe('normalizeJudge0Verdict', () => {
  it('status 1 (In Queue) → pending', () => {
    expect(normalizeJudge0Verdict(1)).toEqual({ verdict: 'pending' });
  });

  it('status 2 (Processing) → pending', () => {
    expect(normalizeJudge0Verdict(2)).toEqual({ verdict: 'pending' });
  });

  it('status 3 (Accepted) → pass', () => {
    expect(normalizeJudge0Verdict(3)).toEqual({ verdict: 'pass' });
  });

  it('status 4 (Wrong Answer) → fail', () => {
    expect(normalizeJudge0Verdict(4)).toEqual({ verdict: 'fail' });
  });

  it('status 5 (Time Limit Exceeded) → timeout', () => {
    expect(normalizeJudge0Verdict(5)).toEqual({ verdict: 'timeout' });
  });

  it('status 6 (Compilation Error) → compile_error', () => {
    expect(normalizeJudge0Verdict(6)).toEqual({ verdict: 'compile_error' });
  });

  it('status 7 (Runtime Error SIGSEGV) → runtime_error', () => {
    expect(normalizeJudge0Verdict(7)).toEqual({ verdict: 'runtime_error' });
  });

  it('statuses 8-12 (SIGXFSZ/SIGFPE/SIGABRT/NZEC/Other) → runtime_error', () => {
    for (const status of [8, 9, 10, 11, 12]) {
      expect(normalizeJudge0Verdict(status)).toEqual({ verdict: 'runtime_error' });
    }
  });

  it('status 13 (Internal Error) → runtime_error with logForOps:true', () => {
    expect(normalizeJudge0Verdict(13)).toEqual({
      verdict: 'runtime_error',
      logForOps: true,
    });
  });

  it('status 14 (Exec Format Error) → runtime_error', () => {
    expect(normalizeJudge0Verdict(14)).toEqual({ verdict: 'runtime_error' });
  });

  describe('MLE heuristic', () => {
    it('status 7 with stderr "out of memory" → mle', () => {
      expect(normalizeJudge0Verdict(7, 'segfault: out of memory')).toEqual({
        verdict: 'mle',
      });
    });

    it('status 11 with stderr "memory limit exceeded" → mle', () => {
      expect(normalizeJudge0Verdict(11, 'Process killed: memory limit exceeded')).toEqual({
        verdict: 'mle',
      });
    });

    it('status 9 with stderr "MemoryError" → mle', () => {
      expect(normalizeJudge0Verdict(9, 'Traceback:\nMemoryError: allocation failed')).toEqual({
        verdict: 'mle',
      });
    });

    it('status 3 (pass) with MLE-looking stderr → still pass (no downgrade)', () => {
      expect(normalizeJudge0Verdict(3, 'out of memory')).toEqual({
        verdict: 'pass',
      });
    });

    it('status 7 without matching stderr → runtime_error', () => {
      expect(normalizeJudge0Verdict(7, 'some other error')).toEqual({
        verdict: 'runtime_error',
      });
    });

    it('status 7 with null stderr → runtime_error', () => {
      expect(normalizeJudge0Verdict(7, null)).toEqual({ verdict: 'runtime_error' });
    });

    it('MLE heuristic is case-insensitive', () => {
      expect(normalizeJudge0Verdict(7, 'OUT OF MEMORY')).toEqual({ verdict: 'mle' });
    });
  });

  it('unknown status (99) → throws UnknownJudge0StatusError', () => {
    expect(() => normalizeJudge0Verdict(99)).toThrow(UnknownJudge0StatusError);
    expect(() => normalizeJudge0Verdict(0)).toThrow(UnknownJudge0StatusError);
    expect(() => normalizeJudge0Verdict(-1)).toThrow(UnknownJudge0StatusError);
  });

  it('JUDGE0_STATUS_MAP snapshot — covers 1..14', () => {
    const expected: Record<number, CanonicalVerdict> = {
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
    expect(JUDGE0_STATUS_MAP).toEqual(expected);
  });
});
