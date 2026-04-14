---
phase: 05-readiness-signals
fixed_at: 2026-04-13T19:47:00Z
review_path: .planning/phases/05-readiness-signals/05-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 5: Code Review Fix Report

**Fixed at:** 2026-04-13T19:47:00Z
**Source review:** .planning/phases/05-readiness-signals/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3
- Fixed: 3
- Skipped: 0

## Fixed Issues

### WR-01: TOCTOU race between session count gate and trend query

**Files modified:** `src/lib/readinessService.ts`, `src/lib/__tests__/readinessService.test.ts`
**Commit:** d98043c
**Applied fix:** Replaced separate `prisma.session.count` gate + `computeTrend` re-query with a single `prisma.session.findMany` call in `computeReadiness`. The fetched sessions are used for both the 3-session gate check (via `.length`) and trend computation (passed directly to `computeTrend`). Added function overloads to `computeTrend` so it accepts either an `associateId` (legacy DB-query path) or pre-fetched session data. Extracted shared logic into `computeTrendFromSessions` helper. Updated all test cases to remove `mockSessionCount` usage and set up `mockSessionFindMany` for the gate check instead. All 13 tests pass.

### WR-02: Silent fallback to default threshold masks settings failures

**Files modified:** `src/app/api/history/route.ts`
**Commit:** daec8af
**Applied fix:** Added `console.error` logging in the `.catch()` handler for `getSettings()` so that settings fetch failures are visible in logs rather than silently falling back to the default threshold of 75.

### WR-03: settingsService.updateThreshold has no internal validation

**Files modified:** `src/lib/settingsService.ts`
**Commit:** bae8a99
**Applied fix:** Added defense-in-depth guard at the top of `updateThreshold` that validates `newThreshold` is a finite number between 0 and 100 (inclusive). Throws a descriptive error for invalid values (NaN, negative, >100, Infinity). This protects against invalid writes from non-API callers (CLI tools, migration scripts, internal services) that bypass the zod validation in the API route.

---

_Fixed: 2026-04-13T19:47:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
