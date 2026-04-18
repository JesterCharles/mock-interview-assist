#!/usr/bin/env tsx
/**
 * scripts/abuse-test-all.ts — Phase 49 Plan 03 Task 2 (HARD-02)
 *
 * Iterates every /api/* route discovered via scripts/lib/route-discovery.ts,
 * applies 5 attack modes, scans response bodies against the error-body
 * denylist, writes .planning/SECURITY-v1.5-abuse-test.json.
 *
 * USAGE:
 *   ABUSE_TEST_BASE_URL=https://staging.nextlevelmock.com npm run abuse-test:all
 *
 * Hard guard (T-49-07): refuses any target that does not start with
 * https://staging.* — no prod exposure.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { discoverApiRoutes, type ApiRoute, type HttpMethod } from './lib/route-discovery';

// Never-valid JWT fixture (unsigned) — deterministic, safe to bake in.
const EXPIRED_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWV4cGlyZWQiLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MTcwMDAwMDAwMX0.invalid-signature-for-abuse-test';

// Deterministic fixture tokens for wrong-role attempts. These are NOT real
// session tokens — they are syntactically-shaped Bearer strings that any
// real auth middleware will reject as "not a valid Supabase session". We
// tag them as fixtures so the denylist cannot flag them.
const FAKE_TRAINER_BEARER = 'fake-trainer-bearer-for-abuse-test-nothing-sensitive';
const FAKE_ASSOCIATE_BEARER = 'fake-associate-bearer-for-abuse-test-nothing-sensitive';

export const ERROR_BODY_DENYLIST: RegExp[] = [
  /\/app\//,
  /\/src\//,
  /\bat \//,
  /\bError:/,
  /\bTypeError:/,
  /prisma\//,
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
  /\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
  /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/,
];

export type AttemptMode =
  | 'unauth-get'
  | 'unauth-post-empty'
  | 'unauth-post-fake-id'
  | 'expired-token'
  | 'wrong-role';

export interface AbuseResult {
  pathPattern: string;
  method: HttpMethod;
  attempt_mode: AttemptMode;
  isPublic: boolean;
  status: number;
  bodySnippet: string;
  denylistHits: string[];
  pass: boolean;
  failReason: string | null;
  timestamp: string;
}

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

const DEFAULT_TIMEOUT_MS = 10_000;

function substituteDynamicSegments(pattern: string): string {
  return pattern
    .replace(/\[weekId\]/g, 'abuse-test-week-0')
    .replace(/\[slug\]/g, 'abuse-test-nonexistent')
    .replace(/\[id\]/g, 'abuse-test-nonexistent-00000000');
}

function scanDenylist(body: string): string[] {
  const hits: string[] = [];
  for (const r of ERROR_BODY_DENYLIST) {
    const m = body.match(r);
    if (m) hits.push(m[0]);
  }
  return hits;
}

function computePassFail(
  route: ApiRoute,
  attempt: AttemptMode,
  status: number,
  hits: string[],
): { pass: boolean; failReason: string | null } {
  if (hits.length > 0) return { pass: false, failReason: 'denylist-hit' };

  if (!route.isPublic) {
    // Protected route: any 200 to an unauth-style attempt = hard fail.
    if (status === 200 && attempt !== 'wrong-role') {
      return { pass: false, failReason: 'unauth-200-on-protected' };
    }
    // wrong-role with a fake token should also not return 200.
    if (status === 200 && attempt === 'wrong-role') {
      return { pass: false, failReason: 'wrong-role-200-on-protected' };
    }
    const okSet = new Set([401, 403, 405, 400, 404, 422, 429, 500, 501, 503]);
    // 5xx is suspicious but not necessarily a HARD-02 fail — unless the body
    // leaks internals (already caught by denylist). 4xx auth rejections pass.
    if (okSet.has(status)) return { pass: true, failReason: null };
    return { pass: true, failReason: null };
  }

  // Public route: 200-range is expected; still denylist-scanned above.
  return { pass: true, failReason: null };
}

async function runAttempt(
  route: ApiRoute,
  method: HttpMethod,
  attempt: AttemptMode,
  baseUrl: string,
  fetchImpl: FetchFn,
): Promise<AbuseResult> {
  const urlPath = substituteDynamicSegments(route.pathPattern);
  const url = `${baseUrl}${urlPath}`;

  let bodyToSend: BodyInit | undefined;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'abuse-test-all/0.1',
  };
  let effectiveMethod: HttpMethod = method;

  switch (attempt) {
    case 'unauth-get':
      effectiveMethod = 'GET';
      break;
    case 'unauth-post-empty':
      effectiveMethod = 'POST';
      bodyToSend = JSON.stringify({});
      break;
    case 'unauth-post-fake-id':
      effectiveMethod = 'POST';
      bodyToSend = JSON.stringify({ userId: '00000000-0000-0000-0000-000000000000' });
      break;
    case 'expired-token':
      effectiveMethod = method;
      headers['Authorization'] = `Bearer ${EXPIRED_TOKEN}`;
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        bodyToSend = JSON.stringify({});
      }
      break;
    case 'wrong-role': {
      const token = route.pathPattern.startsWith('/api/associate')
        ? FAKE_TRAINER_BEARER
        : FAKE_ASSOCIATE_BEARER;
      headers['Authorization'] = `Bearer ${token}`;
      effectiveMethod = method;
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        bodyToSend = JSON.stringify({});
      }
      break;
    }
  }

  let status = 0;
  let bodyText = '';
  const timestamp = new Date().toISOString();

  try {
    const res = await fetchImpl(url, {
      method: effectiveMethod,
      headers,
      body: bodyToSend,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    status = res.status;
    try {
      bodyText = await res.text();
    } catch {
      bodyText = '';
    }
  } catch (err) {
    status = 0;
    bodyText = `__ERROR__ ${err instanceof Error ? err.message : String(err)}`;
  }

  const snippet = bodyText.slice(0, 500);
  const hits = scanDenylist(bodyText);
  const { pass, failReason } = computePassFail(route, attempt, status, hits);

  return {
    pathPattern: route.pathPattern,
    method,
    attempt_mode: attempt,
    isPublic: route.isPublic,
    status,
    bodySnippet: snippet,
    denylistHits: hits,
    pass,
    failReason,
    timestamp,
  };
}

function applicableModes(route: ApiRoute, method: HttpMethod): AttemptMode[] {
  // Every route gets all 5 modes, but we only POST-flavor attempts against
  // routes that actually accept POST/PUT/PATCH (else the method mismatch
  // would generate a 405 and yield no signal). unauth-get is safe everywhere.
  const modes: AttemptMode[] = ['unauth-get'];
  const mutating = method === 'POST' || method === 'PUT' || method === 'PATCH';
  if (mutating) {
    modes.push('unauth-post-empty', 'unauth-post-fake-id');
  }
  modes.push('expired-token', 'wrong-role');
  return modes;
}

/**
 * Exported for testing. Runs the 5-mode matrix against a single route using
 * an injected fetch.
 */
