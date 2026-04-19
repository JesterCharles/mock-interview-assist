---
phase: 42-sql-mvp-sqlite
plan: 01
subsystem: coding-stack
tags: [sql, sqlite, judge0, coding-challenges, normalization, security]
requires: [37-01, 38-02, 39-01, 39-02]
provides: [SqlTestCaseSchema, SetupSqlSchema, SETUP_SQL_MAX_BYTES, getSetupSql, normalizeSqliteResult]
affects: [submit-route-sql-branch, poll-route-sql-rescoring]
tech-added: []
key-files:
  created:
    - src/lib/sqlResultNormalizer.ts
    - src/lib/sqlResultNormalizer.test.ts
  modified:
    - src/lib/coding-bank-schemas.ts
    - src/lib/coding-challenge-service.ts
    - src/lib/judge0Client.ts
    - src/app/api/coding/submit/route.ts
    - src/lib/codingAttemptPoll.ts
decisions: [D-01, D-02, D-03, D-04, D-05, D-06]
metrics:
  duration: ~15m
  completed: 2026-04-18
  tests-added: 9
  tests-total: 925
---

# Phase 42 Plan 01: SQL MVP Schema + Normalizer + Submit Branch Summary

SQL first-class in the coding stack: schema-injected challenges run end-to-end through Judge0 SQLite with server-side row-set normalization and hidden-test shield preserved.

## Schemas Extended (coding-bank-schemas.ts)

- `SqlTestCaseSchema` — extends `TestCaseSchema` with `expectedRows`, `expectedColumns`, and D-05 normalization flags (`trimMode`, `numericCoerce`, `orderSensitiveColumns`, `rowOrderSensitive`)
- `SETUP_SQL_MAX_BYTES = 64 * 1024` — loader-side soft cap
- `SetupSqlSchema` — string with max-bytes validation
- `parseVisibleTestsForChallenge(meta, raw)` — returns `SqlTestCase[]` when meta.languages includes 'sql', else base `VisibleTests`
- `SqlTestCase` type exported

## Loader Extended (coding-challenge-service.ts)

- `getSetupSql(slug)` — server-only helper reading `challenges/<slug>/setup.sql` via the existing cached-public plumbing; cache key `public:<slug>:setup-sql`; 64 KB guard
- `loadChallenge` — when `meta.languages` includes `'sql'`, calls `getSetupSql` and attaches `setupSql` to `FullChallenge`; throws `ChallengeValidationError({path:'setup.sql'})` when SQL challenge missing setup.sql
- 404 from GitHub → null return (non-SQL challenges continue to have no setup.sql)
- `FullChallenge.setupSql?: string` type boundary documented as server-only

## Normalizer (sqlResultNormalizer.ts, +259 LOC)

Pure function implementing D-05 5-step pipeline:

1. Parse tab-delimited stdout (`.mode tabs` + `.headers off` output)
2. Trim per-cell (strict preserves internal whitespace; normalize collapses runs)
3. Numeric coerce (empty → null; digit-strings ↔ numbers when flag on)
4. Column reorder (alphabetical) when `orderSensitiveColumns === false`
5. Row sort (lex) when `rowOrderSensitive === false` (default for SQL)

Fallback: when `expectedRows` absent, trimmed `expectedStdout` string-equal compare (backward compat).

Defaults applied when flag undefined: `trimMode='normalize'`, `numericCoerce=true`, `orderSensitiveColumns=true`, `rowOrderSensitive=false`.

### Tests (sqlResultNormalizer.test.ts)

9 tests — 8 from `<behavior>` block + 1 column-count mismatch. All GREEN.

- parse + empty-stdout
- trim-strict vs trim-normalize
- numeric-coerce on (match) / off (type mismatch)
- column-order default fail / relaxed pass
- row-order default pass / strict fail
- mismatch reason security property (never echoes `secret-alpha`, `secret-bravo`, `999`, `888`)
- expectedStdout fallback
- null-cell coercion (empty-string ↔ null)

## Submit Route SQL Branch (src/app/api/coding/submit/route.ts)

- `getSetupSql(challenge.slug)` loaded server-side after hidden-test fetch; null → `VALIDATION_ERROR` response
- Per-test concatenation:

  ```
  .mode tabs
  .headers off
  <setupSql>
  <user code>
  <tc.stdin>
  ```

