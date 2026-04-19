# Phase 48 Deferred Items

Out-of-scope issues discovered during P48 execution. Not fixed.

## Pre-existing failures in codingAttemptPoll.test.ts (15 failures)

- **Cause:** P50-02 commit `2e8d9e5` (`feat(50-02): add /api/coding/status probe + flag guards in judge0Client + attempt poll`) added `isCodingEnabled()` short-circuit to `codingAttemptPoll.ts` but did NOT update the existing `src/lib/codingAttemptPoll.test.ts` harness to stub `isCodingEnabled()` in beforeEach. Tests now short-circuit with `{ resolved: false, reason: 'coding-disabled' }` instead of exercising the polling/aggregation path.
- **Scope:** Plan 50-02 territory; not Phase 48.
- **Impact:** None on Phase 48 deliverables. Logger + metrics have 18/18 green tests; typecheck clean.
- **Fix required in P50:** stub `vi.mock('./judge0Client')` or set `CODING_CHALLENGES_ENABLED=true` in beforeEach for the `codingAttemptPoll.test.ts` suite.

## Modified-but-uncommitted files (also P50-02 aftermath)

- `src/app/api/coding/challenges/route.ts`
- `src/app/api/coding/submit/route.test.ts`
- `src/app/api/coding/submit/route.ts`
- `src/app/api/coding/_disabledResponse.ts` (untracked)
- `.planning/phases/50-judge0-integration-points-flag-audit/50-01-SUMMARY.md` (untracked)

These surfaced via P50-02 flag-audit work running concurrently. Not committed by Phase 48; left for P50 completion.
