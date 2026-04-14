---
phase: 04-gap-service
plan: 03
subsystem: gap-persistence-api
tags: [gap-tracking, persistence, api, fire-and-forget, zod-validation]
dependency_graph:
  requires: [04-01, 04-02]
  provides: [saveGapScores, getGapScores, GET /api/associate/[slug]/gaps]
  affects: [src/app/api/history/route.ts]
tech_stack:
  added: []
  patterns: [fire-and-forget-with-catch, 3-session-gate, zod-slug-validation, stale-record-cleanup]
key_files:
  created: [src/lib/gapPersistence.ts, src/app/api/associate/[slug]/gaps/route.ts]
  modified: [src/app/api/history/route.ts]
decisions:
  - "Associate lookup by slug for fire-and-forget: persistSessionToDb returns boolean not DB record, so gap trigger queries associate by slug separately"
  - "Stale GapScore cleanup: after upsert, delete records for skills/topics no longer in computed results"
  - "Flat scores array returned from API (not grouped) -- dashboard Phase 6 handles grouping"
  - "Auth check before 404 on gap endpoint (T-04-05: prevents slug enumeration)"
metrics:
  duration: ~2min
  completed: "2026-04-14T00:11:06Z"
  tasks: 2/2
  files_changed: 3
---

# Phase 04 Plan 03: Gap Persistence and API Integration Summary

Wired the pure gap algorithm (Plan 02) into DB persistence and HTTP layer -- saveGapScores runs fire-and-forget after session dual-write, GET /api/associate/[slug]/gaps returns scores with auth, zod validation, and 3-session gate.

## Completed Tasks

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Create gap persistence layer and wire into session save | 920058e | src/lib/gapPersistence.ts, src/app/api/history/route.ts |
| 2 | Create gap scores read API endpoint | 1093aba | src/app/api/associate/[slug]/gaps/route.ts |

## Key Implementation Details

### gapPersistence.ts (saveGapScores)
- Queries all sessions for an associate (newest first)
- Converts Prisma Session JSON fields to InterviewSession-compatible objects
- Calls computeGapScores from gapService.ts (pure algorithm)
- Upserts each GapScoreInput to the GapScore table using the composite unique key (associateId, skill, topic)
- Cleans up stale records: deletes GapScore rows for skills/topics no longer in computed output

### gapPersistence.ts (getGapScores)
- Counts sessions for associate; returns gated response if < 3
- When not gated, returns all GapScore records sorted by skill/topic

### History Route Integration
- After dual-write (file + Supabase), looks up associate by slug
- Calls saveGapScores as fire-and-forget (Promise.catch, NOT awaited)
- Gap failure logged but never blocks the session save 200 response

### Gap Read API
- Auth guard: isAuthenticatedSession() returns 401 first (T-04-05)
- Zod validation: slug must be 1-100 chars, lowercase alphanumeric + hyphens (T-04-06)
- 404 for unknown associate slugs
- Gated response includes message and requiredSessions count

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Associate ID type mismatch**
- **Found during:** Task 1
- **Issue:** Plan interfaces showed associateId as String, but schema uses Int (autoincrement)
- **Fix:** Used `number` type for associateId throughout gapPersistence.ts
- **Files modified:** src/lib/gapPersistence.ts

**2. [Rule 3 - Blocking] No DB session returned from persistSessionToDb**
- **Found during:** Task 1
- **Issue:** Plan assumed `dbSession?.associateId` would be available after dual-write, but persistSessionToDb returns boolean
- **Fix:** Fire-and-forget flow queries associate by slug from session.associateSlug, then passes associate.id to saveGapScores
- **Files modified:** src/app/api/history/route.ts

## Threat Mitigations Applied

| Threat ID | Mitigation | Status |
|-----------|------------|--------|
| T-04-05 | Auth guard returns 401 before slug lookup (prevents enumeration) | Implemented |
| T-04-06 | Zod regex validation on slug parameter | Implemented |
| T-04-07 | Gap scores computed from DB data only, no external input | Implemented |
| T-04-08 | Fire-and-forget pattern, gap failure cannot block session save | Implemented |
| T-04-09 | Single-password auth guards gap read endpoint | Implemented |

## Verification Results

- All 24 vitest tests pass (gap algorithm tests from Plan 02)
- saveGapScores called fire-and-forget in history route (grep confirms 2 references: import + usage)
- Gap endpoint file exists with auth guard

## Self-Check: PASSED

- All 3 files exist (gapPersistence.ts, gaps/route.ts, history/route.ts)
- Both commits found (920058e, 1093aba)
