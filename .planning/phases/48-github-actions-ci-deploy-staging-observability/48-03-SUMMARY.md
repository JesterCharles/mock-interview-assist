---
phase: 48
plan: 03
subsystem: observability-app
tags: [observability, logging, prometheus, feature-flag, tdd, middleware]
dependency-graph:
  requires: []
  provides: [structured-logger, metrics-endpoint]
  affects: [middleware, /api/health, /api/public/interview/*, /api/associate/interview/complete]
tech-stack:
  added: []
  patterns: [cloud-logging-json-stdout, feature-flag-strict-equality, edge-runtime-safe]
key-files:
  created:
    - src/lib/logger.ts
    - src/lib/__tests__/logger.test.ts
    - src/app/api/metrics/route.ts
    - src/app/api/metrics/__tests__/route.test.ts
  modified:
    - src/middleware.ts
    - src/app/api/health/route.ts
    - src/app/api/public/interview/start/route.ts
    - src/app/api/public/interview/agent/route.ts
    - src/app/api/public/interview/complete/route.ts
    - src/app/api/associate/interview/complete/route.ts
decisions:
  - Logger emits Cloud Logging canonical severities (WARNING not WARN; CRITICAL not FATAL)
  - Env resolves NLM_ENV → K_SERVICE → 'unknown' (K_SERVICE is Cloud Run free)
  - Extras merged flat into payload for jsonPayload.* querying; positional message wins
  - Feature flag uses STRICT equality on literal 'true' (OWASP default-deny; 'TRUE'/'1'/'yes' → 404)
  - Metrics landed as zero-valued stubs; real instrumentation deferred to Phase 49+
  - Middleware logs via single exit-point `emitLog(decision)` helper — surgical diff, no auth logic changes
metrics:
  completed-date: 2026-04-18
  duration-min: 3
  tasks-total: 3
  tasks-autonomous-completed: 3
  tasks-halted: 0
  tests-added: 18
  commits: 5
---

# Phase 48 Plan 03: Structured Logger + Metrics Endpoint Summary

**One-liner:** Shipped `src/lib/logger.ts` emitting Cloud-Logging-compatible JSON to stdout (11 unit tests, edge-runtime safe), wired it into middleware + 5 high-traffic routes with zero PII in payloads, and landed a feature-flagged `/api/metrics` Prometheus-text-0.0.4 endpoint (7 unit tests, default-OFF strict-equality flag).

## What Shipped

### `src/lib/logger.ts` (52 lines) + tests (108 lines)
- Exports `log.{debug,info,warn,error,critical}` + `LogSeverity` type
- `warn → WARNING`, `critical → CRITICAL` (Cloud Logging canonical, not `WARN`/`FATAL`)
- `env` resolver: `process.env.NLM_ENV || process.env.K_SERVICE || 'unknown'`
- Extras merged flat; positional `message` argument wins over extras-bag `message` key
- Never throws — circular reference falls back to `{severity, message, env, serialize_error: 'circular'}`
- Edge-safe: `console.log` + `process.env` only (no `fs`/`path`/`os`/streams)

**11/11 tests green** covering: severity mapping (5 severities), env resolution (3 paths), positional precedence, circular-ref safety, flat extras merge.

### Logger wired into 6 files (D-09 scope)
- `src/middleware.ts` — single `emitLog(decision)` helper called at every exit path; logs `route`, `method`, `decision` (10 distinct states: public/trainer-pass/redirect-signin-trainer/associate-pass/etc.), `latency_ms`, `authed`, `role`. Zero PII; auth logic unchanged.
- `src/app/api/health/route.ts` — `log.info` on 200, `log.warn` on 503 with `db`/`judge0`/`latency_ms`
- `src/app/api/public/interview/start/route.ts` — info on start/status, warn on rate_limited, error on catch (no fingerprint in payload)
- `src/app/api/public/interview/agent/route.ts` — info on request (topic + index + char_count, no response body), error on catch
- `src/app/api/public/interview/complete/route.ts` — info on success (sessionId only), error on persist fail + catch
- `src/app/api/associate/interview/complete/route.ts` — replaced `LOG_PREFIX` console.error with structured logger; sessionId only

### `src/app/api/metrics/route.ts` (47 lines) + tests (84 lines)
- Feature flag `NEXT_PUBLIC_METRICS_ENABLED === 'true'` (strict equality; literal lowercase only)
- Default off → HTTP 404 with empty body
- Flag on → HTTP 200 with Prometheus text 0.0.4:
  - `nlm_http_requests_total` (counter, value 0)
  - `nlm_http_request_duration_seconds` (histogram; count + sum = 0)
  - `nlm_active_sessions` (gauge, value 0)
  - `nlm_session_completions_total` (counter, value 0)
  - Each with `# HELP` + `# TYPE` comment lines, terminated with trailing newline per Prometheus spec
- Headers: `Content-Type: text/plain; version=0.0.4; charset=utf-8`, `Cache-Control: no-store`
- `export const dynamic = 'force-dynamic'`
- No `prom-client` dep added (stub keeps deps light)

**7/7 tests green** covering: default unset → 404, `'false'` → 404, `'TRUE'` → 404, `'1'` → 404, literal `'true'` → 200 + content-type, body contains all 4 metrics, body ends with `\n`.

## TDD Evidence

- **RED commit `ab9cb50`**: logger tests added; `vitest run src/lib/__tests__/logger.test.ts` → 11 failed (module not found)
- **GREEN commit `58ffcfa`**: `src/lib/logger.ts` added; same command → 11 passed
- **RED commit `bceb976`**: metrics tests added; `vitest run src/app/api/metrics/__tests__/route.test.ts` → 7 failed (module not found)
- **GREEN commit `99ece67`**: `src/app/api/metrics/route.ts` added; same command → 7 passed
- **Refactor commit `4c379a2`** (not a TDD pair — infrastructure): wiring across middleware + 5 routes. Typecheck green.

## Test Count Delta

- Before Phase 48: 1012 passing tests (vitest baseline)
- After Plan 48-03: 1026 passing (1012 + 14 new Phase 48 = +14; spec said ≥10). Actual delta +14 per vitest run (`11 logger + 7 metrics = 18 new tests` but baseline already showed some tests mid-flight; conservative delta counted).
- Plan 48-03 tests in isolation: 18/18 passing (`npx vitest run src/lib/__tests__/logger.test.ts src/app/api/metrics/__tests__/route.test.ts`)

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | `ab9cb50` | test(48-03): add failing logger tests (RED) |
| 2 | `58ffcfa` | feat(48-03): structured JSON logger (GREEN) |
| 3 | `4c379a2` | feat(48-03): wire structured logger into middleware + 5 high-traffic routes |
| 4 | `bceb976` | test(48-03): add metrics endpoint tests (RED) |
| 5 | `99ece67` | feat(48-03): prometheus-compatible /api/metrics route (GREEN) |

## Deviations from Plan

**[Scope boundary — deferred, not fixed]** During `npm run test` I observed 15 failures in `src/lib/codingAttemptPoll.test.ts`. These are caused by commit `2e8d9e5` (`feat(50-02): add /api/coding/status probe + flag guards in judge0Client + attempt poll`) which landed concurrent with this execution and added `isCodingEnabled()` short-circuit to `codingAttemptPoll.ts` without updating the existing test harness to stub the flag. Logged to `.planning/phases/48-github-actions-ci-deploy-staging-observability/deferred-items.md` — fix is Phase 50's responsibility, not Phase 48's.

**No P48-specific deviations.** Plan 03 executed exactly as written.

## Auth Gates / Human Checkpoints

None. Plan 48-03 was fully autonomous.

## Requirements Satisfied

- **OBS-01** — structured JSON logger emitting Cloud Logging canonical severities; middleware + 5 routes emit queryable `jsonPayload.env` / `jsonPayload.route` / etc.
- **OBS-03** — `/api/metrics` endpoint exists with Prometheus text format 0.0.4; feature-flagged default-off for info-leak safety.

## Threat Mitigations Verified

| Threat | Mitigation |
|--------|-----------|
| T-48-06 (Info disclosure via metrics endpoint) | Feature flag strict equality on literal `'true'`; 404 on everything else. 4/4 negative-path unit tests green. |
| T-48-06a (PII in logs) | Manual audit of all 6 wired files: only route/method/decision/status/latency/sessionId/topic/char_count/role logged — no full session payloads, no emails, no fingerprints, no cookies |
| T-48-06b (DoS via circular-ref logger crash) | try/catch around JSON.stringify; fallback entry has `serialize_error: 'circular'`; unit test asserts `expect(() => log.info('circ', { circ })).not.toThrow()` |

## Self-Check: PASSED

- Files exist:
  - `src/lib/logger.ts` — FOUND (52 lines)
  - `src/lib/__tests__/logger.test.ts` — FOUND (108 lines, 11 tests)
  - `src/app/api/metrics/route.ts` — FOUND (47 lines)
  - `src/app/api/metrics/__tests__/route.test.ts` — FOUND (84 lines, 7 tests)
- Commits exist: `ab9cb50`, `58ffcfa`, `4c379a2`, `bceb976`, `99ece67` — all FOUND
- Logger imported in 6 files: `grep -l "from '@/lib/logger'" src/middleware.ts src/app/api/health/route.ts src/app/api/public/interview/{start,agent,complete}/route.ts src/app/api/associate/interview/complete/route.ts | wc -l` → 6
- `npx tsc --noEmit` → 0 errors
- `npx vitest run src/lib/__tests__/logger.test.ts src/app/api/metrics/__tests__/route.test.ts` → 18/18 passing
