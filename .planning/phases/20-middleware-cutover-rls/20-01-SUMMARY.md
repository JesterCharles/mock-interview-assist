---
phase: 20-middleware-cutover-rls
plan: 01
subsystem: database
tags: [rls, postgres, supabase, prisma, security, row-level-security]

requires:
  - phase: 17-schema-prep
    provides: Associate.authUserId nullable FK column for ownership checks
  - phase: 18-supabase-auth-install
    provides: user_metadata.role JWT claim set to 'trainer' or 'admin'

provides:
  - RLS enabled on Associate, Session, GapScore, Cohort, CurriculumWeek
  - public.is_trainer() SECURITY DEFINER function reading user_metadata.role from auth.jwt()
  - 10 idempotent RLS policies (SELECT + write for each of 5 tables)
  - Defense-in-depth blocking direct supabase-js reads from non-owners

affects:
  - 20-02 (route handler audit — RLS is now the DB safety net)
  - 23-associate-self-dashboard (associate can only SELECT own rows via authUserId match)
  - 25-pin-removal (RLS already in place before PIN cleanup)

tech-stack:
  added: []
  patterns:
    - "RLS via Prisma raw SQL migration: DROP POLICY IF EXISTS + CREATE POLICY for idempotency"
    - "is_trainer() SECURITY DEFINER helper reused across all trainer-scoped policies"
    - "auth.uid()::text cast for TEXT vs uuid comparison (Associate.authUserId is TEXT)"
    - "auth.jwt() over auth.session() in RLS policies (no DB roundtrip)"

key-files:
  created:
    - prisma/migrations/0003_rls_policies/migration.sql
  modified: []

key-decisions:
  - "10 policies (SELECT + FOR ALL write per table) rather than 4 separate write ops — cleaner audit surface"
  - "Cohort and CurriculumWeek get dedicated SELECT policies (not folded into FOR ALL) — consistent naming pattern across all 5 tables"
  - "No FORCE ROW LEVEL SECURITY on any table — Prisma service-role (BYPASSRLS) must not be affected"

patterns-established:
  - "Migration idempotency: DROP POLICY IF EXISTS before CREATE POLICY matches project convention"
  - "public.is_trainer() qualified with schema to avoid search_path ambiguity (Pitfall 5)"

requirements-completed:
  - AUTH-10

duration: 15min
completed: 2026-04-16
---

# Phase 20 Plan 01: RLS Policies Summary

**Postgres RLS deployed on 5 tables via idempotent migration with is_trainer() SECURITY DEFINER function and 10 owner/trainer policies**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-16T06:31:00Z
- **Completed:** 2026-04-16T06:46:51Z
- **Tasks:** 1 of 1
- **Files modified:** 1

## Accomplishments

- RLS enabled on Associate, Session, GapScore, Cohort, CurriculumWeek
- `public.is_trainer()` SECURITY DEFINER function reads `user_metadata.role` from `auth.jwt()` — no DB roundtrip
- 10 idempotent policies: associate/session/gapscore get owner-or-trainer SELECT; cohort/curriculumweek get trainer-only SELECT; all 5 tables get trainer-only write (FOR ALL)
- Prisma service-role (BYPASSRLS via Transaction Pooler) unaffected — all 395 tests pass unchanged

## Task Commits

1. **Task 1: Create RLS migration with is_trainer() helper and all policies** - `c3261e6` (feat)

**Plan metadata:** _(to be updated after docs commit)_

## Files Created/Modified

- `prisma/migrations/0003_rls_policies/migration.sql` — 134-line idempotent RLS migration: 5 ENABLE RLS, is_trainer() function, 10 DROP+CREATE POLICY pairs

## Decisions Made

- Used 10 separate policies (SELECT + write per table) rather than single `FOR ALL` per table — matches plan's naming convention (`{table}_{select|write}`) and is easier to audit
- `auth.uid()::text` cast throughout — Associate.authUserId is TEXT, auth.uid() returns uuid
- `public.is_trainer()` schema-qualified in every policy (guards against search_path edge cases per Research Pitfall 5)

## Deviations from Plan

None — plan executed exactly as written. The comment-in-grep false-positive (comment line containing "CREATE POLICY" substring) was caught and fixed before commit; not a deviation, just a verification script edge case.

## Issues Encountered

The plan's automated verification script (`grep -c "CREATE POLICY" ... | grep -q "10"`) initially counted 11 due to a comment line containing the substring. Rephrased the comment to avoid the false positive — 10 actual CREATE POLICY statements confirmed.

## User Setup Required

After this migration file is deployed, run:
```bash
npx prisma migrate deploy
```
Then verify in Supabase dashboard SQL editor that RLS is enabled on all 5 tables and `public.is_trainer()` function exists.

## Known Stubs

None.

## Threat Flags

None. All new surfaces are SQL-only and directly implement the threat mitigations from the plan's STRIDE register (T-20-01 through T-20-05).

## Next Phase Readiness

- RLS migration file ready for `prisma migrate deploy` in production
- Plan 20-02 (route handler audit + PROJECT.md documentation) is unblocked
- Associate self-dashboard (Phase 23) can rely on RLS as DB-layer safety net

---
*Phase: 20-middleware-cutover-rls*
*Completed: 2026-04-16*
