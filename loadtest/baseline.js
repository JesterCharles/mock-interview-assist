/**
 * loadtest/baseline.js — Phase 49 Plan 01 (LOAD-01)
 *
 * k6 baseline scenario for v1.5 staging load test.
 *
 * Design references (from .planning/phases/49-k6-load-test-hardening/49-CONTEXT.md):
 *   D-01 stages: 1m→10 → 3m@50 → 2m@100 → 1m→0 VUs.
 *   D-02 traffic mix: 40/30/15/10/5 across public routes; 0% coding (HARD-01).
 *   D-03 think-time: sleep(Math.random() * 2 + 1).
 *   D-04 thresholds: failed<1%, static p(95)<500, api p(95)<1000, checks>99%.
 *   D-05 output: handleSummary → /tmp/loadtest-result.json + textSummary stdout.
 *   D-08 per-iteration X-Session-ID: 16 random bytes hex-formatted.
 *
 * Threat-model notes:
 *   T-49-01 DoS staging — caps at 100 VU. Do NOT raise.
 *   T-49-02 info disclosure — never log res.body.
 *   T-49-05 tampering — __ENV.TARGET required; run-baseline.sh staging-guards.
 *
 * Run: k6 run --env TARGET=https://staging.nextlevelmock.com loadtest/baseline.js
 */

import http from 'k6/http';
import { sleep, check } from 'k6';
import { randomBytes } from 'k6/crypto';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '3m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{kind:static}': ['p(95)<500'],
    'http_req_duration{kind:api}': ['p(95)<1000'],
    checks: ['rate>0.99'],
  },
  // k6 protects against accidental misconfiguration — tag all metrics.
  tags: { scenario: 'baseline-v1.5' },
};

// Minimal inline POST fixtures (no file I/O; k6 has constrained fs access).
const INTERVIEW_START_BODY = JSON.stringify({
  candidateName: 'k6-load-test',
  interviewLevel: 'intermediate',
  questionCount: 3,
  techWeights: { JavaScript: 1 },
});

const INTERVIEW_AGENT_BODY = JSON.stringify({
  sessionId: 'k6-synthetic-session',
  event: 'tick',
  transcript: 'placeholder transcript from load test',
});

// Deterministic weighted-choice helper matching D-02.
// Weights: 40 / 30 / 15 / 10 / 5 = 100.
const ROUTES = [
  { weight: 40, path: '/',                                method: 'GET',  kind: 'static', body: null },
  { weight: 30, path: '/api/health',                      method: 'GET',  kind: 'api',    body: null },
  { weight: 15, path: '/api/public/interview/start',      method: 'POST', kind: 'api',    body: INTERVIEW_START_BODY },
  { weight: 10, path: '/api/public/interview/agent',      method: 'POST', kind: 'api',    body: INTERVIEW_AGENT_BODY },
  { weight: 5,  path: '/api/question-banks',              method: 'GET',  kind: 'api',    body: null },
];

function pickRoute() {
  const r = Math.random() * 100;
  let acc = 0;
  for (const route of ROUTES) {
    acc += route.weight;
    if (r < acc) return route;
  }
  return ROUTES[0];
}

// 16 random bytes → 32-char hex (D-08 session id; synthetic, no real data).
function sessionId() {
  const bytes = randomBytes(16);
  let hex = '';
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i += 1) {
    const b = view[i].toString(16).padStart(2, '0');
    hex += b;
  }
  return hex;
}

export function setup() {
  const target = __ENV.TARGET;
  if (!target) {
    throw new Error('TARGET env var is required (e.g., https://staging.nextlevelmock.com)');
  }
  return { target };
}

export default function scenario(data) {
  const target = data && data.target ? data.target : __ENV.TARGET;
  if (!target) {
    throw new Error('TARGET env var is required');
  }
  const route = pickRoute();
  const url = `${target}${route.path}`;

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId(),
      'User-Agent': 'k6/baseline-v1.5',
    },
    tags: { kind: route.kind },
  };

  let res;
  if (route.method === 'POST') {
    res = http.post(url, route.body, params);
  } else {
    res = http.get(url, params);
  }

  // T-49-02 mitigation: never log res.body — only status/duration flow through k6 metrics.
  check(res, {
    'status < 500': (r) => r.status < 500,
    'has response': (r) => r.status !== 0,
  }, { kind: route.kind });

  // D-03 think-time 1-3s per iteration.
  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  return {
    '/tmp/loadtest-result.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: false }),
  };
}
