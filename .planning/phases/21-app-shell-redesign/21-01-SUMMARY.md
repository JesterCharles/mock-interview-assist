---
phase: 21
plan: 01
subsystem: shell
tags: [navigation, radix-ui, shell, topbar, sidebar, cohort-switcher]
dependency_graph:
  requires: []
  provides:
    - src/components/shell/TopBar.tsx
    - src/components/shell/SectionSidebar.tsx
    - src/components/shell/AvatarMenu.tsx
    - src/components/shell/CohortSwitcher.tsx
    - src/components/shell/MobileSidebar.tsx
    - src/components/shell/sidebar-configs.ts
    - src/components/shell/types.ts
    - src/components/ConditionalNavbar.tsx
  affects:
    - src/components/ClientLayout.tsx
tech_stack:
  added:
    - "@radix-ui/react-dialog"
    - "@radix-ui/react-dropdown-menu"
  patterns:
    - Radix headless primitives for Dialog (mobile sheet) and DropdownMenu (avatar + cohort)
    - Sidebar config as typed arrays (SidebarGroup[]) passed as props to pure renderer
    - ConditionalNavbar pattern — pathname.startsWith('/trainer') suppresses global Navbar
    - useSearchParams wrapped in Suspense per Next.js App Router requirement
    - localStorage collapse/cohort persistence via useEffect (no SSR flash)
key_files:
  created:
    - src/components/shell/TopBar.tsx
    - src/components/shell/SectionSidebar.tsx
    - src/components/shell/AvatarMenu.tsx
    - src/components/shell/CohortSwitcher.tsx
    - src/components/shell/MobileSidebar.tsx
    - src/components/shell/sidebar-configs.ts
    - src/components/shell/types.ts
    - src/components/ConditionalNavbar.tsx
    - src/components/shell/sidebar-configs.test.ts
  modified:
    - src/components/ClientLayout.tsx
    - package.json
decisions:
  - "IconComponent type uses React.ComponentType<any> to accept lucide forwardRef exports (typeof 'object')"
  - "SidebarItem.icon uses IconComponent alias rather than narrowing to className-only props"
  - "TopBar accepts optional sidebarGroups prop and renders MobileSidebar when provided"
metrics:
  duration: "4 minutes"
  completed: "2026-04-16"
  tasks_completed: 2
  files_changed: 11
---

# Phase 21 Plan 01: Shell Component Library Summary

**One-liner:** Radix-powered two-level nav shell — TopBar + collapsible SectionSidebar + AvatarMenu + CohortSwitcher + MobileSidebar off-canvas sheet, with ConditionalNavbar suppressing Navbar on /trainer/* routes.

## What Was Built

All 5 shell components plus types, sidebar configs, ConditionalNavbar, and test coverage.

**Shell components (`src/components/shell/`):**
- `types.ts` — `SidebarItem` and `SidebarGroup` interfaces; `IconComponent = React.ComponentType<any>` alias for lucide compat
- `sidebar-configs.ts` — `dashboardSidebarGroups` (2 groups, 5 items) + `settingsSidebarGroups` (1 group, 5 items)
- `TopBar.tsx` — 56px sticky header; 4-item section nav with active detection (Dashboard/Settings use prefix logic); right zone has CohortSwitcher (Suspense-wrapped) + ThemeToggle + AvatarMenu; accepts `sidebarGroups` prop to embed MobileSidebar hamburger
- `SectionSidebar.tsx` — 200px expanded / 48px collapsed; localStorage persistence via `nlm_sidebar_collapsed`; group labels hidden when collapsed; `ChevronLeft/Right` toggle with ARIA labels
- `AvatarMenu.tsx` — Radix DropdownMenu; 32px initials avatar; email + role badge (success/warning color) + separator + Sign Out (danger color)
- `CohortSwitcher.tsx` — Radix DropdownMenu; `useSearchParams()` + `useRouter()` for URL param; localStorage `nlm_cohort_id` fallback on mount; fetches `/api/cohorts`; Check icon on selected item; error state copy per UI-SPEC
- `MobileSidebar.tsx` — Radix Dialog off-canvas sheet from left; `open` state auto-closes via `useEffect([pathname])`; `bg-black/30` overlay; Close button with ARIA label

**Wiring:**
- `ConditionalNavbar.tsx` — returns null for `/trainer/*`, renders `<Navbar />` otherwise
- `ClientLayout.tsx` — replaced `<Navbar />` with `<ConditionalNavbar />`

**Tests:** `sidebar-configs.test.ts` — 10 tests covering group counts, hrefs, and icon presence (all passing).

## Commits

| Hash | Message |
|------|---------|
| affc41f | feat(21-01): install Radix deps, shell types/configs, ConditionalNavbar |
| fa24b92 | feat(21-01): build TopBar, AvatarMenu, CohortSwitcher, SectionSidebar, MobileSidebar |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] lucide-react forwardRef components have typeof 'object', not 'function'**
- **Found during:** Task 1 test run
- **Issue:** Test assertion `expect(typeof item.icon).toBe('function')` failed because lucide exports `forwardRef` wrappers (typeof `'object'`)
- **Fix:** Updated test to check `typeof === 'function' || typeof === 'object'`; updated `SidebarItem.icon` type to `IconComponent = React.ComponentType<any>` to accept lucide forwardRef exports without TS errors
- **Files modified:** `src/components/shell/types.ts`, `src/components/shell/sidebar-configs.test.ts`
- **Commit:** fa24b92

## Known Stubs

None — all components are fully wired. CohortSwitcher fetches real data from `/api/cohorts`. The shell components are ready to be consumed by `src/app/trainer/layout.tsx` (Plan 02).

## Threat Flags

None — no new network endpoints or auth paths introduced. CohortSwitcher reads from existing `/api/cohorts` (already middleware-guarded). T-21-02 mitigation (TopBar only on trainer routes) is satisfied by ConditionalNavbar suppressing global Navbar.

## Self-Check: PASSED

- [x] `src/components/shell/TopBar.tsx` — exists
- [x] `src/components/shell/SectionSidebar.tsx` — exists
- [x] `src/components/shell/AvatarMenu.tsx` — exists
- [x] `src/components/shell/CohortSwitcher.tsx` — exists
- [x] `src/components/shell/MobileSidebar.tsx` — exists
- [x] `src/components/shell/sidebar-configs.ts` — exists
- [x] `src/components/shell/types.ts` — exists
- [x] `src/components/ConditionalNavbar.tsx` — exists
- [x] `affc41f` commit — verified in git log
- [x] `fa24b92` commit — verified in git log
- [x] `npm run build` — passes
- [x] `npx tsc --noEmit` — passes
- [x] sidebar-configs tests (10/10) — pass
