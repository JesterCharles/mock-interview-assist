---
phase: 12-cohort-dashboard-views
plan: 01
subsystem: trainer-api
tags: [api, cohort, roster, readiness, backward-compat]
requires:
  - prisma.associate.cohortId (Int | null, Phase 08)
  - isAuthenticatedSession (src/lib/auth-server.ts)
provides:
  - GET /api/trainer?cohortId=<int> (filtered raw array)
  - GET /api/trainer?cohortId=<int>&includeSummary=true (wrapped { associates, summary })
  - CohortSummary type
  - RosterResponse type
affects:
  - /trainer page (no change required — still parses raw array)
  - /dashboard associate typeahead (no change required — still parses raw array)
tech-stack:
  added: []
  patterns:
    - Opt-in response-shape expansion via query param (keeps v1.0 contract)
    - Prisma Int FK coercion at the edge (parseInt + Number.isInteger guard)
key-files:
  created:
    - src/app/api/trainer/route.test.ts
  modified:
    - src/lib/trainer-types.ts
    - src/app/api/trainer/route.ts
decisions:
  - Default GET returns raw array — v1.0 contract preserved (Codex finding #1)
  - Wrapped shape is opt-in AND scoped (includeSummary=true requires valid cohortId)
  - cohortId is Int — non-numeric / 'all' / '' all route to unfiltered path
  - Summary computed server-side from the same filtered result (single query)
metrics:
  duration: ~15m
  completed: 2026-04-14
  tasks: 2
  tests_added: 8
---

# Phase 12 Plan 01: Roster API Cohort Filter + Summary Summary

Adds opt-in cohort filtering and aggregate readiness summary to `/api/trainer` without breaking the v1.0 raw-array response contract consumed by `/trainer` and `/dashboard`.

## What Shipped

### Types (`src/lib/trainer-types.ts`)
- `CohortSummary`: `{ ready, improving, notReady }` counts.
- `RosterResponse`: `{ associates, summary }` wrapper used only by callers that opt in.
- `RosterAssociate` left untouched — no consumer breakage.

### Endpoint (`src/app/api/trainer/route.ts`)
- Handler signature now `GET(request: Request)` to read query params.
- Parses `cohortId` (Int) and `includeSummary` (bool) from the URL.
- `cohortId`: parsed with `Number.parseInt` + `Number.isInteger` guard. `'all'`, `''`, and non-numeric values route to the unfiltered path (`where: undefined`), preserving D-02 (unassigned associates visible under "All Associates").
- Response contract:
  - Default or `?cohortId=<int>` (no `includeSummary`) → raw `RosterAssociate[]` (v1.0 shape).
  - `?includeSummary=true` without a valid `cohortId` → raw array (summary requires scope, per D-04).
  - `?cohortId=<int>&includeSummary=true` → `RosterResponse` wrapped shape.
- Summary is computed from the already-mapped roster (single query, O(n) reduce).
- `isAuthenticatedSession` remains the first guard.

### Tests (`src/app/api/trainer/route.test.ts`)
8 tests (Vitest, Prisma + auth mocked):
1. 401 when unauthenticated
2. Default returns raw array (`Array.isArray === true`) — regression guard for v1.0 consumers
3. Default passes `where: undefined` to Prisma
4. `cohortId=all` treated as no filter (raw array, `where: undefined`)
5. `includeSummary=true` without `cohortId` still returns raw array
6. `cohortId=<int>` passes `where: { cohortId: <number> }` and returns raw array
7. `cohortId=<int>&includeSummary=true` returns `{ associates, summary }` with correct counts across mixed readiness statuses
8. Empty cohort returns `summary: { ready: 0, improving: 0, notReady: 0 }`

## Requirements Satisfied

- **COHORT-03** (backend): roster endpoint accepts cohort filter param.
- **COHORT-04** (backend): aggregate readiness summary computed server-side behind the opt-in flag.

## Verification

- `npm run test -- src/app/api/trainer/route.test.ts` → 8/8 pass
- `npm run test` (full suite) → 267 passed / 4 skipped, no regressions
- `npx tsc --noEmit` → clean
- `npm run lint` — no new errors introduced by these files (repo has pre-existing lint noise unrelated to this plan)

## Backward Compatibility Notes

- `/trainer` (`src/app/trainer/page.tsx:33-38`): still calls `/api/trainer` with no params and receives `RosterAssociate[]` — unchanged.
- `/dashboard` typeahead (`src/app/dashboard/page.tsx:79-84`): same — unchanged.
- New cohort-dashboard UI in Plan 12-02 is expected to explicitly pass `includeSummary=true` when a cohort is selected.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `cohortId` query param coerced to Int**
- **Found during:** Task 2 GREEN (typecheck)
- **Issue:** Plan pseudocode passed `cohortId` as a string to Prisma `where`, but the schema defines `Associate.cohortId` as `Int | null`. Leaving it as a string failed `npx tsc --noEmit` with `TS2322`.
- **Fix:** Parse with `Number.parseInt(cohortIdParam, 10)` and guard with `Number.isInteger`. Invalid numerics route to the unfiltered path instead of 400 — consistent with the plan's treatment of `'all'` and empty strings.
- **Files modified:** `src/app/api/trainer/route.ts`, `src/app/api/trainer/route.test.ts` (expects `{ cohortId: 42 }` numeric)
- **Commit:** `33f1a32`

## Commits

- `2ad5efa` feat(12-01): add CohortSummary and RosterResponse types
- `12abac3` test(12-01): add failing tests for /api/trainer cohort filter + summary
- `33f1a32` feat(12-01): add opt-in cohort filter + summary to /api/trainer

## Self-Check: PASSED

- src/lib/trainer-types.ts — FOUND, contains `export interface CohortSummary` and `export interface RosterResponse`
- src/app/api/trainer/route.ts — FOUND, contains `searchParams.get('cohortId')` and `searchParams.get('includeSummary')`
- src/app/api/trainer/route.test.ts — FOUND, 8 tests including Array.isArray regression guard
- Commits `2ad5efa`, `12abac3`, `33f1a32` — all FOUND on HEAD
