---
phase: 37-challenge-bank-contract-loader
plan: 01
subsystem: coding-challenges
tags: [zod, validation, schema-docs, contracts]
requires: [36-01, 36-02]
provides:
  - "docs/coding-bank-schema.md — authoring reference"
  - "coding-bank-schemas.ts — Zod + validateChallenge pipeline"
  - "coding-challenge-service.ts — typed loader skeleton"
affects:
  - "prisma/schema.prisma — CodingTestCase @@unique([challengeId, id]) added"
key-files:
  created:
    - docs/coding-bank-schema.md
    - src/lib/coding-bank-schemas.ts
    - src/lib/coding-bank-schemas.test.ts
    - src/lib/coding-challenge-service.ts
    - prisma/migrations/0007_challenge_testcase_unique/migration.sql
  modified:
    - prisma/schema.prisma
decisions:
  - "Added CodingTestCase @@unique([challengeId, id]) via migration 0007 (Phase 36 did not include it; required for syncChallengeToDb upsert)"
  - "Slug regex reused verbatim from curriculumService.ts"
  - "StarterSchema uses z.object().strict() keyed by language enum (unknown-key rejection)"
  - "Test-case array superRefine enforces unique ids + contiguous orderIndex starting at 0"
metrics:
  duration: 15min
  completed: 2026-04-18
  tests_added: 44
---

# Phase 37 Plan 01: Coding Bank Contract + Schema Delta Summary

Authoritative two-repo schema doc, Zod validation pipeline, loader-skeleton, and a required Phase 36 schema delta.

## Files

- `docs/coding-bank-schema.md` (113 lines) — trainer authoring guide
- `src/lib/coding-bank-schemas.ts` (245 lines) — MetaSchema, TestCaseSchema, VisibleTestsSchema, HiddenTestsSchema, StarterSchema, ChallengeValidationError, validateChallenge (5-step pipeline)
- `src/lib/coding-bank-schemas.test.ts` (44 tests) — all D-15 failure modes
- `src/lib/coding-challenge-service.ts` (92 lines) — typed loader skeleton with `import 'server-only'` sentinel; `FullChallenge` excludes `hiddenTests` field (compile-time D-05)
- `prisma/migrations/0007_challenge_testcase_unique/migration.sql` — composite `@@unique([challengeId, id])`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Phase 36 schema missing composite unique**
- Plan 37-02 task 2 requires `prisma.codingTestCase.upsert({ where: { challengeId_id } })`. Phase 36 schema declared only `id` as unique. Added `@@unique([challengeId, id])` to `CodingTestCase` and created migration 0007 (idempotent DO-block guard). Regenerated Prisma client.

**2. [Rule 3 - Blocking] `server-only` import unresolved in Vitest**
- Next.js `server-only` package lives under `next/dist/compiled` and is not resolvable by Vitest's Node runtime. Added `server-only` alias in `vitest.config.ts` pointing to `src/test-utils/server-only-shim.ts` (empty module) so server-only modules remain unit-testable. (Fixed during Plan 37-02 execution but originates from Plan 37-01's skeleton.)

## Self-Check: PASSED

- docs/coding-bank-schema.md: FOUND
- src/lib/coding-bank-schemas.ts: FOUND
- src/lib/coding-challenge-service.ts: FOUND
- prisma migration 0007: FOUND
- Commits c2d4d66 (test RED), d82ff7c (feat GREEN), 4c1e42e (skeleton): FOUND
