---
phase: 11-cohort-management
plan: 02
subsystem: cohorts-ui
tags: [ui, trainer, cohorts, crud, design-system]
requires:
  - /api/cohorts (Plan 11-01)
  - /api/cohorts/[id] (Plan 11-01)
  - src/lib/cohort-types.ts
  - src/lib/auth-server.ts isAuthenticatedSession
  - src/lib/prisma.ts
provides:
  - /trainer/cohorts route (server shell + client CRUD)
  - Inline create/edit form with zod-issue -> field-error mapping
  - Native window.confirm delete wired to DELETE /api/cohorts/[id]
  - Cohorts sub-nav link on /trainer dashboard
affects:
  - Phase 11-03 (associate cohort assignment) — Cohorts page now exists for trainers
  - Phase 12 (cohort dashboard views) — nav pattern established
tech-stack:
  added: []
  patterns:
    - "Server component page.tsx + 'use client' CRUD component pattern (matches /trainer/page.tsx style)"
    - "Inline form toggled via formOpen + editingCohortId local state (D-09, D-10)"
    - "Zod issue[].path[0] -> formErrors[field] mapping for inline errors (D-16)"
    - "DESIGN.md tokens applied inline + scoped cohorts.css reusing .trainer-shell"
key-files:
  created:
    - src/app/trainer/cohorts/page.tsx
    - src/app/trainer/cohorts/CohortsClient.tsx
    - src/app/trainer/cohorts/cohorts.css
  modified:
    - src/app/trainer/page.tsx
decisions:
  - "Server component seeds initialCohorts via prisma directly (no extra /api/cohorts GET on first render)"
  - "Form handles 400 by mapping zod issues per field; 409 surfaces 'name already exists' under the name field even though cohort name is not DB-unique (future-proof for D-17 reversal)"
  - "Sub-nav implemented as simple Link elements above the page title; cohorts.css adds reusable .cohorts-subnav for CohortsClient"
  - "Empty endDate input is sent as null (Cohort.endDate is nullable per Plan 11-01 schema correction)"
metrics:
  duration: "~8 min"
  completed: "2026-04-14"
  tasks: 2
  files_created: 3
  files_modified: 1
  commits: 2
---

# Phase 11 Plan 02: Cohort Management UI Summary

**One-liner:** Trainer-facing `/trainer/cohorts` page with server-seeded list, inline create/edit form mapping zod issues to field errors, `window.confirm`-guarded non-cascading delete, and a Dashboard/Cohorts sub-nav on `/trainer`.

## What Shipped

- **`src/app/trainer/cohorts/page.tsx`** — Server component. `isAuthenticatedSession()` redirect to `/login`. Loads cohorts via `prisma.cohort.findMany({ orderBy: { startDate: 'desc' }, include: { _count: { associates } } })` and passes serialized `CohortDTO[]` into the client.
- **`src/app/trainer/cohorts/CohortsClient.tsx`** — Client component (~400 lines). State: `cohorts`, `formOpen`, `editingCohortId`, `formState`, `formErrors`, `submitting`, `rowError`. Handles create (POST), edit (PATCH), delete (DELETE) against Plan 11-01 routes with `credentials: 'include'`. Zod `400` issues are mapped into per-field errors; `409` collapses to the name field.
- **`src/app/trainer/cohorts/cohorts.css`** — Scoped styles: header, sub-nav, form grid, primary/secondary/ghost buttons using DESIGN.md tokens (warm parchment, burnt orange accent, Clash Display heading, DM Sans body).
- **`src/app/trainer/page.tsx`** — Added `<nav>` with Dashboard (current) + Cohorts link above the existing `<h1>`. No changes to roster fetching or rendering.

## Commits

| Hash    | Message                                                           |
| ------- | ----------------------------------------------------------------- |
| 1079691 | feat(11-02): add /trainer/cohorts page with inline CRUD form       |
| a438dab | feat(11-02): add Cohorts sub-nav link to /trainer dashboard        |

## Verification

- `npx eslint src/app/trainer/cohorts/ src/app/trainer/page.tsx` → **clean** (no errors, no warnings in new/modified files).
- `npx tsc --noEmit` scoped to new files → **clean**. Pre-existing errors in `src/app/api/trainer/[slug]/route.ts` + `route.test.ts` belong to Plan 11-03's in-flight work and are out of scope per deviation rules.
- Manual browser verification (Task 3) deferred to the next interactive session — the plan's checkpoint still applies.

## Success Criteria — Status

- [x] Trainer can navigate from `/trainer` to `/trainer/cohorts` via a visible nav link
- [x] Trainer sees a table of all cohorts with name, dates, associate count, actions
- [x] Create posts to `/api/cohorts` and prepends the new row without reload
- [x] Edit pre-fills the same inline form and PATCHes `/api/cohorts/[id]`; the row updates in place
- [x] Delete prompts `window.confirm`, calls DELETE, removes the row; associates are preserved by the Plan 11-01 transaction
- [x] Form validation errors render inline near each field (local validation + server zod-issue mapping)
- [x] UI follows DESIGN.md tokens (warm parchment bg, Clash Display title, DM Sans body, burnt orange CTA)

## Deviations from Plan

None. All tasks were executed as written. Task 3 is a blocking human-verify checkpoint; this executor ran the two implementation tasks and stops ahead of the manual browser flow.

### Out-of-scope items deferred

- `src/app/api/trainer/[slug]/route.ts` and its test currently have TypeScript errors (`PATCH` export + `AssociateDetail` cohort fields). These belong to Plan 11-03's TDD RED commit (`4727f00`) and GREEN is not yet applied on the worktree base; leaving untouched per the scope-boundary rule.

## Must-Haves Coverage

| Truth                                                                                  | Verified By                                                                                        |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Nav link from `/trainer` → `/trainer/cohorts`                                          | `<Link href="/trainer/cohorts">Cohorts</Link>` in updated `src/app/trainer/page.tsx`                |
| Cohort table renders name, dates, associate count, actions                             | `<table className="trainer-table">` in `CohortsClient.tsx` with matching columns                   |
| Create → new row appears without reload                                                | `setCohorts((prev) => [{ ...saved, associateCount: 0 }, ...prev])` after 201 POST                  |
| Edit uses the same inline form pre-filled                                              | `openEditForm(c)` sets `editingCohortId` + `formState` from the row                                |
| Delete prompts `window.confirm` and removes row on 204                                 | `handleDelete` uses the spec-exact confirm copy and filters state on success                       |
| Validation errors render inline near the offending field                               | `formErrors` keyed by field; rendered under each `<input>/<textarea>` as `<span className="error">` |

## Threat Flags

None. The new UI only consumes existing Plan 11-01 routes (all already auth-guarded). No new fetch surface area, no file access, no schema changes.

## Known Stubs

None. All form fields map to real API contracts, and list data is server-seeded from Prisma.

## Self-Check: PASSED

- FOUND: src/app/trainer/cohorts/page.tsx
- FOUND: src/app/trainer/cohorts/CohortsClient.tsx
- FOUND: src/app/trainer/cohorts/cohorts.css
- FOUND: src/app/trainer/page.tsx (modified)
- FOUND: commit 1079691
- FOUND: commit a438dab
