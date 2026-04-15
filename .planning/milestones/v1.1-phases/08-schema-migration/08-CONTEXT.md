# Phase 8: Schema Migration - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning
**Mode:** --auto (auto-selected all recommended defaults)

<domain>
## Phase Boundary

Add `Cohort` and `CurriculumWeek` models to Prisma schema, plus nullable FKs on `Associate.cohortId` and `Session.cohortId`. Set `Session.mode` default to `"trainer-led"` and backfill existing rows. Pure infrastructure phase — no UI, no new business logic, no existing data disruption. Enables Phases 9-13 downstream.

</domain>

<decisions>
## Implementation Decisions

### Migration Strategy
- **D-01:** Additive only — no column drops, no destructive changes to existing tables.
- **D-02:** Nullable FKs (`Associate.cohortId INT NULL`, `Session.cohortId INT NULL`). Backward compat with v1.0 data is non-negotiable per REQUIREMENTS COHORT-02.
- **D-03:** Single migration file `prisma/migrations/xxx_v11_cohorts/migration.sql` — one atomic deploy, easier rollback.
- **D-04:** Run `prisma migrate deploy` in CI + Docker build step (already wired in Dockerfile). No schema drift between dev and prod.

### Cohort Model Fields
- **D-05:** `Cohort { id, name, startDate, endDate?, description?, createdAt, updatedAt }`. Matches research/ARCHITECTURE.md spec exactly.
- **D-06:** `updatedAt` via Prisma `@updatedAt` (standard pattern in existing schema).

### CurriculumWeek Model Fields
- **D-07:** `CurriculumWeek { id, cohortId, weekNumber, skillName, topicTags String[], startDate }`. `topicTags` as Postgres `String[]` (Supabase supports native arrays — avoids join table).
- **D-08:** `onDelete: Cascade` on `cohort` relation — deleting a cohort removes its curriculum. Prevents orphan rows.
- **D-09:** No unique constraint on (cohortId, weekNumber) in this phase — defer to Phase 13 when curriculum UI lands. Keeps migration minimal.

### Session.mode Handling
- **D-10:** Add `Session.mode String @default("trainer-led")` column. Backfill existing rows via `UPDATE Session SET mode = 'trainer-led' WHERE mode IS NULL` inside the migration SQL. Success Criterion 4 requires no null values.
- **D-11:** Valid values enumerated at app layer (TS union type), not DB enum — matches existing codebase pattern (no Prisma enums used).

### Denormalized Session.cohortId
- **D-12:** Denormalize `cohortId` onto Session (nullable FK) per research recommendation — enables cohort-scoped queries without joining through Associate. Populated at insert time in later phases, null for v1.0 rows.

### Verification
- **D-13:** `/api/sync-check` contract unchanged — migration must not introduce divergence between file history and DB. Verified post-migration.
- **D-14:** Prisma client regen runs in Docker build (existing step). Confirm `src/generated/prisma/` includes new models.

### Claude's Discretion
- Index choices on new FK columns (Prisma default = none; planner decides whether to add explicit `@@index([cohortId])` based on anticipated query patterns).
- Exact migration filename + description text.
- Seed data decisions (none expected — Phase 11 UI will create cohorts).

</decisions>

<specifics>
## Specific Ideas

- Use `@prisma/adapter-pg` pattern already in place — no driver swap.
- Transaction Pooler (port 6543) for runtime; Direct URL (port 5432) for migrations — already configured via `DATABASE_URL` / `DIRECT_URL` env vars.
- "Zero downtime" posture — nullable columns + default-backfill means rolling deploy is safe.

</specifics>

<canonical_refs>
## Canonical References

### Schema & Architecture
- `.planning/research/ARCHITECTURE.md` §"Prisma Schema Changes" — exact model definitions
- `.planning/research/STACK.md` — Prisma 7.7.0, @prisma/adapter-pg 7.7.0 versions
- `.planning/research/PITFALLS.md` — Supabase pooler + migration gotchas
- `.planning/REQUIREMENTS.md` §Cohort Management, §Curriculum — field requirements
- `.planning/ROADMAP.md` §"Phase 8: Schema Migration" — success criteria

### Existing Code Anchors
- `prisma/schema.prisma` — current schema (Associate, Session, GapScore, Settings)
- `src/lib/prisma.ts` — Prisma singleton
- `Dockerfile` — migration deploy step
- `CLAUDE.md` §"Prisma + Docker" — standalone build notes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/prisma.ts` — singleton client, no changes needed.
- `prisma/schema.prisma` — extend in place; follows existing snake_case-on-DB, camelCase-on-app pattern.
- `src/generated/prisma/` — regenerated automatically post-migration.

### Established Patterns
- Nullable FK with `Int?` + explicit `@relation` — matches `Session.associateId` pattern.
- `@default(now())` / `@updatedAt` — used on all existing models.
- DB types: `TEXT`, `INT`, `TIMESTAMPTZ` via Prisma defaults. Arrays via Postgres `TEXT[]`.

### Integration Points
- Migration runs during Docker build (`prisma migrate deploy`) — no runtime impact.
- `/api/sync-check` — contract must hold post-migration; verify as part of success criteria.
- No API routes touched in this phase.

</code_context>

<deferred>
## Deferred Ideas

- Unique constraint on `(cohortId, weekNumber)` — Phase 13 (curriculum UI).
- Cohort snapshots table (daily readiness aggregates) — v1.2 (COHORT-FUTURE-01).
- Index tuning on Session.cohortId — Phase 12 if query perf demands it.
- DB enum for `Session.mode` — deferred; TS union type sufficient.

</deferred>

---

*Phase: 08-schema-migration*
*Context gathered: 2026-04-14 (--auto mode)*
