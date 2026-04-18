# loadtest — k6 Scenarios

Phase 49 load-test baseline for v1.5 staging.

## Files

| File | Purpose |
|------|---------|
| `baseline.js` | k6 scenario: 10→50→100 VU ramp, mixed workload, D-04 thresholds. |
| `run-baseline.sh` | Local wrapper; refuses non-staging targets. |
| `generate-report.ts` | k6 JSON summary → `.planning/loadtest-baseline-v1.5.md`. |
| `extrapolate-cost.ts` | Cloud Run $/1k requests from vCPU-sec + GB-sec + request counts. |
| `scripts/fetch-cloud-run-metrics.sh` | CI helper: `gcloud monitoring` → vCPU/GB seconds. (Plan 02) |
| `scripts/fetch-supabase-query-count.sh` | CI helper: `gcloud logging` → queries/session. (Plan 02) |

## Quick Start

```bash
# 1. Install k6 (macOS):
brew install k6

# 2. Run against staging:
TARGET=https://staging.nextlevelmock.com ./loadtest/run-baseline.sh

# Or via package.json:
npm run loadtest:local

# 3. Render draft report:
npm run loadtest:report
```

## CI Run

Plan 02 wires `.github/workflows/load-test.yml` to trigger on `workflow_dispatch`
and `push` tags matching `v*`. The CI run publishes:

- `/tmp/loadtest-result.json` (k6 streaming output)
- `/tmp/loadtest-summary.json` (`--summary-export`)
- `/tmp/cloud-run-metrics.json` (peak CPU/mem + vCPU-sec)
- `/tmp/supabase-query-counts.json` (queries/session p50/p95)

All uploaded to GitHub Actions artifacts with 30-day retention.

## Thresholds (D-04)

```js
http_req_failed: ['rate<0.01']
http_req_duration{kind:static}: ['p(95)<500']   // GET /
http_req_duration{kind:api}:    ['p(95)<1000']  // /api/*
checks: ['rate>0.99']
```

Any threshold breach fails the CI job.

## Scope Carve-Out (HARD-01)

`/api/coding/*` is intentionally **NOT** exercised by this scenario.
`CODING_CHALLENGES_ENABLED=false` on staging during v1.5 load testing.
Judge0 integration is v1.6 scope.

## Next Step

Plan 02 commits the final `.planning/loadtest-baseline-v1.5.md` with the
4 LOAD-03 metrics populated from the first live CI run.
