---
phase: 42-sql-mvp-sqlite
reviewed: 2026-04-18T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/lib/coding-bank-schemas.ts
  - src/lib/coding-challenge-service.ts
  - src/lib/sqlResultNormalizer.ts
  - src/lib/sqlResultNormalizer.test.ts
  - src/lib/codingLabels.ts
  - src/app/api/coding/submit/route.ts
  - src/lib/codingAttemptPoll.ts
  - src/components/coding/ChallengeCard.tsx
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 42: Code Review Report

**Depth:** standard
**Status:** issues_found

## Summary

SQL MVP is well-architected: D-05 normalizer is pure, hidden-test shield holds (setup.sql never returned to client; normalizer reasons never echo expected values), label is single-sourced with grep-enforcement. Two warnings around correctness of the normalization compare; minor info items. No criticals, no SQL injection surface in our code (all Prisma queries parameterized, Judge0 sandboxes user SQL).

## Warnings

### WR-01: Concatenated script allows user query stdout to contaminate test output
**File:** `src/app/api/coding/submit/route.ts:203-211`
**Issue:** Source is `.mode tabs` + `.headers off` + setupSql + `parsedBody.code` + `tc.stdin`. If the associate's code emits rows (e.g., `SELECT * FROM users;`), those rows are prepended to each test-case stdout. `normalizeSqliteResult` treats the full stdout as actual rows — row-count and cell-match checks see user output first, producing false fails (or passes if row-order insensitive and counts happen to align). Also: user code runs BEFORE the test query, so `DROP TABLE`/`DELETE` corrupts hidden-test state (self-harm, but degrades signal).
**Fix:** Wrap the user query in a no-op sink, or emit a sentinel delimiter the normalizer can split on. Simplest: execute user code inside `BEGIN; ... ROLLBACK;` + run test query against a read-only view, or prefix test query with `.print '---TEST-START---'` and have the normalizer split stdout on the sentinel. Alternatively: require associate SQL to be wrapped as `CREATE VIEW answer AS ...` and test queries do `SELECT * FROM answer`.

### WR-02: No floating-point tolerance in cell comparison
**File:** `src/lib/sqlResultNormalizer.ts:136-141`
**Issue:** `cellsEqual` uses `a === b` after numeric coercion. SQLite AVG/SUM/division on REAL can produce `3.1400000000000006` where trainer authored `3.14`. Test 3 only covers integer coercion. This will produce flaky fails on any aggregate/arithmetic challenge.
**Fix:** Add `epsilon` flag (default `1e-9`) and compare with tolerance when both cells are numbers:
```ts
function cellsEqual(a: Cell, b: Cell, epsilon: number): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) <= epsilon * Math.max(1, Math.abs(a), Math.abs(b));
  }
  return a === b;
}
```
Plumb `epsilon` through `SqlTestCaseSchema` + `NormalizationFlags`.

## Info

### IN-01: Misleading comment in column-order test
**File:** `src/lib/sqlResultNormalizer.test.ts:95-96`
**Issue:** Comment says "actualColumns default matches expected — but cell order is swapped" — normalizer has no actualColumns concept. Test passes via cell-value mismatch, not column logic.
**Fix:** Update comment to reflect that default `orderSensitiveColumns=true` means cells are compared positionally.

### IN-02: Per-poll public-repo fetch for SQL attempts
**File:** `src/lib/codingAttemptPoll.ts:284-291`
**Issue:** Every poll on an unresolved SQL attempt re-fetches hidden tests. ETag cache helps in steady state, but a poll storm on a popular SQL challenge still round-trips to GitHub for 304s.
**Fix:** Cache the SQL-shape hidden tests in-memory by `challengeId` with short TTL, or hoist the load above the polling loop once per attempt resolution.

### IN-03: `expectedColCount` falls back to first expected row length
**File:** `src/lib/sqlResultNormalizer.ts:204`
**Issue:** When `expectedColumns` omitted, col-count is inferred from `expected[0]?.length`. If trainer submits empty `expectedRows: []` with no `expectedColumns`, no col-count check runs and mismatches surface later as row-count=0 pass.
**Fix:** Require `expectedColumns` when `expectedRows` is present in `SqlTestCaseSchema` (Zod `superRefine`).

---

_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
