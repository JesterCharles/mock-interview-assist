---
phase: 08-schema-migration
plan: 02
subsystem: database
tags: [migration, prisma, supabase, halted]
status: halted-at-task-1
requires:
  - 08-01-SUMMARY.md
provides:
  - scripts/check-schema.mjs
affects:
  - (none — migration NOT applied; Dockerfile NOT modified; human checkpoint NOT reached)
tech-stack:
  added: []
  patterns: []
key-files:
  created:
    - scripts/check-schema.mjs
  modified: []
decisions:
  - Halted before running any destructive or baseline commands per PLAN.md Task 1 explicit instruction
metrics:
  duration: "~10m"
  completed: "2026-04-14 (halted)"
---

# Phase 8 Plan 2: Apply Migration & Wire Dockerfile — HALTED

**One-liner:** Migration apply halted at Task 1 with `P3005: database schema is not empty` — decision needed on baseline strategy before any destructive action.

## Status: HALTED at Task 1 (baseline decision required)

Tasks 2 (Dockerfile) and 3 (human-verify checkpoint) **NOT executed**. No files modified other than a read-only diagnostic script.

## Task 1 Outcome: Halted per PLAN instructions

### Exact `prisma migrate status` output (pre-deploy)

```
Loaded Prisma config from prisma.config.ts.
Prisma schema loaded from prisma/schema.prisma.
Datasource "db": PostgreSQL database "postgres", schema "public" at "db.fwhhihxoxjnjoxmpwrba.supabase.co:5432"

1 migration found in prisma/migrations
Following migration have not yet been applied:
0001_v11_cohorts

To apply migrations in development run prisma migrate dev.
To apply migrations in production run prisma migrate deploy.
```

Exit 1. No drift listed — just the one unapplied migration.

### Exact `npx prisma migrate deploy` output

```
Loaded Prisma config from prisma.config.ts.
Prisma schema loaded from prisma/schema.prisma.
Datasource "db": PostgreSQL database "postgres", schema "public" at "db.fwhhihxoxjnjoxmpwrba.supabase.co:5432"

1 migration found in prisma/migrations

Error: P3005

The database schema is not empty. Read more about how to baseline an existing production database: https://pris.ly/d/migrate-baseline
```

Exit 1. This was anticipated by PLAN.md Task 1 ("DB was previously bootstrapped via `db push` (no `_prisma_migrations` history)").

### Live DB state (verified via scripts/check-schema.mjs against DIRECT_URL)

- Existing tables: `Associate, GapScore, HealthCheck, Session, Settings`
- **Missing (migration would create):** `Cohort`, `CurriculumWeek`
- **Session.mode:** DOES NOT EXIST (migration would add)
- **Session.cohortId:** DOES NOT EXIST (migration would add)
- **Session.readinessRecomputeStatus:** DOES NOT EXIST (migration would add)
- **Associate.cohortId:** DOES NOT EXIST (migration would add)
- `_prisma_migrations` table: NULL (no migration history — confirms `db push` bootstrap)
- Row counts: 8 sessions, 3 associates

**Conclusion:** Live schema is the *pre-migration* state. The migration SQL (purely additive — see `prisma/migrations/0001_v11_cohorts/migration.sql`) still needs to actually run. Option (a) in PLAN.md — `prisma migrate resolve --applied 0001_v11_cohorts` — is **unsafe here** because it would mark the migration applied without creating any of the new tables/columns, leaving the schema inconsistent with what the app code will expect.

## Why I halted instead of proceeding

PLAN.md Task 1 explicit language: *"If deploy reports drift or 'following migration(s) have not yet been applied' conflicts, document exactly what it says and STOP task 1 before running destructive commands. Do NOT run `migrate reset`. Options to surface: (a) mark migration as applied via `prisma migrate resolve --applied 0001_v11_cohorts` if schema already matches, (b) halt for user decision."*

Schema does NOT match post-migration state → option (a) is wrong → **option (b): halt for user decision**.

## Resume signal (user decision required)

Pick one path and tell me which:

### Option 1: Baseline the DB, then apply migration (recommended)

Standard Prisma procedure for P3005 on a `db push`-bootstrapped DB when the migration still needs to actually run:

