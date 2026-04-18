---
phase: 41-gapscore-integration
fixed_at: 2026-04-18T06:52:00Z
review_path: .planning/phases/41-gapscore-integration/41-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 41: Code Review Fix Report

**Fixed at:** 2026-04-18T06:52:00Z
**Source review:** .planning/phases/41-gapscore-integration/41-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (WR-01, WR-02)
- Fixed: 2
- Skipped: 0
- Info findings (IN-01/02/03): out of scope; IN-01 is effectively resolved by the WR-02 fix (same root cause).

## Fixed Issues

### WR-01: Trainer route returns 401, not 403, for non-trainer callers

**Files modified:** `src/app/api/trainer/[slug]/coding/route.ts`, `src/app/api/trainer/[slug]/coding/route.test.ts`
**Commit:** c5404e7
**Applied fix:** Split the auth gate — anonymous callers still get 401; authenticated non-trainer/admin now returns 403. Updated the existing associate-auth test from 401 → 403.

### WR-02: `sessionCount` semantics diverge between interview and coding paths (resolves IN-01 as well)

**Files modified:** `src/app/api/trainer/[slug]/coding/route.ts`, `src/app/api/trainer/[slug]/coding/route.test.ts`, `src/lib/gapPersistence.ts`
**Commit:** 6bab349
**Applied fix:** In the trainer aggregate, cap each topic row's weight at `MAX_WEIGHT_PER_TOPIC = 10` so a single topic cannot dominate the cross-topic mean via attempt-count farming. `attemptCount` returned to clients is still the raw sum (useful for UI volume). Added a documentation block to `persistCodingSignalToGapScore` calling out the dual `sessionCount` semantic (distinct-session on the interview path vs attempt-count on the coding path) and directing downstream consumers to the cap. Added a farming-resistance test (1 high-score attempt vs 1000 low-score attempts — capped mean ≈ 190/11 instead of ≈ 10.08 uncapped).

## Verification

- `npx vitest run src/app/api/trainer/[slug]/coding/route.test.ts src/lib/__tests__/gapPersistence.coding.test.ts`: 19/19 passing.
- `npm run test` post-fix: 905 passing / 2 failing (both pre-existing and unrelated — `coding-challenge-service.test.ts` ETag TTL, `bundle.test.ts` Monaco import guard). Baseline without my changes: 903 passing / 1 failing. Net: +2 tests passing (1 new farming-resistance test + 1 transitioned test), zero regressions introduced.

## Skipped Issues

None.

---

_Fixed: 2026-04-18_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
