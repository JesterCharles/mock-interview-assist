---
phase: 42-sql-mvp-sqlite
status: partial
resolved: 2
deferred: 3
---

# Phase 42 Validation Gaps

## Filled (trivial)

| Gap | Test File | Tests | Requirement |
|-----|-----------|-------|-------------|
| `codingLabels.ts` helpers had no unit tests | `src/lib/codingLabels.test.ts` (new) | 8 | SQL-03 (D-07 single-source-of-truth) |
| `coding-bank-schemas.ts` SQL extensions unverified | `src/lib/coding-bank-schemas.test.ts` (extended) | 9 | SQL-01 (D-01 cap, D-02 shape) |

Totals: 925 → 942 passing, all GREEN. Typecheck clean.

## Deferred (non-trivial — require infra mocks)

### GAP-42-A — `getSetupSql` loader (SQL-01, D-01)
**Why deferred:** Requires mocking the GitHub public-proxy fetch + cache singleton. The loader's 64 KB cap + null-on-404 + cache-key pattern (`public:<slug>:setup-sql`) are verified only via grep in plan 01. Recommend adding integration test alongside existing `coding-challenge-service.test.ts` fetch mocks.

### GAP-42-B — `/api/coding/submit` SQL branch end-to-end (SQL-01, D-03/D-04)
**Why deferred:** Requires Judge0 client mock + Prisma attempt-row mock + auth session stub. Currently covered only by must-haves "Trainer-authored SQL challenge runs end-to-end" — no automated assertion that `.mode tabs` + `.headers off` + setup + user + tc.stdin concatenation actually reaches Judge0 in order. Recommend integration test extending `src/app/api/coding/submit/route.test.ts`.

### GAP-42-C — `codingAttemptPoll.ts` SQL re-normalization (SQL-02, D-06)
**Why deferred:** Poll-side path invokes `normalizeSqliteResult` only when `attempt.challenge.language === 'sql'`. Requires DB mock + Judge0 stdout fixture. Recommend adding SQL branch coverage to `codingAttemptPoll.test.ts`.

## Recommendation

Promote deferred gaps into Phase 44 (hardening + load test) since that phase already plans Judge0 integration fixtures.
