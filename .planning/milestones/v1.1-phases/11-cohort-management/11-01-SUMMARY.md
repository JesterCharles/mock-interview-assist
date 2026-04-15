---
phase: 11-cohort-management
plan: 01
subsystem: cohorts-api
tags: [api, crud, zod, prisma, cohorts]
requires:
  - prisma/schema.prisma Cohort model (Phase 08)
  - prisma/schema.prisma Associate.cohortId nullable FK (Phase 08)
  - src/lib/auth-server.ts isAuthenticatedSession
  - src/lib/prisma.ts singleton client
provides:
  - GET /api/cohorts list with associateCount
  - POST /api/cohorts create
  - GET /api/cohorts/[id] single
  - PATCH /api/cohorts/[id] partial update
  - DELETE /api/cohorts/[id] non-cascading delete
  - CohortDTO / CohortCreateInput / CohortUpdateInput (src/lib/cohort-types.ts)
affects:
  - Phase 11-02 (cohorts list/CRUD UI) now has a stable backend
  - Phase 11-03 (associate assignment) reuses CohortDTO
tech-stack:
  added: []
  patterns:
    - "Inline zod schemas per route file (D-04)"
    - "Next.js 16 App Router dynamic params: Promise<{ id: string }>"
    - "Prisma $transaction for non-cascading delete (D-06)"
key-files:
  created:
    - src/lib/cohort-types.ts
    - src/app/api/cohorts/route.ts
    - src/app/api/cohorts/route.test.ts
    - src/app/api/cohorts/[id]/route.ts
    - src/app/api/cohorts/[id]/route.test.ts
  modified: []
decisions:
  - "Cohort.endDate is nullable in schema — CohortDTO.endDate typed as string|null and CreateCohortSchema allows nullable/optional endDate"
  - "DELETE wraps updateMany + delete in prisma.$transaction so the non-cascading behavior is explicit and testable independent of schema onDelete"
  - "UpdateCohortSchema is duplicated inline in the [id] route rather than imported from the collection route — keeps zod usage local to each file (D-04)"
metrics:
  duration: "~3 min"
  completed: "2026-04-14"
  tasks: 2
  tests: 25
  files_created: 5
  commits: 4
---

# Phase 11 Plan 01: Cohort CRUD API Summary

**One-liner:** Auth-guarded, zod-validated `/api/cohorts` + `/api/cohorts/[id]` CRUD with non-cascading delete via `prisma.$transaction`, unblocking Phase 11 UI work.

## What Shipped

- **`src/lib/cohort-types.ts`** — shared `CohortDTO`, `CohortCreateInput`, `CohortUpdateInput` types for the API and Phase 11 UI plans.
- **`src/app/api/cohorts/route.ts`** — `GET` (list ordered by `startDate desc` with `_count.associates`) and `POST` (create) behind `isAuthenticatedSession`.
- **`src/app/api/cohorts/[id]/route.ts`** — `GET`, `PATCH`, `DELETE` handlers with id validation, P2025→404, P2002→409, and a transactional non-cascading delete.
- **Unit tests** — 25 passing Vitest cases covering auth, validation, happy paths, and the transaction call order for DELETE.

## Commits

| Hash | Message |
|------|---------|
| 04fdf99 | test(11-01): add failing tests for /api/cohorts GET + POST |
| 70498ba | feat(11-01): implement /api/cohorts GET list + POST create |
| 8f7e519 | test(11-01): add failing tests for /api/cohorts/[id] GET/PATCH/DELETE |
| 5611fa7 | feat(11-01): implement /api/cohorts/[id] GET/PATCH/DELETE with non-cascading delete |

Commits follow TDD RED → GREEN pattern, one red + one green per task.

## Verification

- `npm run test -- src/app/api/cohorts --run` → **25/25 passing** (2 test files)
- `npx tsc --noEmit` → clean
- `npm run lint` → pre-existing project warnings only (out of scope per deviation rules)

## Success Criteria — Status