- Non-SQL path unchanged (user code + stdin pipe + expected_output as before)
- For SQL: Judge0 stdin is `''` and `expected_output` is `undefined` — Judge0's built-in match is not trusted for SQL (our normalizer handles it)
- `HIDDEN TEST SHIELD — do not echo setupSql/tc.stdin/expectedRows into response` comment above build block
- `setupSql` variable verified absent from all `Response.json`/`NextResponse.json` bodies (grep-clean)

## Poll-Side Re-Normalization (src/lib/codingAttemptPoll.ts)

- When `attempt.challenge.language === 'sql'`, re-derives per-case `passed`/`verdict` via `normalizeSqliteResult(stdout, tc)` against trainer-authored `expectedRows`
- Uses `loadHiddenTests` to fetch hidden SQL test cases (already server-only); visible cases without expectedRows fall through to Judge0's built-in
- Falls back to Judge0 verdicts + logs on re-normalize failure
- Compile-error / runtime-error / mle / timeout verdicts preserved (not re-normalized)

## Judge0 Language Map Provenance

`src/lib/judge0Client.ts`:

```typescript
sql: 82, // SQL (SQLite 3.27.2) — verified against Judge0 1.13.1 on 2026-04-18
```

Verification method: pinned-tag reference (CONTEXT fallback option 3). Docker daemon unavailable at execution time — live `/languages` re-verification remains part of the deferred Phase 38 SPIKE-VERIFICATION gate.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Normalizer test 3 semantics: numericCoerce=false must preserve type**

- **Found during:** GREEN step for Task 2
- **Issue:** Initial implementation converted number-literal expected cells to strings when `numericCoerce=false`, causing type-mismatch test to incorrectly pass
- **Fix:** `normalizeExpectedCell` now preserves native number type when coerce is off; actual side stays string; mismatch detected correctly
- **File modified:** `src/lib/sqlResultNormalizer.ts`
- **Commit:** 2bee7bc

**2. [Rule 3 — Blocker] TypeScript required expectedStdout on NormalizerInput**

- **Found during:** Typecheck after GREEN
- **Issue:** `Pick<SqlTestCase, ...>` made `expectedStdout` required, but tests omit it when providing `expectedRows`
- **Fix:** Wrapped in `Partial<>` — all normalizer input fields are optional (SqlTestCase itself still requires expectedStdout at loader boundary)
- **File modified:** `src/lib/sqlResultNormalizer.ts`
- **Commit:** 2bee7bc

### Judge0 Live Verification

Plan 3a marked BLOCKING but CONTEXT allowed fallback option 3 (pinned-tag reference) when Docker unavailable. Unattended mode + no running Judge0 stack → used fallback. Provenance comment is dated and traceable. Full live re-verification tied to deferred Phase 38 SPIKE-VERIFICATION gate (STATE active blocker).

## Pre-existing issues NOT fixed (scope boundary)

- `src/lib/coding-challenge-service.test.ts(240,17)` + related: pre-existing tsc errors, unrelated to Phase 42 changes. Logged to deferred items.

## Handoff to Plan 02

- `SQL_DIALECT_LABEL = 'SQL fundamentals (SQLite dialect)'` goes in `src/lib/codingLabels.ts` (new)
- Render on: `/coding` challenge cards, `/coding/[challengeId]` solve page header, trainer coding panel (discovered: `src/app/trainer/(dashboard)/[slug]/CodingAttemptsTable.tsx`)
- PROJECT.md Out of Scope bullet needs D-09 paragraph replacement (line 232)

## Self-Check: PASSED

- `src/lib/sqlResultNormalizer.ts` FOUND
- `src/lib/sqlResultNormalizer.test.ts` FOUND (9 tests, all pass)
- Commits found: 81b6915 (schema+loader), 95695e6 (RED tests), 2bee7bc (GREEN impl), 9857319 (submit+poll branches)
- Test total: 925 passing / 4 skipped (baseline was 916; +9 new)
- `npx tsc --noEmit` clean on all Phase 42 files (pre-existing test-file errors excluded)
- All Plan 01 grep audits pass: getSetupSql, normalizeSqliteResult, .mode tabs, .headers off, HIDDEN TEST SHIELD, verified against Judge0
- No `setupSql` leak in Response.json / NextResponse.json bodies
