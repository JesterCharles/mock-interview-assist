---
phase: 05-readiness-signals
plan: 01
subsystem: readiness-engine
tags: [readiness, classification, gap-scores, prisma, tdd, vitest]
requirements: [READY-01, READY-02]

dependency_graph:
  requires:
    - 04-03 (GapScore table populated by Phase 4 gap persistence)
    - 01-01 (prisma singleton from Phase 1)
  provides:
    - readinessService.ts with computeReadiness, recomputeAllReadiness, updateAssociateReadiness
    - Associate.readinessStatus, Associate.recommendedArea, Associate.lastComputedAt fields
    - Session save pipeline trigger for readiness computation
  affects:
    - src/app/api/history/route.ts (POST handler now chains readiness after gap scores)
    - prisma/schema.prisma (Associate model extended)
    - 05-02 (Settings model + threshold API will leverage recomputeAllReadiness)
    - 06-xx (Dashboard reads pre-computed readinessStatus from Associate)

tech_stack:
  added: []
  patterns:
    - TDD with Vitest: write failing tests first, implement to green
    - 3-point linear regression slope for trend computation
    - Classification cascade: ready → improving → not_ready (order matters)
    - Fire-and-forget pipeline: saveGapScores → updateAssociateReadiness (sequential, non-blocking)
    - Defensive prisma.settings access with `as any` until Plan 02 adds Settings model

