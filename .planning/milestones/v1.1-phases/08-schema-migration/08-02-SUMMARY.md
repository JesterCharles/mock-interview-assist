---
phase: 08-schema-migration
plan: 02
subsystem: database
tags: [migration, prisma, supabase, cohorts, docker]
status: complete
requires:
  - 08-01-SUMMARY.md
provides:
  - prisma/migrations/0000_baseline/migration.sql
  - Dockerfile (runtime migrate deploy)
affects:
  - Dockerfile
  - Supabase dev DB schema (Cohort, CurriculumWeek added; Associate.cohortId + Session.cohortId/mode/readinessRecomputeStatus added)
tech-stack:
  added: []
  patterns:
    - "Runtime migrate deploy (not build time) via Docker CMD shim"
    - "Baseline migration created retroactively from git snapshot (git 9662034) for db-push bootstrapped schemas"
key-files:
  created:
    - prisma/migrations/0000_baseline/migration.sql
    - scripts/check-schema.mjs (from halted pass)
  modified:
    - Dockerfile
decisions:
  - "Option 1 (baseline strategy) approved: created 0000_baseline from pre-v1.1 git snapshot, resolved as applied, then migrate deploy applied 0001_v11_cohorts cleanly"
  - "Runtime migrate deploy (CMD shim) chosen over build-time to avoid baking DB creds into image per PITFALLS.md"
metrics:
  duration: "~25m (resume pass)"
  completed: "2026-04-14"
---

# Phase 8 Plan 2: Apply Migration & Wire Dockerfile

**One-liner:** Baselined existing Supabase schema from pre-v1.1 git snapshot, applied v1.1 cohorts migration cleanly (2 migrations, all 4 success criteria verified), and wired `prisma migrate deploy` into the Docker runtime CMD for prod schema sync.

## Resume context

Halted originally at Task 1 with `P3005: database schema is not empty` (DB was db-push bootstrapped, no migration history). User chose **Option 1 (baseline strategy)**. Tasks 1 and 2 now complete. Task 3 is a human-verify checkpoint.

## Task 1: Apply migration and verify DB state — DONE

### Baseline creation

1. Extracted pre-v1.1 schema snapshot: `git show 9662034:prisma/schema.prisma > /tmp/schema.baseline.prisma` (the commit immediately before v1.1 schema changes landed — `feat(05-02): add Settings model`, which matches the 5-table pre-migration live state).

2. Generated baseline SQL:
   ```
   npx prisma migrate diff --from-empty --to-schema /tmp/schema.baseline.prisma --script \
     -o prisma/migrations/0000_baseline/migration.sql
   ```
   Produces 5 CreateTable, 3 CreateIndex, 2 AddForeignKey statements for `HealthCheck, Associate, Session, GapScore, Settings`.

3. **Verified baseline matches live DB exactly** via:
   ```
   npx prisma migrate diff --from-schema /tmp/schema.baseline.prisma --to-config-datasource --script
   ```
   Output: `-- This is an empty migration.` → zero drift from live DB to the baseline snapshot. Safe to mark as applied.

### Resolve + deploy output

```
$ npx prisma migrate resolve --applied 0000_baseline
Migration 0000_baseline marked as applied.

$ npx prisma migrate deploy
2 migrations found in prisma/migrations
Applying migration `0001_v11_cohorts`
The following migration(s) have been applied:
migrations/
  └─ 0001_v11_cohorts/
    └─ migration.sql
All migrations have been successfully applied.
```

Exit 0 on both. `prisma migrate status` → `Database schema is up to date!`

### Verification of 4 ROADMAP success criteria (empirical)

Results from `node scripts/check-schema.mjs` against DIRECT_URL after deploy:

| # | Criterion | Result | Status |
|---|-----------|--------|--------|
| 1 | `prisma migrate deploy` runs cleanly | 1 migration applied, exit 0, `_prisma_migrations` populated | PASS |
| 2 | `/api/sync-check` no new divergence | `{"fileCount":0,"dbCount":8,"matched":0,"mismatches":[]}` — DB session count unchanged from pre-migration (8), no mismatches | PASS |
| 3 | `Associate.cohortId` nullable, existing rows null | `cohortId (integer, null=YES)`; 3/3 associates have `cohortId IS NULL` | PASS |
| 4 | `Session.mode` defaults `'trainer-led'`, zero nulls | `mode (text, null=NO, dflt='trainer-led'::text)`; 0/8 sessions have `mode IS NULL` | PASS |

Additional verification:
- Tables present: `Associate, Cohort, CurriculumWeek, GapScore, HealthCheck, Session, Settings, _prisma_migrations`
- `Cohort` and `CurriculumWeek` both exist as expected.
- `Session.cohortId` (nullable int), `Session.readinessRecomputeStatus` (text, default `'not_applicable'`), `Associate.cohortId` (nullable int) all present.

### Commit
`d1c99b0 feat(08-02): baseline existing schema and apply v1.1 cohorts migration`

## Task 2: Wire prisma migrate deploy into Dockerfile — DONE

