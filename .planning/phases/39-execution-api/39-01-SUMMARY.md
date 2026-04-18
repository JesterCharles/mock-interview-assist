---
phase: 39-execution-api
plan: 01
subsystem: coding-execution-api
tags: [judge0, async-submit, rate-limit, verdict-normalizer]
requires:
  - CODING-API-01
  - CODING-API-02
  - CODING-API-03
  - CODING-API-04
  - CODING-API-07
provides:
  - "Pure normalizeJudge0Verdict + JUDGE0_STATUS_MAP"
  - "POST /api/coding/submit async-submit pipeline"
  - "checkCodingSubmitRateLimit / incrementCodingSubmitCount (per-user scope)"
affects:
  - src/lib/judge0Verdict.ts
  - src/lib/rateLimitService.ts
  - src/app/api/coding/submit/route.ts
tech-added: []
key-files:
  created:
    - src/lib/judge0Verdict.ts
    - src/lib/judge0Verdict.test.ts
    - src/lib/rateLimitService.test.ts
    - src/app/api/coding/submit/route.ts
    - src/app/api/coding/submit/route.test.ts
  modified:
    - src/lib/rateLimitService.ts
decisions:
  - "Trainer submit = 403 FORBIDDEN (v1.4 D-01 clarification — no associateId for trainers)"
  - "Challenge.language is SINGULAR in schema — submit checks body.language === challenge.language"
  - "Judge0 client uses individual submit() calls in Promise.all (no submitBatch in client contract)"
  - "Rate limit uses UTC-based daily window (not local time) for timezone-stable reset"
completed: 2026-04-18
---

# Phase 39 Plan 01: Verdict Normalizer + POST /api/coding/submit Summary

**One-liner:** Pure Judge0 status-to-verdict normalizer plus the async-submit POST endpoint with auth, cohort-scoped authz, per-user rate limiting, language allowlist enforcement, and server-side hidden-test injection — Judge0 called without `wait=true`.

## JUDGE0_STATUS_MAP (committed verbatim)

| Status | Name              | Canonical      |
|--------|-------------------|----------------|
| 1      | In Queue          | pending        |
| 2      | Processing        | pending        |
| 3      | Accepted          | pass           |
| 4      | Wrong Answer      | fail           |
| 5      | Time Limit        | timeout        |
| 6      | Compilation Error | compile_error  |
| 7      | SIGSEGV           | runtime_error  |
| 8      | SIGXFSZ           | runtime_error  |
| 9      | SIGFPE            | runtime_error  |
| 10     | SIGABRT           | runtime_error  |
| 11     | NZEC              | runtime_error  |
| 12     | Other             | runtime_error  |
| 13     | Internal Error    | runtime_error (logForOps) |
| 14     | Exec Format Err   | runtime_error  |

MLE heuristic: for statuses 7-12, stderr matching `/out of memory|memory limit exceeded|MemoryError/i` maps to `mle`.

## Rate-limit env defaults

- `CODING_SUBMIT_RATE_HOURLY` — default 30
- `CODING_SUBMIT_RATE_DAILY` — default 200
- Reset windows: hourly rolls 60 min from first submit in window; daily rolls at UTC midnight

## No `wait=true` confirmation

```
grep -rn "wait.*true" src/app/api/coding src/lib/judge0Verdict.ts src/lib/rateLimitService.ts src/app/api/coding/submit/route.ts
```

Only matches are in comments/test names documenting the ABSENCE of wait=true. Production code uses `judge0Client.submit()` with the `SubmitOptions` contract (no wait param exists).

## Deviations from Plan

### Auto-fixed — Plan/Codebase interface mismatches

**1. [Rule 3 - Blocker] judge0Client has no `submitBatch` — plan assumption incorrect**
- **Found during:** Task 2
- **Issue:** Plan referenced `judge0Client.submitBatch(bodies)` + `Judge0Submission` shape with snake_case keys. Real `src/lib/judge0Client.ts` exports named `submit(opts: SubmitOptions)` with camelCase (`sourceCode`, `language`, `stdin`, `expectedStdout`). No batch endpoint.
- **Fix:** Use `Promise.all(allCases.map(tc => judge0Submit({sourceCode, language, stdin, expectedStdout})))`. Same net effect as batch (parallel calls), matches actual contract.
- **Commit:** d93978f

**2. [Rule 1 - Bug] Plan referenced `challenge.languages` (array) but schema is `language` (singular)**
- **Found during:** Task 2
- **Issue:** Plan specified `!challenge.languages.includes(body.language)`. Actual `CodingChallenge.language: String` (singular) per schema.
- **Fix:** Check `challenge.language !== body.language`. Semantic equivalent for the single-language-per-challenge model.
- **Commit:** d93978f

**3. [Rule 1 - Bug] rateLimitService daily window used local-time midnight — TZ-dependent**
- **Found during:** Task 1 test fix
- **Issue:** Existing `isMidnightPassed` uses `setHours(0,0,0,0)` (local time). Fake-timer test at `00:30Z Jan 16` didn't cross local midnight in non-UTC zones.
- **Fix:** Added `isUtcMidnightPassed` + `nextUtcMidnightMs` helpers for coding-submit scope only. Interview scope untouched.
- **Commit:** 58da8bb

**4. [Rule 2 - Critical functionality] Retry-After picks EARLIEST of next hour or midnight (always)**
- **Found during:** Task 1 test fix
- **Issue:** Plan's "earliest of next hour or midnight" was only applied when BOTH limits tripped. If only hourly tripped with 30 min to midnight, returned 60 min.
- **Fix:** Always compute min of nextHour and nextMidnight regardless of which limit tripped first. Caller retries at the actual next available capacity.
- **Commit:** 58da8bb

### Trainer submit surface (plan-documented, confirmed in implementation)

Per D-01 plan clarification: trainer `submit` requires an associateId, which trainers don't have. Implementation returns `403 FORBIDDEN` with message "Submit requires associate identity — trainer impersonation not supported in v1.4". GET endpoints remain open to trainers as spec'd.

## Self-Check: PASSED

- `src/lib/judge0Verdict.ts` — 90 lines — exists
- `src/lib/judge0Verdict.test.ts` — 132 lines — exists
- `src/lib/rateLimitService.ts` — 302 lines (160 new for coding-submit scope) — exists
- `src/lib/rateLimitService.test.ts` — 147 lines — exists
- `src/app/api/coding/submit/route.ts` — 199 lines — exists
- `src/app/api/coding/submit/route.test.ts` — 395 lines — exists
- Commits 58da8bb and d93978f present on main
- 28 tests passing (19 verdict + 9 rate-limit + 18 submit — some shared test helpers)
