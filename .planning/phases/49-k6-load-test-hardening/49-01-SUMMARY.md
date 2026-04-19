---
phase: 49-k6-load-test-hardening
plan: 01
subsystem: loadtest
tags: [load-test, k6, LOAD-01]
requires: []
provides:
  - loadtest/baseline.js (k6 scenario)
  - loadtest/generate-report.ts
  - loadtest/extrapolate-cost.ts
  - loadtest/run-baseline.sh
  - npm run loadtest:local | loadtest:report
affects:
  - package.json scripts
tech-stack:
  added: [k6 (external), k6-summary jslib (CDN-loaded by k6)]
  patterns: [pure-function-plus-CLI, regex-parse-test-for-k6-scripts]
key-files:
  created:
    - loadtest/baseline.js
    - loadtest/run-baseline.sh
    - loadtest/README.md
    - loadtest/generate-report.ts
    - loadtest/extrapolate-cost.ts
    - loadtest/__tests__/baseline-options.test.ts
    - loadtest/__tests__/generate-report.test.ts
    - loadtest/__tests__/extrapolate-cost.test.ts
    - loadtest/__tests__/fixtures/k6-summary-sample.json
  modified:
    - package.json (added loadtest:local, loadtest:report, abuse-test:all, verify-phase-49 scripts)
decisions:
  - k6 scenario caps at 100 VU (T-49-01 mitigation); run-baseline.sh refuses non-staging (T-49-05)
  - generate-report.ts is pure — Plan 02 pipes gcloud-fetched metrics via env vars
  - extrapolate-cost.ts uses worst-case pricing (no free-tier subtraction)
metrics:
  duration: ~20min
  completed: 2026-04-18
---

# Phase 49 Plan 01: k6 Scenario + Report + Cost Extrapolator Summary

Authored the three data-production artifacts for Phase 49 load-testing: k6 scenario `loadtest/baseline.js`, JSON→markdown `generate-report.ts`, and Cloud Run `extrapolate-cost.ts`. All three TDD-driven (RED → GREEN for each). 20/20 vitest cases pass.

## Stage durations + VU targets (D-01)

| Stage | Duration | Target VUs |
|-------|----------|-----------:|
| Ramp  | 1m       | 10         |
| Steady| 3m       | 50         |
| Spike | 2m       | 100        |
| Ramp-down | 1m   | 0          |

Total runtime: ~7 min. Max VU explicitly capped at 100 (T-49-01 mitigation).

## Thresholds (D-04) shipped in `options.thresholds`

```js
http_req_failed: ['rate<0.01']
'http_req_duration{kind:static}': ['p(95)<500']
'http_req_duration{kind:api}':    ['p(95)<1000']
checks: ['rate>0.99']
```

## Traffic mix (D-02)

| Weight | Method | Path |
|-------:|--------|------|
| 40% | GET  | `/` |
| 30% | GET  | `/api/health` |
| 15% | POST | `/api/public/interview/start` |
| 10% | POST | `/api/public/interview/agent` |
|  5% | GET  | `/api/question-banks` |
|  0% | —    | `/api/coding/*` (HARD-01) |

## File tree

```
loadtest/
├── README.md
├── baseline.js
├── run-baseline.sh
├── generate-report.ts
├── extrapolate-cost.ts
└── __tests__/
    ├── baseline-options.test.ts   (11 tests)
    ├── generate-report.test.ts    (6 tests)
    ├── extrapolate-cost.test.ts   (3 tests)
    └── fixtures/k6-summary-sample.json
```

## Test count + pass status

| Suite | Tests | Status |
|-------|------:|--------|
| baseline-options | 11 | PASS |
| generate-report  |  6 | PASS |
| extrapolate-cost |  3 | PASS |
| **Total**        | **20** | **PASS** |

Also verified: `LOADTEST_TOTAL_REQUESTS=10000 LOADTEST_VCPU_SECONDS=600 LOADTEST_GB_SECONDS=300 npx tsx loadtest/extrapolate-cost.ts` prints `0.001915` (matches hand computation within 1e-6).

## Deviations from Plan

None — plan executed exactly as written, with one minor regex tweak to a test assertion (the tags are attached to request params at call time rather than a static token, so the test matches `kind: route.kind` instead of `kind: 'static'` literal).

## Next Step

Plan 02 wires `.github/workflows/load-test.yml` body and runs the first baseline.

## Self-Check: PASSED

- loadtest/baseline.js — FOUND
- loadtest/generate-report.ts — FOUND
- loadtest/extrapolate-cost.ts — FOUND
- loadtest/run-baseline.sh (executable) — FOUND
- All 3 commits present on branch `chore/v1.5-archive-v1.4`
