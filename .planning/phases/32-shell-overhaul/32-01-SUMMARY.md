---
phase: 32-shell-overhaul
plan: 01
subsystem: shell
tags: [navigation, sidebar, topbar, accordion, settings]
dependency_graph:
  requires: []
  provides: [SettingsAccordionGroup, trainerSettingsAccordion, associateSettingsAccordion, SectionSidebar-accordion, TopBar-utility-only]
  affects: [shell-layout, trainer-shell, associate-shell]
tech_stack:
  added: []
  patterns: [localStorage-hydration, CSS-max-height-accordion, Radix-Dialog-mobile-sheet]
key_files:
  created: []
  modified:
    - src/components/shell/types.ts
    - src/components/shell/sidebar-configs.ts
    - src/components/shell/SectionSidebar.tsx
    - src/components/shell/MobileSidebar.tsx
    - src/components/shell/TopBar.tsx
decisions:
  - "Settings accordion uses CSS max-height transition (0 → 300px) — avoids height:auto animation problem"
  - "Collapsed sidebar shows Settings icon only with title tooltip — no sub-items rendered"
  - "MobileSidebar renders settings sub-items as always-expanded flat list (no accordion on mobile)"
  - "settingsSidebarGroups kept with @deprecated JSDoc for backward compat"
metrics:
  duration: ~25min
  completed: 2026-04-17
  tasks_completed: 3
  files_modified: 5
---

# Phase 32 Plan 01: Shell Navigation Restructure Summary

**One-liner:** Sidebar becomes primary nav with inline Settings accordion; TopBar stripped to wordmark + utility items only.

## What Was Built

Restructured the shell navigation layer per D-01 through D-07:

1. **Types** — Added `SettingsSubItem` (label + icon + optional href/action) and `SettingsAccordionGroup` (label + icon + items) to `types.ts`.

2. **SectionSidebar accordion** — Settings accordion renders at the bottom of `<nav>` via `marginTop: auto`. Toggle state persists in `localStorage` (`nlm_settings_open`). Collapsed sidebar shows only the Settings icon with tooltip. Sub-items support both Link (href) and button (action) variants with 150ms max-height CSS transition.

3. **sidebar-configs** — Added Batch Upload to trainer Actions group. Exported `trainerSettingsAccordion` (5 settings links) and `associateSettingsAccordion()` function (Profile + Security action items). Marked `settingsSidebarGroups` as deprecated.

4. **TopBar** — Deleted `NAV_ITEMS`, `isNavItemActive`, `resolveGroups`. Removed center `<nav>` block entirely. Single `<div style={{ flex: 1 }}` spacer between left and right zones. Added `settingsGroup` prop forwarded to MobileSidebar. Removed `usePathname` import (no longer needed).

5. **MobileSidebar** — Added `settingsGroup` prop. Settings items rendered as always-expanded flat list at bottom of the sheet — no accordion on mobile. Sub-items close the sheet on interact.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Types + SectionSidebar accordion | 962f868 | types.ts, SectionSidebar.tsx |
| Task 2: sidebar-configs updates | 5cc32b2 | sidebar-configs.ts |
| Task 3: TopBar strip + MobileSidebar | 08efb85 | TopBar.tsx, MobileSidebar.tsx |

## Deviations from Plan

None — plan executed exactly as written.

The `react-hooks/set-state-in-effect` lint warnings on SectionSidebar's localStorage hydration `useEffect` calls are pre-existing codebase-wide (same pattern already present in the original SectionSidebar and MobileSidebar). Not introduced by this plan.

## Known Stubs

None — no placeholder data, no hardcoded empty values.

## Threat Flags

None — client-side navigation rendering only, no new API surface.

## Self-Check

### Files Exist
- `src/components/shell/types.ts` — SettingsAccordionGroup exported
- `src/components/shell/sidebar-configs.ts` — trainerSettingsAccordion exported
- `src/components/shell/SectionSidebar.tsx` — settingsGroup prop rendered
- `src/components/shell/TopBar.tsx` — no center nav
- `src/components/shell/MobileSidebar.tsx` — settingsGroup prop rendered

### Commits Exist
- 962f868, 5cc32b2, 08efb85 — all on worktree-agent-a1486649

## Self-Check: PASSED
