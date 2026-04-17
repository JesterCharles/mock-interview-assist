---
phase: 32-shell-overhaul
plan: "03"
subsystem: trainer-dashboard
tags: [roster, trainer-detail, associate-dashboard, component-reuse]
dependency_graph:
  requires: [32-01]
  provides: [trainer-associate-detail-unified-view, roster-slug-column-removed]
  affects: [src/components/trainer/RosterTable.tsx, src/app/trainer/(dashboard)/[slug]/page.tsx]
tech_stack:
  added: []
  patterns: [component-reuse, parallel-fetch]
key_files:
  modified:
    - src/components/trainer/RosterTable.tsx
    - src/app/trainer/(dashboard)/[slug]/page.tsx
decisions:
  - "Derive recommendedArea and lowestScore from detail.gapScores client-side (AssociateDetail lacks these fields)"
  - "Fetch /api/settings in parallel with /api/trainer/[slug] to get threshold; default 75 on failure"
  - "lowestSkillSessionCount approximated from lowestGap.sessionCount (gap score carries per-skill session count)"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-16"
  tasks_completed: 2
  files_modified: 2
---

# Phase 32 Plan 03: Roster Cleanup & Unified Associate Detail View Summary

Slug column removed from roster table; trainer associate detail page now renders `AssociateDashboardClient` — the same component associates see — giving trainers an identical SkillCardList, FocusHero, radar, and trend chart view above a trainer-only action strip (cohort select + export PDF).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove slug column from RosterTable | 37b52f9 | src/components/trainer/RosterTable.tsx |
| 2 | Replace trainer detail view with AssociateDashboardClient | f1dffe4 | src/app/trainer/(dashboard)/[slug]/page.tsx |

## Changes Made

### Task 1 — RosterTable slug column removal
- Removed `<th>Slug</th>` header cell
- Removed slug `<td>` body cell (JetBrains Mono display of `associate.slug`)
- Updated empty-state `colSpan` from 9 to 8
- Row click still navigates to `/trainer/${associate.slug}` — no change to routing

### Task 2 — Trainer detail page unified view
- Imported `AssociateDashboardClient` from `@/app/associate/[slug]/dashboard/AssociateDashboardClient`
- Removed old imports: `SessionHistoryList`, `EmptyGapState`, `GapTrendChart`, `CalibrationView`
- Removed `hasGapData`, `hasCalibrationData` variables
- Removed slug `<p>` display below name (D-10: slug column removed, no need to show here)
- Added parallel fetch of `/api/settings` alongside `/api/trainer/${slug}` to get threshold
- Derived `recommendedArea`, `lowestScore`, `lowestSkillSessionCount` from `detail.gapScores` client-side
- Kept trainer-only action strip: `AssociateCohortSelect` + Export PDF button above dashboard
- Replaced asymmetric grid with `<AssociateDashboardClient>` receiving mapped props

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — component is data-display only; data flows from existing trainer-guarded `/api/trainer/[slug]` endpoint with no new write surface (T-32-04 accepted per threat model).

## Self-Check: PASSED

- `src/components/trainer/RosterTable.tsx` — modified, verified with `git log`
- `src/app/trainer/(dashboard)/[slug]/page.tsx` — modified, verified with `git log`
- Commit 37b52f9 — exists
- Commit f1dffe4 — exists
- No TypeScript errors in modified files (`npx tsc --noEmit` shows only pre-existing errors in unrelated parallel agent files)