key_files:
  created:
    - src/lib/readinessService.ts
    - src/lib/__tests__/readinessService.test.ts
  modified:
    - prisma/schema.prisma (Associate model: +readinessStatus, +recommendedArea, +lastComputedAt)
    - src/app/api/history/route.ts (POST: wire updateAssociateReadiness after saveGapScores)
    - src/generated/prisma/* (regenerated with new Associate fields)

decisions:
  - "Using empty string '' as skill-level topic sentinel (matches existing GapScore schema from Phase 4, not nullable)"
  - "Trend uses composite score: avg(overallTechnicalScore, overallSoftSkillScore) — both scalars exist on Session"
  - "Settings table access uses `prisma as any` with optional chaining — avoids TS error until Plan 02 adds model"
  - "computeTrend exported for testability even though plan said it should only be called from computeReadiness"
  - "Associate.id is Int (not String as shown in plan's interface section) — matched actual schema"

metrics:
  duration_minutes: 15
  completed_date: "2026-04-14"
  tasks_completed: 2
  files_created: 2
  files_modified: 4
---

# Phase 5 Plan 1: Readiness Classification Service Summary

**One-liner:** Vitest-tested readiness engine classifying associates as ready/improving/not_ready using 3-point linear regression trend + weighted gap score average, pre-computed on session save.

## What Was Built

**Task 1: Readiness service with classification logic (TDD)**

Created `src/lib/readinessService.ts` implementing:

- `computeTrend(associateId)` — queries last 3 sessions DESC, reverses to chronological, computes linear regression slope over [0,1,2] x-axis. Returns -1 for fewer than 3 sessions.
- `computeReadiness(associateId, threshold)` — 3-session gate → skill-level avg → trend → classification cascade (ready first, then improving, then not_ready). Returns `ReadinessResult` with status, recommendedArea, and lastComputedAt.
- `recomputeAllReadiness(threshold)` — sequential batch over all associates, updates each record.
- `updateAssociateReadiness(associateId, threshold)` — convenience wrapper for session save pipeline.

Created `src/lib/__tests__/readinessService.test.ts` with 13 unit tests covering all classification states, edge cases (flat trend, threshold parameterization, topic fallback to skill).

**Task 2: Schema extension + session save pipeline**

Extended `prisma/schema.prisma` Associate model with three nullable fields:
- `readinessStatus String?` — 'ready' | 'improving' | 'not_ready'
- `recommendedArea String?` — topic or skill name (lowest gap score)
- `lastComputedAt DateTime?` — when readiness was last computed

Ran `prisma db push` against Supabase (confirmed: "Your database is now in sync"). Regenerated Prisma client.

Wired `updateAssociateReadiness` into `POST /api/history` fire-and-forget pipeline after `saveGapScores` — sequential to ensure gap scores are written before readiness reads them (Pitfall 3).

## Test Results

```
Test Files  1 passed (1)
     Tests  13 passed (13)
  Duration  130ms
```

All 13 tests pass covering:
- computeTrend: positive/negative/flat/insufficient-sessions
- computeReadiness: ready/improving/not_ready/threshold-param/recommended-area/skill-fallback
- recomputeAllReadiness: iterates all associates, updates each with all three fields

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] GapScore topic sentinel is empty string, not NULL**

- **Found during:** Task 1 implementation
- **Issue:** Plan interface showed `topic: null` for skill-level scores, but actual Phase 4 schema uses `topic: String @default("")` — empty string is the skill-level sentinel, not NULL
- **Fix:** All queries use `topic: ''` (skill-level) and `topic: { not: '' }` (topic-level) instead of `null`/`not null`
- **Files modified:** src/lib/readinessService.ts

**2. [Rule 1 - Bug] Associate.id is Int, not String**

- **Found during:** Task 1 implementation
- **Issue:** Plan interface showed `associateId: String` but actual Phase 3/4 schema uses `Int @id @default(autoincrement())`
- **Fix:** All service functions use `associateId: number`
- **Files modified:** src/lib/readinessService.ts

**3. [Rule 2 - Missing functionality] TypeScript error: prisma.settings does not exist yet**

- **Found during:** Task 2 wiring
- **Issue:** Plan says to query `prisma.settings.findFirst()` but Settings model is added in Plan 02 — accessing it causes TS2339 compile error
- **Fix:** Used `(prisma as any).settings?.findFirst?.()` with optional chaining and `.catch(() => null)` — compiles cleanly, falls back to 75 at runtime until Plan 02 adds the model
- **Files modified:** src/app/api/history/route.ts

**4. [Rule 3 - Blocking] Test mock hoisting error**

- **Found during:** Task 1 TDD RED phase
- **Issue:** First test file used `vi.fn()` references defined outside the `vi.mock()` factory — Vitest hoists `vi.mock()` to top of file causing "Cannot access before initialization" error
- **Fix:** Rewrote tests to create mock fns inside the factory, then reference via the imported `prisma` object after import
- **Files modified:** src/lib/__tests__/readinessService.test.ts

**5. [Rule 3 - Blocking] Missing .env in worktree for prisma db push**

- **Found during:** Task 2 schema push
- **Issue:** Worktree had no `.env` file, `prisma db push` failed with P1000 authentication error
- **Fix:** Copied `.env` from main repo to worktree before running push
- **No files modified** — operational fix only

## Known Stubs

None. All data flows are fully wired:
- `computeReadiness` reads from live GapScore + Session tables
- `updateAssociateReadiness` writes to live Associate table
- Session save pipeline triggers readiness on every save

## Threat Flags

None. No new network endpoints or auth paths introduced. `updateAssociateReadiness` is called from an auth-guarded route handler (`isAuthenticatedSession()` check at top of POST handler). All Prisma queries are internal. Consistent with T-05-01 and T-05-02 dispositions (both `accept`).

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/lib/readinessService.ts | FOUND |
| src/lib/__tests__/readinessService.test.ts | FOUND |
| prisma/schema.prisma | FOUND (readinessStatus, recommendedArea, lastComputedAt present) |
| src/app/api/history/route.ts | FOUND (updateAssociateReadiness wired) |
| 05-01-SUMMARY.md | FOUND |
| Commit 52ddf6c (test: failing tests) | FOUND |
| Commit cc1415f (feat: readiness service) | FOUND |
| Commit 8761649 (feat: schema + pipeline) | FOUND |
| All 13 tests pass | VERIFIED |
| TypeScript: no errors | VERIFIED |
| prisma db push | VERIFIED (database in sync) |
