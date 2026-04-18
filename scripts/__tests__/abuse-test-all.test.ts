/**
 * scripts/__tests__/abuse-test-all.test.ts — Phase 49 Plan 03 Task 2
 */
import { describe, it, expect } from 'vitest';

import {
  runAbuseForRoute,
  type AbuseResult,
  type FetchFn,
} from '../abuse-test-all';
import type { ApiRoute } from '../lib/route-discovery';

const PROTECTED_GET: ApiRoute = {
  pathPattern: '/api/trainer/[slug]',
  filePath: '/tmp/fake',
  methods: ['GET'],
  isPublic: false,
};

const PROTECTED_POST: ApiRoute = {
  pathPattern: '/api/trainer/[slug]/invite',
  filePath: '/tmp/fake',
  methods: ['POST'],
  isPublic: false,
};

const PUBLIC_GET: ApiRoute = {
  pathPattern: '/api/health',
  filePath: '/tmp/fake',
  methods: ['GET'],
  isPublic: true,
};

function fakeFetch(status: number, body: string): FetchFn {
  return async () =>
    ({
      status,
      text: async () => body,
      headers: new Headers(),
    } as unknown as Response);
}

const BASE = 'https://staging.nextlevelmock.com';

describe('runAbuseForRoute', () => {
  it('(a) protected route returning 401 → pass: true', async () => {
    const out = await runAbuseForRoute(PROTECTED_GET, BASE, fakeFetch(401, '{"error":"Unauthorized"}'));
    expect(out.length).toBeGreaterThan(0);
    const unauthGet = out.find((r: AbuseResult) => r.attempt_mode === 'unauth-get');
    expect(unauthGet).toBeDefined();
    expect(unauthGet!.pass).toBe(true);
    expect(unauthGet!.failReason).toBeNull();
  });

  it('(b) protected route returning 200 → pass: false (unauth-200-on-protected)', async () => {
    const out = await runAbuseForRoute(PROTECTED_GET, BASE, fakeFetch(200, '{"data":"leaked"}'));
    const unauthGet = out.find((r: AbuseResult) => r.attempt_mode === 'unauth-get');
    expect(unauthGet!.pass).toBe(false);
    expect(unauthGet!.failReason).toBe('unauth-200-on-protected');
  });

  it('(c) 500 with path + stacktrace body → denylist-hit', async () => {
    const body = 'Error: connection to prisma/./src/foo failed';
    const out = await runAbuseForRoute(PROTECTED_POST, BASE, fakeFetch(500, body));
    const failing = out.find((r: AbuseResult) => !r.pass);
    expect(failing).toBeDefined();
    expect(failing!.failReason).toBe('denylist-hit');
    expect(failing!.denylistHits.length).toBeGreaterThan(0);
    const hits = failing!.denylistHits.join('|');
    expect(hits).toMatch(/src|prisma|Error/i);
  });

  it('(d) public route returning 200 with clean body → pass: true', async () => {
    const out = await runAbuseForRoute(PUBLIC_GET, BASE, fakeFetch(200, '{"status":"ok"}'));
    const unauthGet = out.find((r: AbuseResult) => r.attempt_mode === 'unauth-get');
    expect(unauthGet!.pass).toBe(true);
  });

  it('(e) public route leaking an email → pass: false (denylist-hit)', async () => {
    const out = await runAbuseForRoute(PUBLIC_GET, BASE, fakeFetch(200, 'hello user@example.com here'));
    const unauthGet = out.find((r: AbuseResult) => r.attempt_mode === 'unauth-get');
    expect(unauthGet!.pass).toBe(false);
    expect(unauthGet!.failReason).toBe('denylist-hit');
  });
});
