---
phase: 39-execution-api
fixed_at: 2026-04-18T06:40:00Z
review_path: .planning/phases/39-execution-api/39-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 39: Code Review Fix Report

**Fixed at:** 2026-04-18T06:40:00Z
**Source review:** `.planning/phases/39-execution-api/39-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (all P2 warnings)
- Fixed: 3
- Skipped: 0
- Info findings (IN-01/02/03): out of scope — deferred
- Full test suite: 833 passed / 0 failed / 4 skipped (baseline 823 → +10, including 4 new regression tests)

## Fixed Issues

### WR-01: Signal writeback awaits — violates D-11 fire-and-forget contract

**Files modified:** `src/lib/codingAttemptPoll.ts`, `src/lib/codingAttemptPoll.test.ts`
**Commit:** `7753d22`
**Applied fix:** Replaced `await prisma.codingSkillSignal.upsert(...)` wrapped in try/catch with `void prisma.codingSkillSignal.upsert(...).catch(err => console.error(...))`. The upsert promise is now detached — errors still log to stderr but never delay the poll response. Added regression test that returns a never-resolving upsert and asserts the poll returns in <100ms regardless.

### WR-02: Orphaned-pending attempts when token persistence fails

**Files modified:** `src/app/api/coding/submit/route.ts`, `src/app/api/coding/submit/route.test.ts`
**Commit:** `011abb9`
**Applied fix:** Chose the "delete + 503" approach (symmetric with existing Judge0-failure rollback) over the `verdict='judge0_unavailable'` terminal-state option. Cleaner because it matches the existing failure path, keeps the verdict enum minimal, and lets the client retry immediately without a stale-attempt row. If `codingAttempt.update` rejects, we `delete` the row, return 503 `JUDGE0_UNAVAILABLE`, and skip `incrementCodingSubmitCount` so the user's rate limit isn't charged for a lost submission. Regression test asserts 503 + delete-called + rate-limit not incremented.

### WR-03: checkCodingSubmitRateLimit persists on every call

**Files modified:** `src/lib/rateLimitService.ts`, `src/lib/rateLimitService.test.ts`
**Commit:** `7845307`
**Applied fix:** Replaced reference-identity check `rolled !== bucket` (always true due to unconditional spread-copy) with field comparison `rolled.hourlyWindowStart !== bucket.hourlyWindowStart || rolled.dailyWindowStart !== bucket.dailyWindowStart`. Two regression tests: (1) check inside the same hourly+daily window leaves the file byte-identical; (2) check after hourly window expiry rewrites and resets `hourlyCount` to 0.

---

_Fixed: 2026-04-18T06:40:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
