---
phase: 03-associate-profiles
plan: 01
subsystem: associate-identity
tags: [prisma, schema, zustand, slug, validation, dashboard, dual-write]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [associate-model, slug-validation, session-associate-linkage]
  affects: [api-history, session-persistence, dashboard-wizard, prisma-schema]
tech_stack:
  added: [zod@4.3.6]
  patterns: [associate-upsert-on-save, slug-validation-zod, zustand-param-extension]
key_files:
  created:
    - src/lib/slug-validation.ts
  modified:
    - prisma/schema.prisma
    - src/lib/types.ts
    - src/store/interviewStore.ts
    - src/app/dashboard/page.tsx
    - src/lib/sessionPersistence.ts
    - package.json
decisions:
  - "Associate upsert lives in persistSessionToDb (centralized write point) rather than directly in history route handler"
  - "Slug validation uses Zod v4 string transforms (trim + toLowerCase built-in)"
  - "Associate ID input placed after participant details grid, before Interview Level section"
metrics:
  duration: 258s
  completed: 2026-04-13T23:29:47Z
  tasks: 3
  files: 7
---

# Phase 03 Plan 01: Associate Identity Model Summary

Associate model added to Prisma with unique slug constraint, wired through dashboard wizard -> Zustand store -> session payload -> persistSessionToDb -> Prisma associate upsert + session FK linkage. Zod v4 validates slugs on both client (inline) and server (before DB write).

## What Was Built

### Task 1: Associate Model, Slug Validation, Type/Store/Dashboard Extension
- Added `Associate` model to Prisma schema with `slug String @unique`, `displayName String?`, timestamps
- Added `associateId Int?` FK and `associate Associate?` relation to Session model
- Created `src/lib/slug-validation.ts` with Zod schema enforcing lowercase alphanumeric + hyphens, min 2, max 64 chars
- Extended `InterviewSession` type with optional `associateSlug` field
- Extended `createSession` in Zustand store with `associateSlug` parameter, passed into session object
- Added Associate ID input field to dashboard wizard Phase 2 with inline validation and error display
- Added Associate ID display to Phase 3 review/confirm step
- Installed zod 4.3.6

### Task 2: Associate Upsert in Session Persistence
- Extended `persistSessionToDb` to upsert Associate record when `associateSlug` present
- Server-side slug validation via `validateSlug` before any DB operation
- Conditional `displayName` update (only when candidateName is truthy, prevents null overwrite)
- Associate upsert failure does not fail the session write (separate try/catch)
- `associateId` passed to Session create/update for FK linkage
- Works for both `/api/history` POST and `/api/public/interview/complete` paths

### Task 3: Schema Push to Supabase
- `npx prisma db push` applied Associate table and Session.associateId FK to live Supabase database
- `npx prisma generate` regenerated client with Associate types
- Verified via `prisma db pull`: Associate model and associateId column confirmed present

## Decisions Made

1. **Associate upsert in persistSessionToDb, not history route** -- The centralized persistence function is called from both the trainer history route and the public interview complete endpoint. Placing the upsert there ensures both paths create/link associates without code duplication.

2. **Zod v4 built-in transforms** -- Used `.trim().toLowerCase()` chained on the Zod string schema, which are native transforms in Zod v4 (not separate `.transform()` calls). This normalizes input before regex validation.

3. **Input placement in wizard** -- Associate ID field placed after the participant details grid (candidateName/interviewerName) and before the Interview Level section, as a standalone optional field with helper text.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Working tree out of sync with HEAD**
- **Found during:** Pre-task setup
- **Issue:** Worktree had old branch files; `git reset --soft` preserved stale working tree
- **Fix:** `git checkout HEAD -- .` to sync working tree with correct base commit
- **Files modified:** All (restored to HEAD state)

**2. [Rule 3 - Blocking] Zod not installed**
- **Found during:** Task 1
- **Issue:** Zod 4.3.6 listed in CLAUDE.md stack but not in package.json dependencies
- **Fix:** `npm install zod@4.3.6`
- **Files modified:** package.json, package-lock.json

**3. [Rule 2 - Missing critical functionality] Associate upsert in persistSessionToDb instead of history route**
- **Found during:** Task 2
- **Issue:** Plan specified adding upsert to `/api/history/route.ts` directly, but Phase 2 already extracted persistence to `persistSessionToDb` which is called from both history route and public interview complete route
- **Fix:** Added associate upsert to `persistSessionToDb` instead, covering both code paths
- **Files modified:** src/lib/sessionPersistence.ts (instead of src/app/api/history/route.ts)

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 0895ba0 | feat(03-01): add Associate model, slug validation, type/store extension, dashboard slug input |
| 2 | ca4191d | feat(03-01): wire associate upsert into session persistence dual-write |
| 3 | 70a97d7 | chore(03-01): push Associate schema to Supabase and regenerate Prisma client |

## Threat Surface Scan

No new threat surfaces found beyond what is documented in the plan's threat model. All mitigations implemented:
- T-03-01: Server-side Zod validation before DB operation (validateSlug in persistSessionToDb)
- T-03-03: Zod slugSchema enforces .max(64)
- T-03-04: Prisma parameterized queries + Zod regex constraint

## Known Stubs

None. All data flows are fully wired: slug input -> Zustand store -> session payload -> API -> persistSessionToDb -> Prisma associate upsert + session FK linkage.

## Self-Check: PASSED

All 6 key files verified present. All 3 commit hashes verified in git log.
