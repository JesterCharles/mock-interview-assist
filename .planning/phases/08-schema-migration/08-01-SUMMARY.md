---
phase: 08-schema-migration
plan: 01
subsystem: database
tags: [prisma, postgres, supabase, schema, migration, cohorts]

requires:
  - phase: 00-foundation
    provides: "Existing Associate, Session, GapScore, Settings Prisma models"
provides:
  - "Cohort model (id, name, startDate, endDate, description)"
  - "CurriculumWeek model with skillSlug + UNIQUE(cohortId, weekNumber)"
  - "Associate.cohortId nullable FK (onDelete: SetNull)"
  - "Session.cohortId nullable FK (onDelete: SetNull)"
  - "Session.mode column default 'trainer-led'"
  - "Session.readinessRecomputeStatus column default 'not_applicable' (Phase 10 repair-path)"
  - "Atomic additive migration SQL at prisma/migrations/0001_v11_cohorts/migration.sql"
affects: [09-cohort-management, 10-automated-interview-pipeline, 11-cohort-readiness, 13-curriculum-schedule]

tech-stack:
  added: []
  patterns:
    - "Nullable cohort FKs for additive-only v1.1 migration (zero v1.0 breakage)"
    - "String-typed enums (readinessRecomputeStatus) enforced in TS layer, not Prisma enums (D-11)"
    - "Hand-written Prisma migration SQL (bypasses --create-only when DB lacks migration history)"

key-files:
  created:
    - "prisma/migrations/0001_v11_cohorts/migration.sql"
    - "prisma/migrations/migration_lock.toml"
  modified:
    - "prisma/schema.prisma"
    - "src/generated/prisma/ (regenerated)"

key-decisions:
  - "Hand-wrote migration SQL because Supabase DB has no prior _prisma_migrations history; --create-only reported drift and would have required a reset"
  - "Kept readinessRecomputeStatus as String with index for Phase 10 sweep query performance"
  - "Applied UNIQUE(cohortId, weekNumber) immediately (Codex #9) rather than deferring"

patterns-established:
  - "v1.1 schema pattern: nullable FK + SetNull onDelete preserves v1.0 flows"
  - "Repair-path pattern: status column + dedicated index enables background sweep queries"

requirements-completed: ["COHORT-02"]

duration: 2m
completed: 2026-04-14
---

# Phase 08 Plan 01: Schema Migration Summary

**Cohort + CurriculumWeek Prisma models with nullable FKs, Session.mode/readinessRecomputeStatus columns, and atomic additive migration SQL for v1.1 cohort foundation**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-14T17:33:16Z
- **Completed:** 2026-04-14T17:34:45Z
- **Tasks:** 2
- **Files modified:** 4 (+ regenerated Prisma client)

## Accomplishments
- Cohort and CurriculumWeek models with skillSlug + UNIQUE(cohortId, weekNumber)
- Nullable Associate.cohortId and Session.cohortId FKs (onDelete SetNull)
- Session.mode default 'trainer-led' and Session.readinessRecomputeStatus default 'not_applicable' with dedicated index
- Single atomic migration SQL (additive only — no destructive DDL)
- Prisma client regenerated with new types exported

## Task Commits

1. **Task 1: Extend schema.prisma with Cohort, CurriculumWeek, FKs** - `c7ecc0f` (feat)
2. **Task 2: Hand-write migration SQL + regen Prisma client** - `427d2cb` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added Cohort + CurriculumWeek, modified Associate + Session
- `prisma/migrations/0001_v11_cohorts/migration.sql` - Atomic additive migration
- `prisma/migrations/migration_lock.toml` - Provider lock (`postgresql`)
- `src/generated/prisma/` - Regenerated client with Cohort, CurriculumWeek types

## Decisions Made
- **Hand-written migration SQL instead of `prisma migrate dev --create-only`.** The Supabase DB has no existing `_prisma_migrations` history (schema was bootstrapped via `db push`). Prisma detected drift and insisted on a schema reset, which is unacceptable against prod data. Plan explicitly allowed this fallback; migration SQL was written by hand to match the exact spec and `npx prisma generate` ran cleanly.
- Backfill `UPDATE` statements appended to migration SQL as belt-and-suspenders even though `ADD COLUMN ... DEFAULT` already populates existing rows in Postgres.

## Deviations from Plan

None - plan executed exactly as written. The hand-written SQL path was explicitly sanctioned by the plan's Task 2 fallback clause.

## Issues Encountered
- `npx prisma migrate dev --create-only` reported drift against the live Supabase DB and offered only `prisma migrate reset` — unusable. Resolved by falling back to hand-written SQL per plan's explicit fallback instruction.

## User Setup Required

None - no external service configuration required for this plan. Migration application against the live DB happens in Plan 08-02.

## Next Phase Readiness
- Schema foundation ready for Phase 09 (Cohort management UI/API), Phase 10 (automated-interview-pipeline repair sweep uses `readinessRecomputeStatus`), Phase 11 (cohort readiness aggregation), and Phase 13 (curriculum schedule — will populate `CurriculumWeek.skillSlug` from trainer UI).
- Plan 08-02 is responsible for applying the migration against the live DB (requires `DIRECT_URL` + `prisma migrate deploy`).

## Self-Check: PASSED

Verified:
- prisma/schema.prisma exists and `prisma validate` exits 0
- prisma/migrations/0001_v11_cohorts/migration.sql exists and contains `CREATE TABLE "Cohort"`, `CREATE TABLE "CurriculumWeek"`, `skillSlug`, unique on (cohortId, weekNumber), `readinessRecomputeStatus`
- prisma/migrations/migration_lock.toml exists with `provider = "postgresql"`
- src/generated/prisma/index.d.ts exports `Cohort`, `CurriculumWeek`, `skillSlug`, `readinessRecomputeStatus`
- No destructive DDL (no DROP COLUMN, DROP TABLE, ALTER ... DROP) in migration SQL
- Commits `c7ecc0f` and `427d2cb` found in git log

---
*Phase: 08-schema-migration*
*Completed: 2026-04-14*
