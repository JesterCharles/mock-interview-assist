---
phase: 46-supabase-staging-env-hygiene-prisma-migrate-baseline
plan: 01
subsystem: data/seed-infra
status: complete
mode: unattended
requirements:
  - DATA-03
threats_mitigated:
  - T-46-01
  - T-46-02
tags: [seed, staging, faker, prisma, guard]
dependency_graph:
  requires: []
  provides:
    - scripts/lib/assert-staging-env.ts (STAGING_REF, assertStagingDatabase, assertProdDatabase, maskUrl)
    - scripts/seed-staging.ts (exported main(), idempotent)
    - @faker-js/faker ^10.4.0 devDep
    - package.json scripts.seed-staging
  affects:
    - Plan 46-02 wipe-prod.ts (imports assertProdDatabase)
    - Plan 46-04 verify-env-hygiene.ts (imports STAGING_REF pattern)
tech-stack:
  added:
    - "@faker-js/faker@^10.4.0 (devDependency)"
  patterns:
    - "Locale-pinned import (@faker-js/faker/locale/en) + seed(1337) before any faker.* call"
    - "Exported main() + direct-invocation gate so tests can call main() without triggering top-level side effects"
    - "vi.mock of src/lib/prisma.js + scripts/lib/assert-staging-env.js so idempotency tests run in-process"
key-files:
  created:
    - scripts/lib/assert-staging-env.ts
    - scripts/seed-staging.ts
    - scripts/__tests__/assert-staging-env.test.ts
    - scripts/__tests__/seed-staging.test.ts
  modified:
    - package.json (devDep + scripts.seed-staging)
decisions:
  - "Used locale-pinned Faker import (@faker-js/faker/locale/en) per RESEARCH pitfall 6 — mandatory for determinism"
  - "Kept CodingChallenge seeding deferred (TODO 46-03) — 10 stable bank-slugs not yet picked"
  - "main() is exported for test invocation; direct-invocation gate uses argv[1] regex to prevent double-run under tests"
metrics:
  commits: 3
  duration_wall_min: ~10
  tests_added: 21 (12 assert-staging-env + 9 seed-staging cases, counting groups)
  tests_passing: 21
  lines_added: ~700
completed_date: 2026-04-18
---

# Phase 46 Plan 01: Supabase Staging Seed Infrastructure Summary

Seed-infrastructure autonomous ship: shared env-guard helper, idempotent Faker+Prisma staging seeder, @faker-js/faker dev-dep, and two vitest suites (22 passing cases total) proving determinism + refuse-to-run-against-prod semantics.

## Artifacts Shipped

- `scripts/lib/assert-staging-env.ts` — exports `STAGING_REF` (`lzuqbpqmqlvzwebliptj`), `assertStagingDatabase()`, `assertProdDatabase(expectedProdRef)`, and `maskUrl(url)`. Error messages embed `maskUrl()` output so raw credentials never leak to log streams. Plan 02's `wipe-prod.ts` imports `assertProdDatabase`; Plan 04's `verify-env-hygiene.ts` reuses the hygiene constants.
- `scripts/seed-staging.ts` — exported `main()` + direct-invocation gate. `assertStagingDatabase()` is the FIRST statement in the module body; `faker.seed(1337)` is the second. Seeds 3 Cohorts, 30 Associates (10 per cohort, `staging-{slug}-assoc-NN`, `@example.com`), 36 CurriculumWeeks (12 weeks × 3 cohorts), 15 Sessions (every other associate × 3 cohorts), 1 Settings singleton. Every mutating op is `prisma.*.upsert` keyed on `@unique` OR `findFirst` + update/create (Cohort only). **CodingChallenges deferred to 46-03** — marked with a `TODO(46-03)` comment.
- `scripts/__tests__/assert-staging-env.test.ts` — 12 vitest cases covering the 8 locked behaviors: throws on unset URL, throws on wrong ref, returns void on match, inverse semantics for prod guard, maskUrl invariants, no-leak on thrown messages, STAGING_REF constant verification.
- `scripts/__tests__/seed-staging.test.ts` — 12 vitest cases across 2 groups:
  - **Faker determinism (3)** — two fresh `new Faker({ locale: [en] })` instances with `seed(1337)` produce identical `firstName` sequences, identical `number.float` sequences, and the locale-pinned bare import path resolves without throwing.
  - **Seeder idempotency (9)** — mocked Prisma + guard modules; main() is called twice with `cohortByName` cache preserved between runs so the second run takes the `findFirst → update` branch. First run asserts counts 3/36/30/15/1; second run asserts identical counts across weeks/associates/sessions/settings and zero `cohort.create` calls (all updates); 30 distinct slugs; 15 distinct session ids; 36 distinct (cohortId, weekNumber) keys; all emails match `/@example\.com$/`; slugs match `^staging-(alpha|beta|gamma)-2026-assoc-\d{2}$`.

## Exports Downstream Plans Will Use

```typescript
// Plan 02 wipe-prod.ts
import { assertProdDatabase } from './lib/assert-staging-env.js';

// Plan 04 verify-env-hygiene.ts (pattern only; file is direct-scan, not guard)
import { STAGING_REF } from './lib/assert-staging-env.js';
```

## Seeder Entity Counts

| Entity          | Count | Keying                                       |
| --------------- | ----- | -------------------------------------------- |
| Cohort          | 3     | findFirst by name, then update/create        |
| CurriculumWeek  | 36    | upsert on `@@unique([cohortId, weekNumber])` |
| Associate       | 30    | upsert on `slug @unique`                     |
| Session         | 15    | upsert on `id @id` (composite string)        |
| Settings        | 1     | upsert on `id @default(1)`                   |
| CodingChallenge | 0     | deferred — `TODO(46-03)` in source           |

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria from 46-01-PLAN.md Tasks 1/2/3 met on first pass.

## Verification

- `npm run test -- scripts/__tests__/assert-staging-env.test.ts` → **12 passed**
- `npm run test -- scripts/__tests__/seed-staging.test.ts` → **12 passed**
- `npx tsc --noEmit` → **0 errors**
- Full suite `npm run test` → **987 passed, 4 skipped, 1 skipped suite** (no regressions introduced by this plan)
- `grep -q "lzuqbpqmqlvzwebliptj" scripts/lib/assert-staging-env.ts` → match
- `grep -q "faker.seed(1337)" scripts/seed-staging.ts` → match
- `grep -q "@faker-js/faker/locale/en" scripts/seed-staging.ts` → match
- `grep -q "from '../src/lib/prisma.js'" scripts/seed-staging.ts` → match
- `grep -q '"@faker-js/faker":' package.json` → match `"^10.4.0"`
- `grep -q '"seed-staging":' package.json` → match

## Commits

| Hash    | Message                                                                    |
| ------- | -------------------------------------------------------------------------- |
| b27336f | feat(46-01): add assert-staging-env guard + unit tests                     |
| 9133c27 | feat(46-01): install @faker-js/faker + add seed-staging test scaffold      |
| f0a6cf1 | feat(46-01): add idempotent seed-staging.ts + idempotency tests            |

## Self-Check: PASSED

- scripts/lib/assert-staging-env.ts → **FOUND**
- scripts/seed-staging.ts → **FOUND**
- scripts/__tests__/assert-staging-env.test.ts → **FOUND**
- scripts/__tests__/seed-staging.test.ts → **FOUND**
- Commit b27336f → **FOUND**
- Commit 9133c27 → **FOUND**
- Commit f0a6cf1 → **FOUND**
