---
phase: 42-sql-mvp-sqlite
fixed_at: 2026-04-18T07:25:00Z
review_path: .planning/phases/42-sql-mvp-sqlite/42-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 42: Code Review Fix Report

**Fixed at:** 2026-04-18T07:25:00Z
**Source review:** `.planning/phases/42-sql-mvp-sqlite/42-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope (warnings only): 2
- Fixed: 2
- Skipped: 0
- 3 Info findings intentionally deferred per fix instructions (non-blocking).

## Fixed Issues

### WR-01: Concatenated script allows user query stdout to contaminate test output

**Files modified:** `src/app/api/coding/submit/route.ts`, `src/lib/sqlResultNormalizer.ts`, `src/lib/sqlResultNormalizer.test.ts`
**Commit:** `e92720c`
**Applied fix:** Submit route wraps trainer `tc.stdin` with `SELECT '---BEGIN-ANSWER---';` and `SELECT '---END-ANSWER---';` sentinel lines. `sqlResultNormalizer.sliceAnswerBlock()` extracts the block between markers before parsing; missing markers fall back to full-stdout parse for backward compat. Added 3 tests (noise-before, trailing-noise-after, markers-absent).

### WR-02: No floating-point tolerance in cell comparison

**Files modified:** `src/lib/sqlResultNormalizer.ts`, `src/lib/sqlResultNormalizer.test.ts`, `src/lib/coding-bank-schemas.ts`
**Commit:** `b646f09`
**Applied fix:** Added `epsilon: number` to `NormalizationFlags` (default `1e-9`) plumbed through `resolveFlags`. `cellsEqual(a, b, epsilon)` uses scale-aware compare `|a-b| <= eps * max(1, |a|, |b|)` only when both cells coerce to finite numbers — exact int / string / typed-mismatch paths stay strict. Exposed optional `epsilon` on `SqlTestCaseSchema` for trainer override. Added 4 tests (AVG drift, large-error rejected, integer exactness, custom override).

## Skipped Issues

None.

## Verification

- `npm run test -- --run`: **949 passed | 4 skipped** (baseline was 938 + 4 pre-existing schema test instability; suite now fully green at 949, zero failures).
- Normalizer suite alone: 16/16 passing (was 9).
- `npx tsc --noEmit`: no new errors in modified files. Pre-existing unrelated errors in `src/lib/coding-challenge-service.test.ts` (not touched).
- Info items IN-01, IN-02, IN-03 intentionally deferred per fix-scope instructions.

---

_Fixed: 2026-04-18T07:25:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
