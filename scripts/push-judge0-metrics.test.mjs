// Unit tests for scripts/push-judge0-metrics.mjs (Plan 43-03 / IAC-04).
// Exercises the pure functions (no Judge0 HTTP, no gcloud invocation).

import { describe, it, expect } from 'vitest';
import { computePercentiles, buildLogPayload } from './push-judge0-metrics.mjs';

describe('computePercentiles', () => {
  it('returns zeros for empty input', () => {
    const result = computePercentiles([]);
    expect(result).toEqual({ p50: 0, p95: 0, sampleSize: 0 });
  });

  it('returns the single value for size-1 input', () => {
    const result = computePercentiles([100]);
    expect(result).toEqual({ p50: 100, p95: 100, sampleSize: 1 });
  });

  it('computes p50 and p95 for 10-element uniform distribution', () => {
    const result = computePercentiles([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    expect(result.sampleSize).toBe(10);
    expect(result.p50).toBeGreaterThanOrEqual(50);
    expect(result.p50).toBeLessThanOrEqual(60);
    expect(result.p95).toBeGreaterThanOrEqual(90);
    expect(result.p95).toBeLessThanOrEqual(100);
  });

  it('returns the uniform value for constant input', () => {
    const result = computePercentiles([5, 5, 5, 5, 5]);
    expect(result).toEqual({ p50: 5, p95: 5, sampleSize: 5 });
  });
});

describe('buildLogPayload', () => {
  it('builds an OK payload from sampled latencies', () => {
    const payload = buildLogPayload({
      queueDepth: 7,
      latenciesMs: [100, 200, 300, 400, 500],
      judge0Version: '1.13.1',
    });
    expect(payload.queueDepth).toBe(7);
    expect(payload.sampleSize).toBe(5);
    expect(payload.judge0Version).toBe('1.13.1');
    expect(payload.status).toBe('ok');
    expect(typeof payload.timestamp).toBe('string');
    expect(() => new Date(payload.timestamp).toISOString()).not.toThrow();
    expect(typeof payload.p50Ms).toBe('number');
    expect(typeof payload.p95Ms).toBe('number');
  });

  it('builds an unreachable payload when Judge0 cannot be contacted', () => {
    // Network-level failure — ECONNREFUSED, ENOTFOUND, etc. — is surfaced as
    // `status: "unreachable"` (the VM or the process is down, per WR-04).
    const payload = buildLogPayload({
      error: new Error('ECONNREFUSED'),
      errorKind: 'unreachable',
    });
    expect(payload.status).toBe('unreachable');
    expect(payload.error).toBe('ECONNREFUSED');
    expect(typeof payload.timestamp).toBe('string');
  });

  it('builds an error payload when Judge0 returns non-2xx', () => {
    // HTTP-level failure — Judge0 is reachable but returning 5xx/4xx —
    // is distinct from unreachable (the server is up but broken).
    // WR-04: split so Appendix B alert queries can distinguish.
    const payload = buildLogPayload({
      error: new Error('system_info returned HTTP 500'),
      errorKind: 'error',
    });
    expect(payload.status).toBe('error');
    expect(payload.error).toBe('system_info returned HTTP 500');
    expect(typeof payload.timestamp).toBe('string');
  });

  it('defaults unspecified errorKind to unreachable (back-compat)', () => {
    // Legacy call sites without errorKind continue to log "unreachable"
    // so existing alert rules don't silently stop matching.
    const payload = buildLogPayload({ error: new Error('boom') });
    expect(payload.status).toBe('unreachable');
  });
});
