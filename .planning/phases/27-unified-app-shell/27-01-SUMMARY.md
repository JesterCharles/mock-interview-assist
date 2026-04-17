---
phase: 27-unified-app-shell
plan: 01
subsystem: shell
tags: [associate, shell, navigation, topbar, sidebar]
dependency_graph:
  requires: []
  provides: [associate-shell, role-aware-topbar, cohort-sidebar-header]
  affects: [src/app/associate, src/components/shell]
tech_stack:
  added: []
  patterns: [server-client-split-layout, role-prop-pattern]
key_files:
  created:
    - src/components/shell/AssociateShell.tsx
  modified:
    - src/components/shell/sidebar-configs.ts
    - src/components/shell/TopBar.tsx
    - src/components/shell/SectionSidebar.tsx
    - src/app/associate/[slug]/layout.tsx
decisions:
  - "AssociateShell client component receives slug+cohortName as plain string props from server layout (avoids icon serialization issue)"
  - "TopBar role defaults to 'trainer' — zero regression on all existing trainer usages without prop changes"
  - "associateSidebarGroups Interviews href is / (public automated flow, per D-03)"
metrics:
  duration: 10m
  completed: 2026-04-16
  tasks_completed: 2
  files_changed: 5
---

# Phase 27 Plan 01: Unified App Shell — Associate Shell Summary

Associate pages now render with the same professional two-level shell (TopBar + SectionSidebar) as trainer pages. Role-aware TopBar hides center nav links and CohortSwitcher for associates; wordmark links to associate dashboard. Sidebar shows flat 3-item nav (Dashboard, Interviews, Curriculum) with optional cohort header.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add associate sidebar config and make TopBar role-aware | e774290 | sidebar-configs.ts, TopBar.tsx |
| 2 | Add cohort header to SectionSidebar and rewire associate layout | 18f767c | SectionSidebar.tsx, AssociateShell.tsx, layout.tsx |

## Decisions Made

1. **Server/client split for associate layout**: Server layout fetches associate + cohort data, passes plain strings (`slug`, `cohortName`) to `AssociateShell` client component. This avoids the lucide icon serialization problem (icon components can't cross the RSC boundary as props).

2. **`role` prop defaults to `'trainer'`**: All existing `<TopBar />` usages in trainer layouts require zero changes — trainer behavior is preserved exactly.

3. **`associateSidebarGroups` Interviews href is `/`**: Per plan spec D-03, associates start interviews via the public automated flow at `/`, not `/interview/new` (which is trainer-only).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. Associate child pages (`page.tsx`, `dashboard/page.tsx`, `interview/page.tsx`) still wrap content in `PublicShell` — double-wrapping is intentional intermediate state per plan spec. Plan 02 handles cleanup.

## Self-Check: PASSED

All 5 files confirmed present. Both commits (e774290, 18f767c) confirmed in git log. TypeScript compiles cleanly with no errors.
