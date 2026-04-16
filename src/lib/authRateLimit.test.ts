import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock prisma to avoid DB calls in unit tests
vi.mock('@/lib/prisma', () => ({
  prisma: {
    authEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Import after mock setup
import { checkAuthRateLimit, recordAuthEvent, _resetForTest } from './authRateLimit';

describe('checkAuthRateLimit', () => {
  beforeEach(() => {
    _resetForTest();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows the first request', () => {
    const result = checkAuthRateLimit({
      email: 'user@example.com',
      ip: '1.2.3.4',
      type: 'magic-link',
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('blocks after 3 same-email requests within an hour', () => {
    for (let i = 0; i < 3; i++) {
      checkAuthRateLimit({ email: 'user@example.com', ip: `1.2.3.${i}`, type: 'magic-link' });
    }
    const result = checkAuthRateLimit({
      email: 'user@example.com',
      ip: '9.9.9.9',
      type: 'magic-link',
    });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('blocks after 10 same-IP requests within an hour', () => {
    for (let i = 0; i < 10; i++) {
      checkAuthRateLimit({ email: `user${i}@example.com`, ip: '1.2.3.4', type: 'reset' });
    }
    const result = checkAuthRateLimit({
      email: 'newuser@example.com',
      ip: '1.2.3.4',
      type: 'reset',
    });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('magic-link and reset namespaces do not interfere', () => {
    // Max out magic-link for email
    for (let i = 0; i < 3; i++) {
      checkAuthRateLimit({ email: 'user@example.com', ip: `1.2.3.${i}`, type: 'magic-link' });
    }
    // reset namespace should still allow
    const result = checkAuthRateLimit({
      email: 'user@example.com',
      ip: '9.9.9.9',
      type: 'reset',
    });
    expect(result.allowed).toBe(true);
  });

  it('allows requests after hour window expires', () => {
    // Max out
    for (let i = 0; i < 3; i++) {
      checkAuthRateLimit({ email: 'user@example.com', ip: `1.2.3.${i}`, type: 'magic-link' });
    }
    // Advance 61 minutes
    vi.advanceTimersByTime(61 * 60 * 1000);
    const result = checkAuthRateLimit({
      email: 'user@example.com',
      ip: '9.9.9.9',
      type: 'magic-link',
    });
    expect(result.allowed).toBe(true);
  });

  it('retryAfterMs is positive when blocked', () => {
    for (let i = 0; i < 3; i++) {
      checkAuthRateLimit({ email: 'user@example.com', ip: `1.2.3.${i}`, type: 'magic-link' });
    }
    const result = checkAuthRateLimit({
      email: 'user@example.com',
      ip: '9.9.9.9',
      type: 'magic-link',
    });
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });
});

describe('recordAuthEvent', () => {
  it('fires without throwing (fire-and-forget)', async () => {
    await expect(
      recordAuthEvent({ type: 'magic-link', email: 'user@example.com', ip: '1.2.3.4' })
    ).resolves.not.toThrow();
  });
});
