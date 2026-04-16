---
phase: 21
plan: 02
subsystem: shell
tags: [navigation, route-groups, layout, trainer, shell]
dependency_graph:
  requires:
    - src/components/shell/TopBar.tsx
    - src/components/shell/SectionSidebar.tsx
    - src/components/shell/sidebar-configs.ts
  provides:
    - src/app/trainer/layout.tsx
    - src/app/trainer/(dashboard)/layout.tsx
    - src/app/trainer/(settings)/layout.tsx
    - src/app/trainer/(dashboard)/page.tsx
    - src/app/trainer/(dashboard)/[slug]/page.tsx
    - src/app/trainer/(settings)/settings/cohorts/page.tsx
  affects:
    - All /trainer/* routes (now wrapped in shell)
tech_stack:
  added: []
  patterns:
    - Next.js route groups (dashboard)/(settings) for layout scoping
    - Server layout (trainer root) + client layout (section level with SectionSidebar)
    - Removed client-side auth redirects from page components (middleware handles /trainer/*)
    - Removed inline sub-nav from pages (TopBar + sidebar now handle navigation)
key_files:
  created:
    - src/app/trainer/layout.tsx
    - src/app/trainer/(dashboard)/layout.tsx
    - src/app/trainer/(dashboard)/page.tsx
    - src/app/trainer/(dashboard)/loading.tsx
    - src/app/trainer/(dashboard)/trainer.css
    - src/app/trainer/(dashboard)/[slug]/page.tsx
    - src/app/trainer/(dashboard)/[slug]/loading.tsx
    - src/app/trainer/(dashboard)/[slug]/AssociateCohortSelect.tsx
    - src/app/trainer/(dashboard)/gap-analysis/page.tsx
    - src/app/trainer/(dashboard)/calibration/page.tsx
    - src/app/trainer/(dashboard)/reports/page.tsx
    - src/app/trainer/(settings)/layout.tsx
    - src/app/trainer/(settings)/settings/page.tsx
    - src/app/trainer/(settings)/settings/threshold/page.tsx
    - src/app/trainer/(settings)/settings/cohorts/page.tsx
    - src/app/trainer/(settings)/settings/cohorts/CohortsClient.tsx
    - src/app/trainer/(settings)/settings/cohorts/page.test.tsx
    - src/app/trainer/(settings)/settings/cohorts/[id]/page.tsx
    - src/app/trainer/(settings)/settings/cohorts/[id]/curriculum/page.tsx
    - src/app/trainer/(settings)/settings/cohorts/[id]/curriculum/CurriculumManager.tsx
    - src/app/trainer/(settings)/settings/curriculum/page.tsx
    - src/app/trainer/(settings)/settings/users/page.tsx
    - src/app/trainer/(settings)/settings/associates/page.tsx
    - src/app/trainer/(settings)/settings/associates/AssociatesBackfillTable.tsx
    - src/app/trainer/(settings)/settings/associates/DryRunPreviewCard.tsx
  modified:
    - src/app/trainer/nav-link.test.ts
decisions:
  - "Trainer root layout.tsx is server component — TopBar (client) imported directly (legal in Next.js App Router)"
  - "Dashboard/settings section layouts are 'use client' to render SectionSidebar (uses localStorage + usePathname)"
  - "Client-side useAuth() redirect removed from roster + slug pages — middleware already guards /trainer/*"
  - "Inline sub-nav removed from roster and cohorts pages — TopBar + SectionSidebar own all navigation"
  - "nav-link test rewritten to assert sidebar config rather than page source string"
metrics:
  duration: "5 minutes"
  completed: "2026-04-16"
  tasks_completed: 2
  files_changed: 25
---

# Phase 21 Plan 02: Route Group Reorganization Summary

**One-liner:** Trainer shell wired end-to-end — Next.js route groups `(dashboard)` and `(settings)` scope section sidebars, TopBar wraps all `/trainer/*` routes, cohorts moved to `/trainer/settings/cohorts`, placeholder pages added for gap-analysis/calibration/reports/threshold/curriculum/users.

## What Was Built

### Route group structure

```
src/app/trainer/
├── layout.tsx               ← NEW: server layout, wraps all /trainer/* with TopBar
├── nav-link.test.ts         ← UPDATED: now asserts sidebar config
├── (dashboard)/
│   ├── layout.tsx           ← NEW: 'use client', SectionSidebar + dashboardSidebarGroups
│   ├── page.tsx             ← MOVED: roster page (inline sub-nav removed)
│   ├── loading.tsx          ← MOVED
│   ├── trainer.css          ← MOVED
│   ├── [slug]/
│   │   ├── page.tsx         ← MOVED: associate detail (auth redirect removed)
│   │   ├── loading.tsx      ← MOVED
│   │   └── AssociateCohortSelect.tsx ← MOVED
│   ├── gap-analysis/page.tsx ← NEW: placeholder
│   ├── calibration/page.tsx  ← NEW: placeholder
│   └── reports/page.tsx      ← NEW: placeholder
└── (settings)/
    ├── layout.tsx            ← NEW: 'use client', SectionSidebar + settingsSidebarGroups
    └── settings/
        ├── page.tsx          ← NEW: redirect → /trainer/settings/threshold
        ├── threshold/page.tsx ← NEW: placeholder
        ├── curriculum/page.tsx ← NEW: placeholder
        ├── users/page.tsx    ← NEW: placeholder
        ├── cohorts/          ← MOVED from /trainer/cohorts/
        │   ├── page.tsx      (links updated)
        │   ├── CohortsClient.tsx (links updated)
        │   ├── page.test.tsx (describe/it text + mock path updated)
        │   └── [id]/
        │       ├── page.tsx  (breadcrumb links updated)
        │       └── curriculum/
        │           ├── page.tsx (breadcrumb links updated)
        │           └── CurriculumManager.tsx
        └── associates/       ← MOVED from /trainer/settings/associates/
            ├── page.tsx      (back link removed, auth guard kept)
            ├── AssociatesBackfillTable.tsx
            └── DryRunPreviewCard.tsx
```

### Link updates

All internal `/trainer/cohorts/*` hrefs updated to `/trainer/settings/cohorts/*` in:
- `CohortsClient.tsx` — "View cohort →" link
- `[id]/page.tsx` — breadcrumb + "Manage curriculum →" link
- `[id]/curriculum/page.tsx` — all breadcrumb links

## Commits

| Hash | Message |
|------|---------|
| 9be97ee | feat(21-02): reorganize trainer routes into (dashboard)/(settings) route groups |
| 510da96 | test(21-02): update nav-link test to verify sidebar config instead of page source |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Removed redundant client-side auth redirects**
- **Found during:** Task 1
- **Issue:** Roster page and slug detail page had `useEffect` redirects to `/login` for unauthenticated users. Middleware already guards all `/trainer/*` routes. The redirects also pointed to the old `/login` path (now `/signin`).
- **Fix:** Removed the auth redirect `useEffect` and early-return null guards from both pages. Auth is handled entirely by middleware.
- **Files modified:** `(dashboard)/page.tsx`, `(dashboard)/[slug]/page.tsx`
- **Commit:** 9be97ee

**2. [Rule 2 - Missing] Removed inline sub-nav from roster and cohorts pages**
- **Found during:** Task 1
- **Issue:** `page.tsx` had a hard-coded "Dashboard / Cohorts" tab strip. `CohortsClient.tsx` had a "Dashboard / Cohorts" breadcrumb nav. These duplicate navigation now owned by TopBar + SectionSidebar.
- **Fix:** Removed inline sub-nav from roster page. Removed sub-nav from CohortsClient.
- **Files modified:** `(dashboard)/page.tsx`, `(settings)/settings/cohorts/CohortsClient.tsx`
- **Commit:** 9be97ee

## Known Stubs

- `threshold/page.tsx` — static placeholder; no `/api/settings` UI wired yet (planned for future plan)
- `curriculum/page.tsx` — static placeholder directing user to cohort settings
- `users/page.tsx` — static placeholder (admin-promote UI deferred to v1.3)
- `gap-analysis/page.tsx`, `calibration/page.tsx`, `reports/page.tsx` — placeholders for Phase 22 analytics work

These stubs do not block the plan's goal (trainer shell navigation). They are intentional placeholders for future plans.

## Threat Flags

None — no new network endpoints or auth paths. Route groups affect layout only, not auth. Middleware continues to guard all `/trainer/*` routes (T-21-04 mitigated). All `/trainer/cohorts` stale links eliminated (T-21-05 mitigated). Build passes with no route conflicts (T-21-06 mitigated).

## Self-Check: PASSED

- [x] `src/app/trainer/layout.tsx` — exists, contains TopBar
- [x] `src/app/trainer/(dashboard)/layout.tsx` — exists, contains dashboardSidebarGroups
- [x] `src/app/trainer/(settings)/layout.tsx` — exists, contains settingsSidebarGroups
- [x] `src/app/trainer/(dashboard)/page.tsx` — exists (roster moved)
- [x] `src/app/trainer/page.tsx` — deleted (no route conflict)
- [x] `src/app/trainer/cohorts/` — deleted (no stale route)
- [x] `src/app/trainer/(settings)/settings/cohorts/page.tsx` — exists
- [x] No stale `/trainer/cohorts` links in TSX files
- [x] `9be97ee` commit — verified
- [x] `510da96` commit — verified
- [x] `npm run build` — passes (all routes render correctly)
- [x] `npm run test` — 405/405 pass
