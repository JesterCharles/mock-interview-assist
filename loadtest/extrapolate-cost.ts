#!/usr/bin/env tsx
/**
 * loadtest/extrapolate-cost.ts — Phase 49 Plan 01 Task 3 (LOAD-03)
 *
 * Worst-case Cloud Run $/1000 requests. No free-tier subtraction — we want
 * the upper bound for capacity planning.
 *
 * Pricing constants (2026 us-central1, always-allocated CPU):
 *   vCPU:     $0.0000240 per vCPU-second
 *   Memory:   $0.0000025 per GB-second
 *   Requests: $0.40 per 1M requests
 *
 * CLI: reads env LOADTEST_TOTAL_REQUESTS, LOADTEST_VCPU_SECONDS, LOADTEST_GB_SECONDS
 * and prints the 6-decimal $/1k value to stdout.
 */

export const VCPU_PER_SEC = 0.0000240;
export const GB_PER_SEC = 0.0000025;
export const REQ_PER_MILLION = 0.4;

export interface ExtrapolateInput {
  totalRequests: number;
  totalVcpuSeconds: number;
  totalGbSeconds: number;
}

export interface ExtrapolateOutput {
  costPer1kRequests: number;
  breakdown: {
    vcpu: number;
    memory: number;
    requests: number;
  };
}

export function extrapolateCost(input: ExtrapolateInput): ExtrapolateOutput {
  const { totalRequests, totalVcpuSeconds, totalGbSeconds } = input;
  if (!Number.isFinite(totalRequests) || totalRequests <= 0) {
    throw new Error('totalRequests must be > 0');
  }
  if (!Number.isFinite(totalVcpuSeconds) || totalVcpuSeconds < 0) {
    throw new Error('totalVcpuSeconds must be >= 0');
  }
  if (!Number.isFinite(totalGbSeconds) || totalGbSeconds < 0) {
    throw new Error('totalGbSeconds must be >= 0');
  }

  const requestsCost = (totalRequests / 1_000_000) * REQ_PER_MILLION;
  const vcpuCost = totalVcpuSeconds * VCPU_PER_SEC;
  const memCost = totalGbSeconds * GB_PER_SEC;
  const total = requestsCost + vcpuCost + memCost;
  const costPer1kRequests = total / (totalRequests / 1000);

  return {
    costPer1kRequests,
    breakdown: {
      vcpu: vcpuCost,
      memory: memCost,
      requests: requestsCost,
    },
  };
}

function readPositiveNumber(envName: string, allowZero = false): number {
  const raw = process.env[envName];
  if (!raw) {
    throw new Error(`${envName} env var is required`);
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || (allowZero ? n < 0 : n <= 0)) {
    throw new Error(`${envName} must be a ${allowZero ? 'non-negative' : 'positive'} number (got: ${raw})`);
  }
  return n;
}

function main(): void {
  try {
    const input: ExtrapolateInput = {
      totalRequests: readPositiveNumber('LOADTEST_TOTAL_REQUESTS'),
      totalVcpuSeconds: readPositiveNumber('LOADTEST_VCPU_SECONDS', true),
      totalGbSeconds: readPositiveNumber('LOADTEST_GB_SECONDS', true),
    };
    const out = extrapolateCost(input);
    // Print only the $/1k number (6 decimals) for easy pipe-into-env consumption.
    process.stdout.write(out.costPer1kRequests.toFixed(6));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[extrapolate-cost] ${msg}`);
    process.exit(1);
  }
}

const isMain = (() => {
  try {
    const invoked = process.argv[1] ?? '';
    return invoked.endsWith('extrapolate-cost.ts') || invoked.endsWith('extrapolate-cost.js');
  } catch {
    return false;
  }
})();

if (isMain) {
  main();
}
