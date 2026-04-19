/**
 * loadtest/__tests__/extrapolate-cost.test.ts — Phase 49 Plan 01 Task 3
 */
import { describe, it, expect } from 'vitest';

import { extrapolateCost } from '../extrapolate-cost';

describe('extrapolateCost', () => {
  it('computes Cloud Run $/1k requests with documented breakdown', () => {
    const out = extrapolateCost({
      totalRequests: 10_000,
      totalVcpuSeconds: 600,
      totalGbSeconds: 300,
    });
    // vCPU = 600 * 0.0000240 = $0.0144
    expect(out.breakdown.vcpu).toBeCloseTo(0.0144, 6);
    // Memory = 300 * 0.0000025 = $0.00075
    expect(out.breakdown.memory).toBeCloseTo(0.00075, 6);
    // Requests = (10000 / 1_000_000) * 0.40 = $0.004
    expect(out.breakdown.requests).toBeCloseTo(0.004, 6);
    // Total = $0.01915 → /1k = $0.001915
    expect(out.costPer1kRequests).toBeCloseTo(0.001915, 6);
  });

  it('throws on zero totalRequests (div-by-zero guard)', () => {
    expect(() =>
      extrapolateCost({ totalRequests: 0, totalVcpuSeconds: 0, totalGbSeconds: 0 }),
    ).toThrowError(/totalRequests must be > 0/);
  });

  it('throws on negative input', () => {
    expect(() =>
      extrapolateCost({ totalRequests: -1, totalVcpuSeconds: 0, totalGbSeconds: 0 }),
    ).toThrow();
    expect(() =>
      extrapolateCost({ totalRequests: 1000, totalVcpuSeconds: -5, totalGbSeconds: 0 }),
    ).toThrow();
    expect(() =>
      extrapolateCost({ totalRequests: 1000, totalVcpuSeconds: 0, totalGbSeconds: -1 }),
    ).toThrow();
  });
});