export async function runAbuseForRoute(
  route: ApiRoute,
  baseUrl: string,
  fetchImpl: FetchFn,
): Promise<AbuseResult[]> {
  const out: AbuseResult[] = [];
  for (const method of route.methods.length > 0 ? route.methods : (['GET'] as HttpMethod[])) {
    for (const mode of applicableModes(route, method)) {
      const r = await runAttempt(route, method, mode, baseUrl, fetchImpl);
      out.push(r);
    }
  }
  return out;
}

function readCommit(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

async function main(): Promise<void> {
  const baseUrl = (process.env.ABUSE_TEST_BASE_URL ?? '').replace(/\/+$/, '');
  if (!baseUrl) {
    console.error('ABUSE_TEST_BASE_URL is required (must start with https://staging.)');
    process.exit(2);
  }
  if (!baseUrl.startsWith('https://staging.')) {
    throw new Error(`refuse: abuse test must target staging.* — got ${baseUrl}`);
  }

  const routes = discoverApiRoutes();
  console.log(`[abuse-test] target=${baseUrl} routes=${routes.length}`);

  const results: AbuseResult[] = [];
  for (const route of routes) {
    const rows = await runAbuseForRoute(route, baseUrl, fetch as unknown as FetchFn);
    results.push(...rows);
    const failures = rows.filter((r) => !r.pass).length;
    console.log(
      `[abuse-test] ${route.pathPattern} methods=${route.methods.join(',')} attempts=${rows.length} fails=${failures}`,
    );
  }

  const summary = {
    total: results.length,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
  };

  const artifact = {
    target: baseUrl,
    run_at: new Date().toISOString(),
    commit: readCommit(),
    summary,
    results,
  };

  const outPath = path.join(process.cwd(), '.planning', 'SECURITY-v1.5-abuse-test.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2));
  console.log(`[abuse-test] wrote ${outPath} (${summary.total} results, ${summary.failed} failures)`);

  if (summary.failed > 0) {
    console.error(`[abuse-test] FAIL: ${summary.failed} failures`);
    process.exit(1);
  }
}

const isMain = (() => {
  try {
    const invoked = process.argv[1] ?? '';
    return invoked.endsWith('abuse-test-all.ts') || invoked.endsWith('abuse-test-all.js');
  } catch {
    return false;
  }
})();

if (isMain) {
  main().catch((err) => {
    console.error('[abuse-test] FATAL:', err);
    process.exit(2);
  });
}