1. Create an empty baseline migration representing the current (pre-v1.1) schema state:
   ```bash
   mkdir -p prisma/migrations/0000_baseline
   npx prisma migrate diff \
     --from-empty \
     --to-schema-datamodel prisma/schema.prisma.baseline \
     --script > prisma/migrations/0000_baseline/migration.sql
   ```
   (Requires a snapshot of the pre-v1.1 schema — can be extracted from git history before v1.1 schema changes landed.)

2. Mark baseline as applied (does NOT run SQL):
   ```bash
   npx prisma migrate resolve --applied 0000_baseline
   ```
   This creates `_prisma_migrations` and inserts one row.

3. Run `npx prisma migrate deploy` — now applies only `0001_v11_cohorts` against the matching baseline.

### Option 2: Apply migration SQL manually, then mark as applied

1. Execute `prisma/migrations/0001_v11_cohorts/migration.sql` directly against DIRECT_URL via a one-shot Node script (using the `pg` pool we already use).
2. Run `npx prisma migrate resolve --applied 0001_v11_cohorts` — creates `_prisma_migrations` and records this migration as applied.
3. Subsequent `prisma migrate deploy` runs (including the one we'll bake into the Docker CMD in Task 2) will be no-ops.

**Tradeoff vs Option 1:** Simpler and achieves the same end state, but leaves no baseline migration in history. Future contributors cloning the repo and running `migrate deploy` against a fresh DB will see migration `0001_v11_cohorts` run against an empty schema — it will fail because the ALTER TABLE statements reference `Associate` and `Session` tables that don't exist yet in a green-field DB. **This breaks new-env provisioning** unless we also generate a baseline.

### Option 3: Accept breaking new-env provisioning (NOT recommended)

Apply the migration SQL by hand, `migrate resolve --applied`, and document that fresh-DB setup now requires `prisma db push` first, then `migrate deploy`. Bad long-term but fastest right now.

## My recommendation

**Option 1.** It is the one Prisma officially documents (`https://pris.ly/d/migrate-baseline`) and it gives us a clean migration chain for all future environments including the Docker runtime CMD added in Task 2. Task 2 assumes `migrate deploy` on an empty DB creates everything cleanly — Option 1 is the only one that makes that true.

If you approve Option 1, I'll also need you to confirm or produce the pre-v1.1 baseline schema (easiest: `git show <pre-v1.1-commit>:prisma/schema.prisma > prisma/schema.prisma.baseline`). Then I'll complete Task 1, proceed to Task 2, and stop at the Task 3 human-verify checkpoint as planned.

## Deviations from Plan

**1. [Rule 4 — architectural] Baseline strategy choice needed**
- **Found during:** Task 1
- **Issue:** P3005 expected (documented in PLAN.md), but PLAN.md option (a) is unsafe because schema does not match post-migration state. Architectural decision required per Rule 4.
- **Fix:** Halted per PLAN.md explicit instruction ("halt for user decision"). No destructive commands run.
- **Files modified:** `scripts/check-schema.mjs` (new, read-only diagnostic)
- **Commit:** (none yet — halted before commit)

## Verification of Success Criteria

All four Phase 8 success criteria are **NOT VERIFIED** because migration was not applied:

1. `prisma migrate deploy` runs cleanly — **NOT VERIFIED** (blocked by P3005)
2. `/api/sync-check` no new divergence — **NOT VERIFIED** (migration not applied)
3. `Associate.cohortId` nullable, existing rows null — **NOT VERIFIED** (column does not exist)
4. `Session.mode` defaults to 'trainer-led', zero nulls — **NOT VERIFIED** (column does not exist)

## Human checkpoint

**NOT REACHED.** Task 3 cannot run until Tasks 1 and 2 complete.

## Rollback notes

Nothing to roll back. No schema changes were made. No files modified except `scripts/check-schema.mjs` (additive, read-only helper that can be kept or deleted).

## Self-Check: PASSED

- `scripts/check-schema.mjs` exists: FOUND
- `prisma/migrations/0001_v11_cohorts/migration.sql` unchanged: FOUND (from Plan 01)
- Dockerfile unchanged: FOUND (no edits made)
- No new commits: confirmed via `git status`