### Diff

Runner stage additions (after `.next/static` copy, before `USER nextjs`):

```dockerfile
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
```

CMD change:

```dockerfile
# before
CMD ["node", "server.js"]
# after
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
```

Also added `prisma.config.ts` to the runner (not in original plan — deviation Rule 3) because the prisma CLI requires the config file at runtime to resolve `DIRECT_URL` and the migrations path. Without it, `npx prisma migrate deploy` in the container would fail with "Prisma config file not found".

### Build verification

```
$ docker build -t nlm-test .
...
Step 32/32 : CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
Successfully built 8b6f4c8678e5
Successfully tagged nlm-test:latest
```

Exit 0. All 32 steps completed.

### Commit
`d46de2e feat(08-02): wire prisma migrate deploy into Docker runtime CMD`

## Task 3: Human-verify checkpoint — APPROVED (2026-04-14)

**Checkpoint type:** `checkpoint:human-verify` (blocking gate)

**What was built:** v1.1 cohorts schema applied to dev DB. Existing trainer-led sessions untouched (mode backfilled to 'trainer-led', no cohort linkage). Dockerfile now runs migrations on container start.

**Verification performed:**
1. `npm run dev`
2. Visited http://localhost:3000/trainer, logged in with APP_PASSWORD
3. Roster rendered identically to pre-migration — same associates, readiness badges, sort/search intact
4. Associate detail (`/trainer/[slug]`) — session history list, gap trend chart, skill filter all worked unchanged
5. `/api/sync-check` — no divergence

**Outcome:** User approved. No regressions observed. Plan 08-02 closed.

## Deviations from Plan

**1. [Rule 4 — architectural, resolved] Baseline strategy**
- **Found during:** Task 1 (original halted pass)
- **Issue:** `P3005` — DB bootstrapped via `db push`, no `_prisma_migrations` history. PLAN Task 1's option (a) (`migrate resolve --applied 0001_v11_cohorts`) was unsafe because schema did not match post-migration state.
- **Resolution:** User chose Option 1. Created `0000_baseline` from pre-v1.1 git snapshot (commit `9662034`), verified it exactly matches live DB via `migrate diff --to-config-datasource` (empty output), then `migrate resolve --applied 0000_baseline` followed by `migrate deploy` applied `0001_v11_cohorts` cleanly.
- **Files modified:** `prisma/migrations/0000_baseline/migration.sql` (new)
- **Commit:** `d1c99b0`

**2. [Rule 3 — blocking] Runner stage missing prisma.config.ts**
- **Found during:** Task 2
- **Issue:** PLAN Task 2 step 2 specified copying prisma CLI + @prisma + prisma/ folder. Missing `prisma.config.ts` would cause `npx prisma migrate deploy` to fail inside the container because the config file defines the datasource URL resolution and migrations path.
- **Fix:** Added `COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts` to runner stage.
- **Files modified:** `Dockerfile`
- **Commit:** `d46de2e` (included in Task 2 commit)

## Verification of Success Criteria

All 4 Phase 8 success criteria EMPIRICALLY VERIFIED (Task 1) + Dockerfile wired (Task 2):

1. ✅ `prisma migrate deploy` runs cleanly in dev — `1 migration applied, exit 0`. Docker runtime will run the same command on container start.
2. ✅ `/api/sync-check` returns no new divergence — `dbCount: 8, mismatches: []`; unchanged from pre-migration baseline.
3. ✅ `Associate.cohortId` nullable — existing 3 associates all `cohortId IS NULL`.
4. ✅ `Session.mode` defaults to `'trainer-led'` — all 8 existing sessions backfilled, zero nulls.

Human verification of trainer roster (criterion 3 visual confirmation) pending at Task 3.

## Rollback notes

If the human checkpoint fails:
- `DROP TABLE "CurriculumWeek"; DROP TABLE "Cohort";` (CASCADE safe — no FKs point at them from existing data since all associates/sessions have NULL cohortId)
- `ALTER TABLE "Associate" DROP COLUMN "cohortId";`
- `ALTER TABLE "Session" DROP COLUMN "cohortId", DROP COLUMN "mode", DROP COLUMN "readinessRecomputeStatus";`
- `DELETE FROM "_prisma_migrations" WHERE migration_name = '0001_v11_cohorts';`
- Baseline row can stay (represents the pre-migration state; safe to keep either way).

## Self-Check: PASSED

- `prisma/migrations/0000_baseline/migration.sql` exists: FOUND
- `prisma/migrations/0001_v11_cohorts/migration.sql` exists: FOUND (unchanged from Plan 01)
- Dockerfile CMD updated: FOUND (`grep "prisma migrate deploy" Dockerfile`)
- Dockerfile COPY prisma CLI/engine/folder/config: FOUND (4 new COPY lines)
- Commit `d1c99b0` exists: FOUND
- Commit `d46de2e` exists: FOUND
- Live DB schema up to date: FOUND (`prisma migrate status` → "Database schema is up to date!")
