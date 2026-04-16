import { describe, it, expect } from 'vitest';
import { computeAiTrainerVariance } from '@/lib/sessionPersistence';

describe('computeAiTrainerVariance', () => {
  it('returns correct average delta with mixed llmScore/finalScore', () => {
    const assessments = {
      q1: { llmScore: 7, finalScore: 8 },   // delta: +1
      q2: { llmScore: 5, finalScore: 3 },   // delta: -2
      q3: { llmScore: 9, finalScore: 9 },   // delta: 0
    };
    const result = computeAiTrainerVariance(assessments);
    // avg of [1, -2, 0] = -1/3
    expect(result).toBeCloseTo(-1 / 3, 5);
  });

  it('returns null when all questions have no llmScore/finalScore pair', () => {
    const assessments = {
      q1: { llmScore: undefined, finalScore: undefined },
      q2: { llmScore: 7 },
      q3: { finalScore: 5 },
    };
    const result = computeAiTrainerVariance(assessments);
    expect(result).toBeNull();
  });

  it('returns null for empty assessments object', () => {
    const result = computeAiTrainerVariance({});
    expect(result).toBeNull();
  });

  it('returns exact delta for a single question with both scores', () => {
    const assessments = {
      q1: { llmScore: 6, finalScore: 8 },
    };
    const result = computeAiTrainerVariance(assessments);
    expect(result).toBe(2);
  });
});
