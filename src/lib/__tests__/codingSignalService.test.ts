import { describe, it, expect } from 'vitest';
import {
  mapSignalToScore,
  SIGNAL_WEIGHTS,
  type SignalType,
} from '@/lib/codingSignalService';

describe('mapSignalToScore', () => {
  describe('pass', () => {
    it('returns rawScore=100, weight=1.0', () => {
      const out = mapSignalToScore({ skillSlug: 'react', signalType: 'pass' });
      expect(out).toEqual({ skillSlug: 'react', rawScore: 100, weight: 1.0 });
    });
  });

  describe('fail', () => {
    it('returns rawScore=0, weight=1.0', () => {
      const out = mapSignalToScore({ skillSlug: 'node', signalType: 'fail' });
      expect(out).toEqual({ skillSlug: 'node', rawScore: 0, weight: 1.0 });
    });
  });

  describe('compile_error', () => {
    it('returns rawScore=10, weight=0.6 (weighted lower per D-16 codex-consult rationale)', () => {
      const out = mapSignalToScore({ skillSlug: 'python', signalType: 'compile_error' });
      expect(out).toEqual({ skillSlug: 'python', rawScore: 10, weight: 0.6 });
    });
  });

  describe('timeout', () => {
    it('returns rawScore=20, weight=0.8', () => {
      const out = mapSignalToScore({ skillSlug: 'java', signalType: 'timeout' });
      expect(out).toEqual({ skillSlug: 'java', rawScore: 20, weight: 0.8 });
    });
  });

  describe('partial', () => {
    it('computes fraction-passed × 100 with weight 0.85', () => {
      const out = mapSignalToScore({
        skillSlug: 'typescript',
        signalType: 'partial',
        testsPassed: 5,
        totalTests: 10,
      });
      expect(out).toEqual({ skillSlug: 'typescript', rawScore: 50, weight: 0.85 });
    });

    it('returns rawScore=0 when zero tests passed (same score as fail, different weight)', () => {
      const out = mapSignalToScore({
        skillSlug: 'sql',
        signalType: 'partial',
        testsPassed: 0,
        totalTests: 10,
      });
      expect(out).toEqual({ skillSlug: 'sql', rawScore: 0, weight: 0.85 });
    });

    it('returns rawScore=100 when all tests passed (same score as pass, different weight)', () => {
      const out = mapSignalToScore({
        skillSlug: 'csharp',
        signalType: 'partial',
        testsPassed: 10,
        totalTests: 10,
      });
      expect(out).toEqual({ skillSlug: 'csharp', rawScore: 100, weight: 0.85 });
    });

    it('throws when totalTests is 0 (division-by-zero guard)', () => {
      expect(() =>
        mapSignalToScore({
          skillSlug: 'react',
          signalType: 'partial',
          testsPassed: 0,
          totalTests: 0,
        }),
      ).toThrow(/zero total tests/i);
    });

    it('throws when testsPassed exceeds totalTests', () => {
      expect(() =>
        mapSignalToScore({
          skillSlug: 'react',
          signalType: 'partial',
          testsPassed: 11,
          totalTests: 10,
        }),
      ).toThrow(/testsPassed cannot exceed totalTests/i);
    });

    it('throws when testsPassed or totalTests is negative', () => {
      expect(() =>
        mapSignalToScore({
          skillSlug: 'react',
          signalType: 'partial',
          testsPassed: -1,
          totalTests: 10,
        }),
      ).toThrow(/non-negative/i);

      expect(() =>
        mapSignalToScore({
          skillSlug: 'react',
          signalType: 'partial',
          testsPassed: 5,
          totalTests: -3,
        }),
      ).toThrow(/non-negative/i);
    });

    it('throws when testsPassed or totalTests is missing', () => {
      expect(() =>
        mapSignalToScore({
          skillSlug: 'react',
          signalType: 'partial',
        }),
      ).toThrow(/requires testsPassed and totalTests/i);

      expect(() =>
        mapSignalToScore({
          skillSlug: 'react',
          signalType: 'partial',
          testsPassed: 5,
        }),
      ).toThrow(/requires testsPassed and totalTests/i);
    });
  });

  describe('invalid inputs', () => {
    it('throws on unknown signalType', () => {
      expect(() =>
        mapSignalToScore({
          skillSlug: 'react',
          signalType: 'bogus' as SignalType,
        }),
      ).toThrow(/Unknown signalType/i);
    });

    it('throws on empty skillSlug', () => {
      expect(() =>
        mapSignalToScore({
          skillSlug: '',
          signalType: 'pass',
        }),
      ).toThrow(/skillSlug required/i);
    });

    it('throws on whitespace-only skillSlug', () => {
      expect(() =>
        mapSignalToScore({
          skillSlug: '   ',
          signalType: 'pass',
        }),
      ).toThrow(/skillSlug required/i);
    });
  });
});

describe('SIGNAL_WEIGHTS', () => {
  it('exports immutable (frozen) weight table', () => {
    expect(Object.isFrozen(SIGNAL_WEIGHTS)).toBe(true);
  });

  it('has exact D-16 weight values', () => {
    expect(SIGNAL_WEIGHTS.pass).toEqual({ weight: 1.0, baseScore: 100 });
    expect(SIGNAL_WEIGHTS.partial).toEqual({ weight: 0.85, baseScore: null });
    expect(SIGNAL_WEIGHTS.fail).toEqual({ weight: 1.0, baseScore: 0 });
    expect(SIGNAL_WEIGHTS.compile_error).toEqual({ weight: 0.6, baseScore: 10 });
    expect(SIGNAL_WEIGHTS.timeout).toEqual({ weight: 0.8, baseScore: 20 });
  });

  it('covers all 5 SignalType values with no extras', () => {
    expect(Object.keys(SIGNAL_WEIGHTS).sort()).toEqual(
      ['compile_error', 'fail', 'partial', 'pass', 'timeout'].sort(),
    );
  });
});
