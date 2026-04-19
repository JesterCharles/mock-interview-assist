/**
 * loadtest/stress.js — v1.5 capacity discovery (multi-instance + per-instance ceiling)
 *
 * Companion to baseline.js. Where baseline caps at 100 VU to avoid DoS,
 * stress.js intentionally pushes past the known-good range to discover:
 *   (a) Cloud Run auto-scale behavior under sustained pressure
 *   (b) per-instance ceiling (run with max-instances=1 out-of-band)
 *
 * Same traffic mix + think-time + session-id hygiene as baseline.js.
 * Thresholds are weakened intentionally — we want the run to finish and
 * surface the degradation curve, not abort at the first breach.
 *
 * Run modes:
 *   # Phase A — full auto-scale stress (max-instances=10 in Cloud Run)
 *   k6 run --env TARGET=https://staging.nextlevelmock.com loadtest/stress.js
 *
 *   # Phase B — per-instance ceiling (caller must cap max-instances=1 first,
 *   # and MUST revert afterwards). Pass PHASE=single to swap stage profile.
 *   k6 run --env TARGET=https://staging.nextlevelmock.com --env PHASE=single loadtest/stress.js
 *
 * Threat-model notes (inherits from Phase 49):
 *   T-49-01 DoS staging — staging only; prod is explicitly off-limits.
 *   T-49-02 info disclosure — never log res.body.
 *   T-49-05 tampering — TARGET env var required; guard against prod.
 */

import http from 'k6/http';
import { sleep, check } from 'k6';
import { randomBytes } from 'k6/crypto';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

const PHASE = __ENV.PHASE || 'multi';

// Phase A: multi-instance stress (0→50→150→300→500→0 over ~13 min)
const STAGES_MULTI = [
  { duration: '1m', target: 50 },
  { duration: '3m', target: 150 },
  { duration: '2m', target: 300 },
  { duration: '3m', target: 300 },
  { duration: '1m', target: 500 },
  { duration: '2m', target: 500 },
  { duration: '1m', target: 0 },
];

// Phase B: single-instance ceiling (0→25→75→150→0 over ~7 min)
// Narrower ramp; 25 VU warm-up baseline to confirm healthy single-instance state.
const STAGES_SINGLE = [
  { duration: '30s', target: 25 },
  { duration: '1m', target: 25 },
  { duration: '30s', target: 75 },
  { duration: '2m', target: 75 },
  { duration: '30s', target: 150 },
  { duration: '2m', target: 150 },
  { duration: '30s', target: 0 },
];

export const options = {
  stages: PHASE === 'single' ? STAGES_SINGLE : STAGES_MULTI,
  thresholds: {
    // Weakened vs baseline: we expect degradation, want the run to complete.
    http_req_failed: ['rate<0.05'],
    'http_req_duration{kind:api}': ['p(95)<2000'],
    checks: ['rate>0.95'],
  },
  tags: { scenario: 'stress-v1.5', phase: PHASE },
  // Ensure summary includes high percentiles.
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(90)', 'p(95)', 'p(99)'],
};

const INTERVIEW_START_BODY = JSON.stringify({
  candidateName: 'k6-stress-test',
  interviewLevel: 'intermediate',
  questionCount: 3,
  techWeights: { JavaScript: 1 },
});

const INTERVIEW_AGENT_BODY = JSON.stringify({
  sessionId: 'k6-synthetic-session',
  event: 'tick',
  transcript: 'placeholder transcript from stress test',
});

// Same 40/30/15/10/5 mix as baseline for apples-to-apples comparison.
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
  // Guard: staging only. Prod = v0.1 GCE; off-limits.
  if (target.includes('nextlevelmock.com') && !target.includes('staging.nextlevelmock.com')) {
    throw new Error(`refuse: non-staging TARGET ${target} — use https://staging.nextlevelmock.com`);
  }
  return { target, phase: PHASE, startedAt: new Date().toISOString() };
}

export default function scenario(data) {
  const target = (data && data.target) || __ENV.TARGET;
  if (!target) throw new Error('TARGET env var is required');

  const route = pickRoute();
  const url = `${target}${route.path}`;

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId(),
      'User-Agent': `k6/stress-v1.5-${PHASE}`,
    },
    tags: { kind: route.kind, route: route.path },
    timeout: '30s',
  };

  const res = route.method === 'POST'
    ? http.post(url, route.body, params)
    : http.get(url, params);

  check(res, {
    'status < 500': (r) => r.status < 500,
    'has response': (r) => r.status !== 0,
  }, { kind: route.kind });

  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  const outPath = PHASE === 'single'
    ? '/tmp/loadtest-stress-v1.5/phaseB-single-summary.json'
    : '/tmp/loadtest-stress-v1.5/phaseA-multi-summary.json';
  return {
    [outPath]: JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: false }),
  };
}