- [x] GET /api/cohorts returns cohort list with `associateCount`
- [x] POST /api/cohorts creates cohort and returns 201
- [x] PATCH /api/cohorts/[id] updates cohort
- [x] DELETE /api/cohorts/[id] unassigns associates (cohortId → null) then removes cohort — associates remain in DB
- [x] All endpoints return 401 when unauthenticated
- [x] Zod validation errors return 400 with issues

## Deviations from Plan

### [Rule 3 - Blocker] Cohort.endDate is nullable in schema

- **Found during:** Task 1 (schema verification before coding).
- **Plan expectation:** `endDate DateTime` (required), per the `<interfaces>` block in 11-01-PLAN.md.
- **Actual schema (Phase 08):** `endDate DateTime?` (nullable).
- **Fix:** `CohortDTO.endDate: string | null`, `CohortCreateInput.endDate?: string | null`, `CreateCohortSchema.endDate` is `z.coerce.date().nullable().optional()`. The `endDate >= startDate` refinement is skipped when `endDate` is null/undefined.
- **Files modified:** `src/lib/cohort-types.ts`, `src/app/api/cohorts/route.ts`, `src/app/api/cohorts/[id]/route.ts`.
- **Commits:** 04fdf99, 70498ba, 5611fa7.
- **Rationale:** Matching the real schema avoids runtime coercion bugs in Phase 11-02/03 UI. A cohort with no fixed end date (rolling program) is a plausible real use case.

### [Rule 3 - Blocker] Worktree had a dirty/partial checkout

- **Found during:** worktree_branch_check step.
- **Issue:** Soft reset left the working tree without files from prior commits (`prisma/schema.prisma` was missing the Cohort model; `prisma/migrations/`, `src/app/api/admin/readiness-sweep`, etc. were absent).
- **Fix:** `git checkout HEAD -- .` to restore the working tree to match HEAD (74c2f71). No new commits for restoration — working tree matched HEAD's tree.
- **Files modified:** none tracked — restoration of already-committed state.
- **Commits:** none.

### [Rule 3 - Blocker] `node_modules` missing in worktree

- **Found during:** first test run attempt.
- **Fix:** Symlinked the main repo's `node_modules` from `/Users/jestercharles/mock-interview-assist/node_modules` into the worktree. Symlink is local to the worktree and not committed.
- **Commits:** none.

### Auto-fixed Issues

None beyond the schema/env blockers above. No bugs, missing validation, or security gaps discovered in the implementation path.

## Must-Haves Coverage

| Truth | Verified By |
|-------|-------------|
| Trainer can create a cohort via POST /api/cohorts and receive the created record | `POST /api/cohorts returns 201 and CohortDTO on valid create` |
| Trainer can list all cohorts via GET /api/cohorts ordered by startDate desc | `GET /api/cohorts returns CohortDTO[] with associateCount ordered by startDate desc` |
| Trainer can edit a cohort via PATCH /api/cohorts/[id] | `PATCH /api/cohorts/[id] partial update with name only returns 200 and updated CohortDTO` |
| Trainer can delete a cohort via DELETE /api/cohorts/[id] without cascading to associates | `DELETE /api/cohorts/[id] runs $transaction that updates associates then deletes cohort, returns 204` |
| All routes reject unauthenticated requests with 401 | `/api/cohorts/[id] auth guard` + auth cases in `GET/POST /api/cohorts` |
| All routes reject invalid payloads with 400 + zod issues | `POST returns 400 with zod issues when name is empty`, `PATCH returns 400 when endDate < startDate`, etc. |

## Threat Flags

None. Routes adopt the existing trainer auth pattern and rely on Prisma parameterized queries. No new surface area beyond what's declared in the plan's `files_modified`.

## Known Stubs

None. All handlers are wired to real Prisma calls; tests mock Prisma but the production code path uses the live client.

## Self-Check: PASSED

- FOUND: src/lib/cohort-types.ts
- FOUND: src/app/api/cohorts/route.ts
- FOUND: src/app/api/cohorts/route.test.ts
- FOUND: src/app/api/cohorts/[id]/route.ts
- FOUND: src/app/api/cohorts/[id]/route.test.ts
- FOUND: commit 04fdf99
- FOUND: commit 70498ba
- FOUND: commit 8f7e519
- FOUND: commit 5611fa7
