---
phase: 27-unified-app-shell
plan: 02
subsystem: shell
tags: [associate, shell, navigation, cleanup, legacy-removal]
dependency_graph:
  requires: [27-01]
  provides: [curriculum-placeholder, legacy-nav-deleted, associate-shell-complete]
  affects: [src/app/associate, src/app/interview, src/app/review, src/app/history, src/app/question-banks, src/components]
tech_stack:
  added: []
  patterns: [standalone-container-pattern, route-layout-per-section]
key_files:
  created:
    - src/app/associate/[slug]/curriculum/page.tsx
    - src/app/interview/layout.tsx
    - src/app/review/layout.tsx
    - src/app/history/layout.tsx
    - src/app/question-banks/layout.tsx
  modified:
    - src/app/associate/[slug]/page.tsx
    - src/app/associate/[slug]/dashboard/page.tsx
    - src/app/associate/[slug]/interview/page.tsx
    - src/app/associate/[slug]/dashboard/page.test.tsx
    - src/components/ClientLayout.tsx
    - src/app/signin/page.tsx
    - src/app/page.tsx
  deleted:
    - src/components/associate/AssociateNav.tsx
    - src/components/associate/AssociateNav.test.tsx
    - src/components/layout/PublicShell.tsx
    - src/components/ConditionalNavbar.tsx
    - src/components/Navbar.tsx
decisions:
  - "TopBar layouts added for /interview, /review, /history, /question-banks — these routes previously got Navbar from ConditionalNavbar in root ClientLayout; needed explicit layout files after deletion"
  - "PublicShell replaced with inline standalone container div in /signin and / (landing) — replicates exact styling without the component dependency"
  - "Forbidden render helpers (403 states) in associate pages now return plain divs — they render inside the associate layout shell, which is correct"
metrics:
  duration: 12m
  completed: 2026-04-16
  tasks_completed: 2
  files_changed: 17
---

# Phase 27 Plan 02: Unified App Shell — Cleanup Summary

Legacy navigation components (PublicShell, AssociateNav, ConditionalNavbar, Navbar) fully deleted. Associate child pages strip their PublicShell wrappers — shell chrome now comes from the parent layout. Curriculum placeholder page created. Trainer-authenticated routes (/interview, /review, /history, /question-banks) get TopBar via dedicated layout files.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create curriculum placeholder and strip PublicShell from associate child pages | 75ee680 | curriculum/page.tsx, associate page.tsx, dashboard page.tsx, interview page.tsx, dashboard page.test.tsx |
| 2 | Delete legacy nav components and add TopBar layouts for trainer routes | fa20001 | 5 deleted, ClientLayout.tsx, signin/page.tsx, app/page.tsx, 4 new layout files |

## Decisions Made

1. **TopBar layouts per route section**: After ConditionalNavbar deletion, `/interview/*`, `/review`, `/history`, `/question-banks` lost their nav chrome. Created explicit `layout.tsx` files for each route section that render `<TopBar />`. This is cleaner than restoring ConditionalNavbar and matches the pattern already used by the trainer layout.

2. **Inline standalone container for `/signin` and `/`**: Rather than keeping a thin PublicShell component just for these two pages, inlined the equivalent `min-h-screen` + `var(--bg)` + `<main>` structure directly. Eliminates the component while preserving identical visual output.

3. **Forbidden (403) renders use plain divs**: The 403 error states in associate child pages previously wrapped in PublicShell. These render inside the associate layout shell (TopBar + SectionSidebar), which provides the chrome. The plain div content displays correctly within `<main>`.

## Deviations from Plan

### Auto-added Missing Critical Functionality

**1. [Rule 2 - Missing] Added TopBar layouts for /history and /question-banks**
- **Found during:** Task 2
- **Issue:** Plan mentioned `/interview/*` and `/review/*` needing TopBar layouts. Scanning the codebase revealed `/history` and `/question-banks` were also served by ConditionalNavbar and would lose all nav chrome after deletion.
- **Fix:** Created `src/app/history/layout.tsx` and `src/app/question-banks/layout.tsx` with the same TopBar pattern.
- **Files modified:** src/app/history/layout.tsx, src/app/question-banks/layout.tsx (new)
- **Commit:** fa20001

## Known Stubs

None. Curriculum placeholder is intentionally minimal — Phase 30 will wire real curriculum data.

## Threat Flags

None. Deleted components were UI chrome only. Middleware auth guards on `/interview/*`, `/review`, `/trainer/*` are unchanged. The new layout files do not alter any auth surface.

## Self-Check: PASSED

Files confirmed present:
- src/app/associate/[slug]/curriculum/page.tsx ✓
- src/app/interview/layout.tsx ✓
- src/app/review/layout.tsx ✓
- src/app/history/layout.tsx ✓
- src/app/question-banks/layout.tsx ✓
- src/components/ClientLayout.tsx (simplified) ✓

Files confirmed deleted:
- src/components/associate/AssociateNav.tsx ✓
- src/components/associate/AssociateNav.test.tsx ✓
- src/components/layout/PublicShell.tsx ✓
- src/components/ConditionalNavbar.tsx ✓
- src/components/Navbar.tsx ✓

Commits confirmed:
- 75ee680 ✓
- fa20001 ✓

TypeScript: clean (no errors)
Tests: 51 files passed, 462 tests passed (1 file fewer — AssociateNav.test.tsx deleted as planned)
Zero dangling imports of deleted components confirmed via grep.
