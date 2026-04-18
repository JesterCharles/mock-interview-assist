---
phase: 37-challenge-bank-contract-loader
plan: 02
subsystem: coding-challenges
tags: [github, cache, etag, prisma, loader]
requires: [37-01]
provides:
  - "Implemented listChallenges / loadChallenge / loadHiddenTests / syncChallengeToDb"
  - "Module-state cache with TTL + ETag + stampede dedupe"
  - ".env.example env var block for coding bank"
affects:
  - "src/lib/coding-challenge-service.ts (skeleton → full impl)"
  - "vitest.config.ts (server-only alias)"
key-files:
  created:
    - src/lib/coding-challenge-service.test.ts
    - src/test-utils/server-only-shim.ts
  modified:
    - src/lib/coding-challenge-service.ts
    - vitest.config.ts
    - .env.example
decisions:
  - "Public path uses TTL-only caching (the /api/github proxy does not forward If-None-Match). Private path uses TTL+ETag. 5-min TTL still satisfies the 'author-to-visible within 5 min' success criterion."
  - "loadChallenge fetches hidden tests for the step-5 disjointness check but discards them from the return (FullChallenge has no hiddenTests field — compile-time D-05 boundary)."
  - "loadChallenge wraps raw private-fetch errors as ChallengeValidationError so listChallenges and syncChallengeToDb surface per-slug failures consistently."
  - "syncChallengeToDb reconciles via deleteMany({id: {notIn}}) + per-case upsert inside prisma.$transaction (D-14 idempotency)."
metrics:
  duration: 20min
  completed: 2026-04-18
  tests_added: 18
---

# Phase 37 Plan 02: Challenge Bank Loader Summary

Implements fetch + cache + sync for the two-repo challenge bank. Honors D-05 public/private separation, D-10..D-12 caching, D-14 idempotent sync.

## Key Behavior Covered

- Cache TTL hit/miss + CODING_BANK_CACHE_TTL_MS env override
- ETag 304 short-circuit on private path
- Stampede dedupe via inFlight Map
- Duplicate-slug rejection in manifest walk (D-15 step 4)
- cohortId filter (global + matching-cohort entries only)
- syncChallengeToDb idempotent (snapshot-equal after two calls)
- Reconciliation: deleted visible test removed, renamed test delete+insert
- Transaction integrity (all writes inside prisma.$transaction)

## Deviations

**Env-var path**: Plan called for ETag revalidation on both public + private paths, but the existing `/api/github` proxy does not forward `If-None-Match`. Scoped ETag to private path only; public path relies on TTL (5 min still meets CODING-BANK-04 success criterion).

**Test harness**: Added `server-only` vitest alias + shim so the server-only module is unit-testable without rewiring production import.

## Self-Check: PASSED

All 18 new tests green; full repo suite 657 passing. Commit af1f18d records the work.
