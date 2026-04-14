---
phase: 11-cohort-management
plan: 03
subsystem: trainer-dashboard
tags: [cohort, trainer, api, ui, associate]
requires:
  - 11-01 (GET /api/cohorts endpoint returning CohortDTO[])
  - 08 (Associate.cohortId nullable FK + Cohort model)
provides:
  - PATCH /api/trainer/[slug] — cohort assignment endpoint
  - AssociateCohortSelect — client dropdown with optimistic update
  - AssociateDetail.cohortId / cohortName fields populated from GET
affects:
  - src/app/api/trainer/[slug]/route.ts (+ PATCH, + cohort include in GET)
  - src/app/trainer/[slug]/page.tsx (+ cohort section)
  - src/lib/trainer-types.ts (+ cohortId, cohortName on AssociateDetail)
tech-stack:
  added: []
  patterns:
    - "Zod payload validation with nullable positive int"
    - "Prisma P2025 -> 404 / P2003 -> 400 error mapping"
    - "Optimistic UI update with revert on failure"
key-files:
  created:
    - src/app/trainer/[slug]/AssociateCohortSelect.tsx
    - src/app/api/trainer/[slug]/route.test.ts
  modified:
    - src/app/api/trainer/[slug]/route.ts
    - src/app/trainer/[slug]/page.tsx
    - src/lib/trainer-types.ts
decisions:
  - "PATCH co-located with associate GET (D-05) rather than a new /assign route"
  - "Dropdown + inline status text; no toast library (D-14)"
  - "Cohort section placed under PIN button in header area — visible without scrolling"
metrics:
  duration_minutes: ~4
  completed: 2026-04-14
  tasks_completed: 2
  tasks_total: 3
---

# Phase 11 Plan 03: Associate Cohort Assignment Summary

Wired trainer-driven cohort assignment: added PATCH to `/api/trainer/[slug]` accepting `{ cohortId: number | null }`, extended the associate detail payload with `cohortId`/`cohortName`, and dropped an optimistic-update cohort dropdown onto `/trainer/[slug]`. Satisfies COHORT-02 without a bulk assignment UI.

## What Was Built

### Task 1 — PATCH /api/trainer/[slug] + GET cohort fields
- Extended `AssociateDetail` in `src/lib/trainer-types.ts` with `cohortId: number | null` and `cohortName: string | null`.
- GET handler now includes `cohort: { select: { id, name } }` and maps it into the response.
- New PATCH handler:
  - Auth via `isAuthenticatedSession()` → 401.
  - Slug validated with existing `SLUG_RE` → 400.
  - Body validated with `z.object({ cohortId: z.number().int().positive().nullable() })` → 400 on failure.
  - `prisma.associate.update({ where: { slug }, data: { cohortId }, select: { slug, cohortId } })`.
  - P2025 → 404 "Associate not found"; P2003 → 400 "Invalid cohortId — cohort does not exist"; other → 500.
- 11 unit tests covering auth, slug validation, payload validation (missing field, wrong type, negative int), success paths (number + null), and both Prisma error codes. All pass.

### Task 2 — AssociateCohortSelect + page integration
- New client component `src/app/trainer/[slug]/AssociateCohortSelect.tsx`:
  - Fetches `/api/cohorts` on mount; shows "Loading cohorts…" until resolved, error message on failure.
  - `<select>` with `Unassigned` + one option per cohort, `value={selectedId ?? ''}`.
  - onChange → optimistic `setSelectedId(next)` → PATCH. On success: status `saved` for 2s. On failure: revert and show error.
  - Inline status text: grey "Saving…", green "Saved", red error message — no toast library (D-14).
  - DESIGN.md tokens: warm parchment surface, JetBrains Mono uppercase label, DM Sans body.
- `page.tsx` renders the dropdown under the existing `GeneratePinButton`, with a small "Current: <name or Unassigned>" caption below.

### Task 3 — Manual Verification Checkpoint (Deferred)
Plan defined `checkpoint:human-verify` for end-to-end click-through verification (create cohorts, assign via UI, reload to confirm persistence, confirm unassigned associates still function, run a new trainer-led interview to confirm gap/readiness pipelines). Executor left automated verification at PASS; user should run through the steps in `11-03-PLAN.md` Task 3 before closing the plan.

## Deviations from Plan

None. Plan executed as written. Added `Current: <name>` caption under the dropdown for at-a-glance clarity — still within "Claude's discretion" scope from the plan.

## Verification

- `npm run test -- src/app/api/trainer/[slug]/route.test.ts` — 11/11 pass.
- `npx tsc --noEmit` — clean.
- `npm run lint` — pre-existing warnings/errors in unrelated files (`auth-context.tsx`, `markdownParser.ts`, etc.); no new lint issues introduced by this plan.

## Known Stubs

None. Dropdown is wired to live endpoints (`GET /api/cohorts`, `PATCH /api/trainer/[slug]`). No placeholder data.

## Commits

- `4727f00` test(11-03): add failing tests for PATCH /api/trainer/[slug] + cohort fields on GET
- `b084622` feat(11-03): add PATCH /api/trainer/[slug] for cohort assignment
- `92aca78` feat(11-03): add AssociateCohortSelect dropdown to /trainer/[slug]

## Self-Check: PASSED

- FOUND: src/app/api/trainer/[slug]/route.ts (PATCH + cohort GET)
- FOUND: src/app/api/trainer/[slug]/route.test.ts (11 tests, all pass)
- FOUND: src/app/trainer/[slug]/AssociateCohortSelect.tsx (148 lines)
- FOUND: src/app/trainer/[slug]/page.tsx (cohort section wired)
- FOUND: src/lib/trainer-types.ts (cohortId + cohortName added)
- FOUND commit 4727f00, b084622, 92aca78
