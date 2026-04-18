/**
 * Coding Signal → Score Mapper — pure functions, no DB imports.
 *
 * Maps CodingSkillSignal rows (produced by Phase 39 Judge0 callbacks) into
 * GapScore-compatible inputs consumed by Phase 41's readiness recompute.
 *
 * Divergence from gapService.ts: this service THROWS on invalid input rather
 * than filtering (like gapService.isValidScore). Rationale: signals come from
 * a trusted server-side source (Judge0 verdict + test case count) — malformed
 * input indicates a service-layer bug, not user data corruption, so surfacing
 * errors here is correct. See RESEARCH §Signal Service Design.
 *
 * Weight table per D-16 (CONTEXT.md) — tuning belongs in code review, not env.
 */

import { z } from 'zod';

// ── Types ─────────────────────────────────────────────────────────────

const SignalTypeSchema = z.enum([
  'pass',
  'partial',
  'fail',
  'compile_error',
  'timeout',
]);

export type SignalType = z.infer<typeof SignalTypeSchema>;

export interface SignalInput {
  skillSlug: string;
  signalType: SignalType;
  testsPassed?: number; // required when signalType === 'partial'
  totalTests?: number; // required when signalType === 'partial'
}

export interface SignalOutput {
  skillSlug: string;
  rawScore: number; // 0-100
  weight: number; // 0.0-1.0
}

// ── Weight Table (D-16, VERBATIM) ─────────────────────────────────────

export const SIGNAL_WEIGHTS: Readonly<
  Record<SignalType, { weight: number; baseScore: number | null }>
> = Object.freeze({
  pass: { weight: 1.0, baseScore: 100 },
  partial: { weight: 0.85, baseScore: null }, // computed from testsPassed/totalTests
  fail: { weight: 1.0, baseScore: 0 },
  compile_error: { weight: 0.6, baseScore: 10 },
  timeout: { weight: 0.8, baseScore: 20 },
});

// ── Public API ────────────────────────────────────────────────────────

/**
 * Map a CodingSkillSignal input to a GapScore-compatible output.
 * Throws on invalid inputs (see edge cases in codingSignalService.test.ts).
 */
export function mapSignalToScore(input: SignalInput): SignalOutput {
  if (!input.skillSlug || input.skillSlug.trim() === '') {
    throw new Error('skillSlug required');
  }

  const parsedType = SignalTypeSchema.safeParse(input.signalType);
  if (!parsedType.success) {
    throw new Error(`Unknown signalType: ${input.signalType}`);
  }

  const config = SIGNAL_WEIGHTS[parsedType.data];

  let rawScore: number;
  if (parsedType.data === 'partial') {
    const { testsPassed, totalTests } = input;
    if (testsPassed === undefined || totalTests === undefined) {
      throw new Error('partial signal requires testsPassed and totalTests');
    }
    if (testsPassed < 0 || totalTests < 0) {
      throw new Error('testsPassed/totalTests must be non-negative');
    }
    if (totalTests === 0) {
      throw new Error('Cannot compute partial score with zero total tests');
    }
    if (testsPassed > totalTests) {
      throw new Error('testsPassed cannot exceed totalTests');
    }
    rawScore = (testsPassed / totalTests) * 100;
  } else {
    // Non-partial types have a fixed baseScore
    rawScore = config.baseScore!;
  }

  return {
    skillSlug: input.skillSlug,
    rawScore,
    weight: config.weight,
  };
}
