---
phase: 13-curriculum-schedule
plan: "01"
subsystem: curriculum-api
tags: [api, service, curriculum, tdd, prisma]
dependency_graph:
  requires: ["11-01", "08-schema"]
  provides: ["curriculum-crud-api", "curriculumService"]
  affects: ["13-02-ui", "13-03-wizard"]
tech_stack:
  added: []
  patterns: ["Zod validation at API entry", "P2002 → 409 mapping", "TDD RED-GREEN"]
key_files:
  created:
    - src/lib/curriculumService.ts
    - src/lib/curriculumService.test.ts
    - src/app/api/cohorts/[id]/curriculum/route.ts
    - src/app/api/cohorts/[id]/curriculum/[weekId]/route.ts
  modified: []
decisions:
  - "P2002 not caught at service layer — propagates to route handler for 409 mapping (Codex #9)"
  - "skillSlug regex /^[a-z0-9][a-z0-9-]*$/ enforced at both service and Zod layers"
  - "Cross-cohort tampering guard: verify week.cohortId === params.id before mutation"
  - "getTaughtWeeks uses lte (inclusive boundary) for startDate === now edge case"
metrics:
  duration_seconds: 179
  completed_date: "2026-04-14"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 0
  tests_added: 17
---

# Phase 13 Plan 01: Curriculum CRUD API Summary

**One-liner:** Curriculum week CRUD API with canonical skillSlug validation, taught-weeks filter, and 409 mapping for DB-enforced uniqueness constraint.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create curriculumService (TDD) | f5c2f87 | curriculumService.ts, curriculumService.test.ts |
| 2 | Curriculum collection API route | 7a42820 | api/cohorts/[id]/curriculum/route.ts |
| 3 | Per-week API route | ad94442 | api/cohorts/[id]/curriculum/[weekId]/route.ts |

## What Was Built

Four REST endpoints and a pure-function service layer for per-cohort curriculum week management:

- `GET /api/cohorts/[id]/curriculum` — list all weeks ordered by weekNumber asc
- `GET /api/cohorts/[id]/curriculum?taught=true` — filter to startDate <= now
- `POST /api/cohorts/[id]/curriculum` — create week with Zod validation + 409 on duplicate weekNumber
- `PATCH /api/cohorts/[id]/curriculum/[weekId]` — partial update with cross-cohort guard + 409 on unique violation
- `DELETE /api/cohorts/[id]/curriculum/[weekId]` — delete with cross-cohort guard, returns 204

### Key Design Choices

**skillSlug at two layers:** The `skillSlug` field is validated by both the Zod schema in the route (format check) and the service layer validation (same regex). This means a direct service call also gets protection, not just HTTP entry.

**P2002 propagation:** `createWeek` and `updateWeek` intentionally do not catch Prisma's unique-constraint error. The route handlers catch it and return 409 with a human-readable message. This keeps the service layer pure and the error semantics clear.

**taught-weeks boundary:** `getTaughtWeeks` uses `lte` (less-than-or-equal) so a week starting exactly at the current moment is included. This matches the expected "unlock at midnight" behavior.

## Tests

17 Vitest unit tests covering:
- `listWeeks` — findMany call shape
- `getTaughtWeeks` — future filter, boundary (startDate == now), default now parameter
- `createWeek` — missing slug, non-kebab slug, uppercase slug, leading-hyphen slug, missing skillName, weekNumber < 1, valid create, valid multi-segment slug (node-js), P2002 propagation
- `updateWeek` — field update, invalid slug, valid slug update
- `deleteWeek` — delete call shape

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. All endpoints are trainer-auth guarded. No new unauthenticated surface introduced.

## Self-Check: PASSED

Files created:
- src/lib/curriculumService.ts — FOUND
- src/lib/curriculumService.test.ts — FOUND
- src/app/api/cohorts/[id]/curriculum/route.ts — FOUND
- src/app/api/cohorts/[id]/curriculum/[weekId]/route.ts — FOUND

Commits verified:
- f5c2f87 — Task 1 (curriculumService)
- 7a42820 — Task 2 (collection route)
- ad94442 — Task 3 (per-week route)
