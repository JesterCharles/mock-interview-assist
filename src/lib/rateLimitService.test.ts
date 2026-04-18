/**
 * rateLimitService.test.ts
 *
 * Tests for the `coding-submit` scope extension added in Phase 39 Plan 01.
 * Existing interview fingerprint scope is covered elsewhere; this file only
 * exercises checkCodingSubmitRateLimit / incrementCodingSubmitCount.
 */

import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const RATE_LIMITS_PATH = path.join(process.cwd(), 'data', 'rate-limits.json');

function resetRateLimitsFile() {
  const dir = path.dirname(RATE_LIMITS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(RATE_LIMITS_PATH, JSON.stringify({}), 'utf-8');
}

// Import after reset so the module reads a clean file.
import {
  checkCodingSubmitRateLimit,
  incrementCodingSubmitCount,
} from './rateLimitService';

describe('rateLimitService — coding-submit scope', () => {
  beforeEach(() => {
    resetRateLimitsFile();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('first call for new userKey returns allowed with full remaining budget', () => {
    const result = checkCodingSubmitRateLimit('associate:42');
    expect(result.allowed).toBe(true);
    expect(result.hourlyRemaining).toBe(30);
    expect(result.dailyRemaining).toBe(200);
    expect(result.retryAfterSeconds).toBeUndefined();
  });

  it('after 30 hourly increments, 31st call is blocked with retry-after', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T10:00:00Z'));
    for (let i = 0; i < 30; i++) {
      incrementCodingSubmitCount('associate:42');
    }
    const result = checkCodingSubmitRateLimit('associate:42');
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.error).toBeTruthy();
  });

  it('hourly counter resets after 1 hour', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T10:00:00Z'));
    for (let i = 0; i < 30; i++) incrementCodingSubmitCount('associate:42');
    expect(checkCodingSubmitRateLimit('associate:42').allowed).toBe(false);

    // Advance 1h + 1s
    vi.setSystemTime(new Date('2026-01-15T11:00:01Z'));
    const result = checkCodingSubmitRateLimit('associate:42');
    expect(result.allowed).toBe(true);
    expect(result.hourlyRemaining).toBe(30);
  });

  it('daily counter resets at next midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T10:00:00Z'));
    // Increment 30 in this hour (hits hourly limit but also daily counter)
    for (let i = 0; i < 30; i++) incrementCodingSubmitCount('associate:42');

    // Advance past the hourly window — 1 hour later
    vi.setSystemTime(new Date('2026-01-15T11:30:00Z'));
    for (let i = 0; i < 30; i++) incrementCodingSubmitCount('associate:42');
    vi.setSystemTime(new Date('2026-01-15T12:30:00Z'));
    for (let i = 0; i < 30; i++) incrementCodingSubmitCount('associate:42');
    vi.setSystemTime(new Date('2026-01-15T13:30:00Z'));
    for (let i = 0; i < 30; i++) incrementCodingSubmitCount('associate:42');
    vi.setSystemTime(new Date('2026-01-15T14:30:00Z'));
    for (let i = 0; i < 30; i++) incrementCodingSubmitCount('associate:42');
    vi.setSystemTime(new Date('2026-01-15T15:30:00Z'));
    for (let i = 0; i < 30; i++) incrementCodingSubmitCount('associate:42');
    vi.setSystemTime(new Date('2026-01-15T16:30:00Z'));
    for (let i = 0; i < 20; i++) incrementCodingSubmitCount('associate:42');

    // 200 total — next call should hit daily cap
    vi.setSystemTime(new Date('2026-01-15T16:45:00Z'));
    const blocked = checkCodingSubmitRateLimit('associate:42');
    expect(blocked.allowed).toBe(false);

    // Cross midnight
    vi.setSystemTime(new Date('2026-01-16T00:30:00Z'));
    const reset = checkCodingSubmitRateLimit('associate:42');
    expect(reset.allowed).toBe(true);
    expect(reset.dailyRemaining).toBe(200);
    expect(reset.hourlyRemaining).toBe(30);
  });

  it('env override CODING_SUBMIT_RATE_HOURLY=5 changes hourly limit', () => {
    vi.stubEnv('CODING_SUBMIT_RATE_HOURLY', '5');
    for (let i = 0; i < 5; i++) incrementCodingSubmitCount('associate:99');
    const result = checkCodingSubmitRateLimit('associate:99');
    expect(result.allowed).toBe(false);
  });

  it('env override CODING_SUBMIT_RATE_DAILY=3 changes daily limit', () => {
    vi.stubEnv('CODING_SUBMIT_RATE_DAILY', '3');
    for (let i = 0; i < 3; i++) incrementCodingSubmitCount('associate:100');
    const result = checkCodingSubmitRateLimit('associate:100');
    expect(result.allowed).toBe(false);
  });

  it('associate and trainer userKeys counted separately', () => {
    for (let i = 0; i < 30; i++) incrementCodingSubmitCount('associate:42');
    const assocResult = checkCodingSubmitRateLimit('associate:42');
    expect(assocResult.allowed).toBe(false);

    const trainerResult = checkCodingSubmitRateLimit('trainer:abc-uuid');
    expect(trainerResult.allowed).toBe(true);
    expect(trainerResult.hourlyRemaining).toBe(30);
  });

  it('coding-submit keys do NOT collide with interview fingerprint keys', () => {
    for (let i = 0; i < 30; i++) incrementCodingSubmitCount('associate:42');

    // Read raw file — ensure coding-submit key is namespaced
    const raw = JSON.parse(fs.readFileSync(RATE_LIMITS_PATH, 'utf-8'));
    const keys = Object.keys(raw);
    expect(keys.some((k) => k.startsWith('coding-submit:'))).toBe(true);
    // Ensure no raw 'associate:42' key without namespace
    expect(keys).not.toContain('associate:42');
  });

  it('returns retryAfterSeconds at earliest of next hour window or midnight', () => {
    vi.useFakeTimers();
    // 23:30 — next midnight in 30 min; next hour window in 60 min
    vi.setSystemTime(new Date('2026-01-15T23:30:00Z'));
    for (let i = 0; i < 30; i++) incrementCodingSubmitCount('associate:42');
    const result = checkCodingSubmitRateLimit('associate:42');
    expect(result.allowed).toBe(false);
    // retryAfter should be ~ 30min (midnight) not 60min
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(30 * 60 + 5);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });
});
