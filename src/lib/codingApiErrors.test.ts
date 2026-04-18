/**
 * codingApiErrors.test.ts
 *
 * Phase 39 Plan 03 Task 1. Tests for the shared error envelope helper.
 */

import { describe, it, expect } from 'vitest';
import {
  codingApiError,
  CODING_API_ERROR_CODES,
} from './codingApiErrors';

describe('codingApiError', () => {
  it('AUTH_REQUIRED → 401', async () => {
    const res = codingApiError('AUTH_REQUIRED', 'Sign-in required');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: { code: 'AUTH_REQUIRED', message: 'Sign-in required' } });
  });

  it('FORBIDDEN → 403', async () => {
    const res = codingApiError('FORBIDDEN', 'Not your attempt');
    expect(res.status).toBe(403);
  });

  it('NOT_FOUND → 404', async () => {
    const res = codingApiError('NOT_FOUND', 'Challenge not found');
    expect(res.status).toBe(404);
  });

  it('VALIDATION_ERROR with details → 400 + details in body', async () => {
    const res = codingApiError('VALIDATION_ERROR', 'Bad body', { issues: [{ code: 'x' }] });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.details).toEqual({ issues: [{ code: 'x' }] });
  });

  it('LANGUAGE_NOT_SUPPORTED → 400', async () => {
    const res = codingApiError('LANGUAGE_NOT_SUPPORTED', 'Not supported');
    expect(res.status).toBe(400);
  });

  it('RATE_LIMITED with retryAfterSeconds → 429 + Retry-After header', async () => {
    const res = codingApiError('RATE_LIMITED', 'Slow down', undefined, { retryAfterSeconds: 60 });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
  });

  it('RATE_LIMITED with fractional retryAfterSeconds is ceil()ed', async () => {
    const res = codingApiError('RATE_LIMITED', 'Slow down', undefined, { retryAfterSeconds: 60.4 });
    expect(res.headers.get('Retry-After')).toBe('61');
  });

  it('JUDGE0_UNAVAILABLE → 503', async () => {
    const res = codingApiError('JUDGE0_UNAVAILABLE', 'Execution service down');
    expect(res.status).toBe(503);
  });

  it('INTERNAL → 500', async () => {
    const res = codingApiError('INTERNAL', 'Unexpected');
    expect(res.status).toBe(500);
  });

  it('CODING_API_ERROR_CODES exports all 8 codes', () => {
    expect(Object.keys(CODING_API_ERROR_CODES).sort()).toEqual(
      [
        'AUTH_REQUIRED',
        'FORBIDDEN',
        'INTERNAL',
        'JUDGE0_UNAVAILABLE',
        'LANGUAGE_NOT_SUPPORTED',
        'NOT_FOUND',
        'RATE_LIMITED',
        'VALIDATION_ERROR',
      ].sort(),
    );
  });

  it('response body is exactly {error:{code,message}} when no details', async () => {
    const res = codingApiError('FORBIDDEN', 'nope');
    const body = await res.json();
    expect(body).toEqual({ error: { code: 'FORBIDDEN', message: 'nope' } });
    expect(Object.keys(body.error).sort()).toEqual(['code', 'message']);
  });

  it('Error instance details never leak stack trace', async () => {
    const err = new Error('boom');
    err.stack = 'STACK_SENTINEL_SHOULD_NOT_LEAK';
    const res = codingApiError('INTERNAL', 'oops', err);
    const body = await res.json();
    expect(body.error.details).toEqual({ name: 'Error', message: 'boom' });
    const text = JSON.stringify(body);
    expect(text).not.toContain('STACK_SENTINEL_SHOULD_NOT_LEAK');
  });
});
