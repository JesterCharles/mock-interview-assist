---
phase: 50-judge0-integration-points-flag-audit
plan: 02
subsystem: feature-flags
tags: [feature-flag, api-routes, judge0, defense-in-depth]
requires:
  - 50-01
provides:
  - /api/coding/status
  - codingDisabledResponse()
affects:
  - "All 7 /api/coding/* + /api/trainer/[slug]/coding routes guarded"
  - "judge0Client.ts + codingAttemptPoll.ts short-circuited"
tech-stack:
  added: []
  patterns:
    - "Underscore-prefix colocated helper (Next.js convention): _disabledResponse.ts"
    - "Flag guard as FIRST statement in handler, before auth + DB"
    - "Defense-in-depth: API guard + library-layer guard"
key-files:
  created:
    - src/app/api/coding/status/route.ts
    - src/app/api/coding/status/route.test.ts
    - src/app/api/coding/_disabledResponse.ts
  modified:
    - src/lib/judge0Client.ts
    - src/lib/codingAttemptPoll.ts
    - src/lib/codingSignalService.ts
    - src/app/api/coding/submit/route.ts
    - src/app/api/coding/challenges/route.ts
    - src/app/api/coding/challenges/[id]/route.ts
    - src/app/api/coding/attempts/route.ts
    - src/app/api/coding/attempts/[id]/route.ts
    - src/app/api/coding/bank/refresh/route.ts
    - src/app/api/trainer/[slug]/coding/route.ts
    - src/lib/__tests__/judge0Client.test.ts
    - src/app/api/coding/submit/route.test.ts
    - (5 existing test files — beforeEach stub flag=true for pre-existing tests)
decisions:
  - "Guard fires BEFORE auth/body/DB to match Phase 49 load-test assumption (0% DB round-trip when flag off)"
  - "D-09 trainer admin has NO flag bypass — identical 503 for all callers"
  - "codingSignalService.ts NOT gated — pure mapper, gating lives at persistence callers"
  - "judge0Client guard fires BEFORE language + env check so placeholder URL never surfaces Judge0ConfigError"
metrics:
  duration: ~18min
  completed: 2026-04-18
  tasks: 2
  tests-added: 14
  regression-suite: 1044/1048 passing
---

# Phase 50 Plan 02: Server-Side Flag Guards Summary

**One-liner:** Guarded all 7 /api/coding/* routes + judge0Client + attempt poll with isCodingEnabled(); added unauthenticated /api/coding/status probe for Plan 03 UI.

## What Was Built

### Task 1: /api/coding/status probe + library-layer guards

- `src/app/api/coding/status/route.ts`: GET returns 200 + `{enabled: boolean}` + `Cache-Control: public, s-maxage=60`. Unauthenticated (probe endpoint). 5 tests cover: flag=true, flag=false, flag=unset, Cache-Control header, no-auth-required.
- `src/lib/judge0Client.ts`: `isCodingEnabled()` guard added as FIRST statement in `submit`, `getSubmission`, `systemInfo` — fires BEFORE language check (avoids spurious `UnsupportedLanguageError`) and BEFORE env read (avoids spurious `Judge0ConfigError` from placeholder URL). 6 new gating tests; existing 16 tests green.
- `src/lib/codingAttemptPoll.ts`: `pollAndMaybeResolveAttempt` + `aggregateJudge0Results` short-circuit with empty PollResult when flag off (no DB, no Judge0 call).
- `src/lib/codingSignalService.ts`: JSDoc comment documenting the no-gate decision (pure function; gating lives at persistence boundary).

Commit: `2e8d9e5` — `feat(50-02): add /api/coding/status probe + flag guards in judge0Client + attempt poll`

### Task 2: Guard all 7 API routes

- `src/app/api/coding/_disabledResponse.ts`: canonical 503 response `{enabled: false, message: "Coding challenges coming soon. Check back later!"}`. Underscore prefix = Next.js convention for non-route colocated modules.
- All 7 coding routes get flag guard as first statement (verified via grep audit):
  1. `/api/coding/submit` — POST
  2. `/api/coding/challenges` — GET
  3. `/api/coding/challenges/[id]` — GET
  4. `/api/coding/attempts` — GET
  5. `/api/coding/attempts/[id]` — GET
  6. `/api/coding/bank/refresh` — POST
  7. `/api/trainer/[slug]/coding` — GET (D-09: NO admin bypass)
- 3 new Phase 50 tests in `submit/route.test.ts` assert 503 body shape + guard fires before identity + before DB.

Commit: `0793fc5` — `feat(50-02): guard all 7 coding API routes with isCodingEnabled flag`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Regression] Pre-existing coding route + attempt-poll tests didn't stub `CODING_CHALLENGES_ENABLED`**

- **Found during:** Task 2 verification (`npm run test` full regression sweep)
- **Issue:** Adding flag guards to 7 routes + judge0Client caused 69 pre-existing tests to fail with 503 (flag was unset in test env).
- **Fix:** Added `vi.stubEnv('CODING_CHALLENGES_ENABLED', 'true')` to `beforeEach` in 5 existing test files (challenges, attempts/[id], bank/refresh, trainer/[slug]/coding, codingAttemptPoll).
- **Files modified:** 5 existing test files, all in same commit as the guard rollout (`0793fc5`).
- **Rationale:** Plan 02 action block (step 3 / IMPORTANT) explicitly called this out; treating as in-plan rather than deviation.

## Threat Flags

None.

## Self-Check: PASSED

- All 7 coding routes: `grep -q "isCodingEnabled"` returns OK for each
- `src/app/api/coding/status/route.ts` + `_disabledResponse.ts` FOUND
- `judge0Client.ts`, `codingAttemptPoll.ts`, `codingSignalService.ts` modifications present
- Full test suite 1044/1048 passing (4 pre-existing skipped)
- `npx tsc --noEmit` exits 0
- `npm run lint` 0 errors (pre-existing warnings unchanged)
- Commits `2e8d9e5` + `0793fc5` FOUND in git log
