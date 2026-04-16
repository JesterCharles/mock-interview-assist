---
phase: 21-app-shell-redesign
verified: 2026-04-16T02:35:00Z
status: gaps_found
score: 5/6 success criteria verified
overrides_applied: 0
gaps:
  - truth: "Mobile sidebar is a Radix off-canvas sheet accessible via hamburger on all trainer routes"
    status: failed
    reason: "trainer/layout.tsx renders <TopBar /> with no sidebarGroups prop; TopBar only mounts MobileSidebar when sidebarGroups is provided (line 64: `sidebarGroups && sidebarGroups.length > 0`); since the root trainer layout never passes the prop, the hamburger button and MobileSidebar never render on any /trainer/* route at any viewport width"
    artifacts:
      - path: "src/app/trainer/layout.tsx"
        issue: "Renders <TopBar /> with no sidebarGroups prop — MobileSidebar gate never opens"
      - path: "src/components/shell/TopBar.tsx"
        issue: "Line 64 gates MobileSidebar on sidebarGroups prop presence; correct component logic but never receives the prop"
    missing:
      - "trainer/layout.tsx must pass sidebarGroups to TopBar, OR section layouts must pass their groups to TopBar, OR TopBar must always render MobileSidebar (choosing the active section groups contextually). Simplest fix: trainer/layout.tsx passes a combined group list or imports dashboardSidebarGroups as a default; alternatively, move the hamburger/MobileSidebar into each section layout (dashboard + settings) where the groups are already available."
deferred:
  - truth: "All Dashboard child pages respect the cohort switcher filter"
    addressed_in: "Phase 22"
    evidence: "Phase 22 success criteria SC-1: 'Dashboard > Roster renders 4 KPI cards ... scoped by cohort switcher'; SC-3: 'aggregates by skill AND topic across the selected cohort'. The switcher correctly writes ?cohort to the URL (SHELL-04 mechanical requirement met); consumption of that param in page queries is Phase 22 work."
---

# Phase 21: App Shell Redesign Verification Report

**Phase Goal:** Trainer routes render a two-level navigation shell (global topbar + section-scoped sidebar) with persistent cohort switcher, reorganized routes under Next.js route groups, and new settings section absorbing existing cohort and associate management pages.
**Verified:** 2026-04-16T02:35:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every authenticated trainer route renders a global topbar with logo + Dashboard / Interviews / Question Banks / Settings + avatar menu; active section highlighted | VERIFIED | `src/app/trainer/layout.tsx` imports and renders `<TopBar />`. TopBar defines all 4 nav items (lines 19-22). AvatarMenu wired in right zone. Active detection via `usePathname()` present. |
| 2 | Dashboard section sidebar shows Overview (Roster / Gap Analysis / Calibration) + Actions (New Mock / Reports); mobile sidebar is Radix off-canvas sheet | PARTIAL | Desktop sidebar: `(dashboard)/layout.tsx` renders `<SectionSidebar groups={dashboardSidebarGroups} />` — correct. Sidebar configs verified (2 groups, 5 items). Mobile: MobileSidebar component is substantive (Radix Dialog, hamburger trigger, auto-close on nav), but never mounts because `trainer/layout.tsx` calls `<TopBar />` with no `sidebarGroups` prop, and TopBar gates MobileSidebar on that prop. |
| 3 | Existing URLs preserved: `/trainer` → Dashboard > Roster, `/trainer/[slug]` child route, `/interview/new` Interviews, `/question-banks` Question Banks | VERIFIED | `(dashboard)/page.tsx` exists (roster moved). `(dashboard)/[slug]/page.tsx` exists. Old `trainer/page.tsx` and `trainer/[slug]/` deleted (no route conflict). `/interview/new` untouched. `/question-banks` untouched. |
| 4 | New `/trainer/settings` section provides Threshold / Cohorts / Curriculum / Users / Associates pages | VERIFIED | All 5 pages confirmed: `settings/threshold/page.tsx`, `settings/cohorts/page.tsx` (moved from `/trainer/cohorts`), `settings/curriculum/page.tsx`, `settings/users/page.tsx`, `settings/associates/page.tsx`. Settings landing redirects to `/trainer/settings/threshold`. |
| 5 | Topbar cohort switcher persists selection to `?cohort=<id>` URL param | VERIFIED | `CohortSwitcher.tsx` (187 lines): `useSearchParams()` reads param on mount, `localStorage.getItem('nlm_cohort_id')` fallback, `router.replace` pushes to URL. `handleSelect` writes param + localStorage. Full URL param + localStorage persistence wired. |
| 6 | Sidebar collapsed state persists to localStorage; mobile sidebar is Radix off-canvas sheet | PARTIAL | localStorage collapse: `SectionSidebar.tsx` hydrates from `localStorage.getItem('nlm_sidebar_collapsed')` in `useEffect`, writes on toggle — VERIFIED. Mobile Radix sheet: same gap as SC-2; MobileSidebar is a substantive Radix Dialog component but is never mounted due to missing prop. |

**Score:** 5/6 truths verified (SC-2 and SC-6 share the same root gap)

---

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Dashboard child pages consume `?cohort` filter from URL | Phase 22 | Phase 22 SC-1: "KPI cards scoped by cohort switcher"; SC-3: "aggregates across selected cohort". The cohort switcher correctly writes the param — consuming it in queries is Phase 22 scope per ANALYTICS-01/02/03/06. |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/shell/TopBar.tsx` | Global topbar with 4 nav items, CohortSwitcher, AvatarMenu | VERIFIED | 123 lines, substantive. 4 nav items, Suspense-wrapped CohortSwitcher, AvatarMenu, active detection. |
| `src/components/shell/SectionSidebar.tsx` | Sidebar renderer with collapse | VERIFIED | 140 lines. localStorage persistence, collapse toggle, group labels, active detection. |
| `src/components/shell/AvatarMenu.tsx` | Radix DropdownMenu avatar | VERIFIED | 115 lines. Radix DropdownMenu, email/role badge/Sign Out, `useAuth()`. |
| `src/components/shell/CohortSwitcher.tsx` | Radix DropdownMenu cohort picker | VERIFIED | 187 lines. Full URL param + localStorage wiring, `/api/cohorts` fetch, error state. |
| `src/components/shell/MobileSidebar.tsx` | Radix Dialog off-canvas sheet | VERIFIED (component) | 131 lines. Radix Dialog, hamburger trigger, overlay, auto-close on nav, Close button. Component is substantive but never rendered due to prop gap. |
| `src/components/shell/sidebar-configs.ts` | Dashboard + Settings sidebar groups | VERIFIED | Exports `dashboardSidebarGroups` (2 groups, 5 items) and `settingsSidebarGroups` (1 group, 5 items) with correct hrefs. |
| `src/components/shell/types.ts` | SidebarGroup + SidebarItem interfaces | VERIFIED | Exports both interfaces. IconComponent alias for lucide compat. |
| `src/components/ConditionalNavbar.tsx` | Suppresses Navbar on /trainer/* | VERIFIED | `pathname.startsWith('/trainer')` returns null, else renders Navbar. Wired in ClientLayout. |
| `src/app/trainer/layout.tsx` | Trainer shell layout with TopBar | VERIFIED (partial) | Imports and renders TopBar — but no `sidebarGroups` prop passed. Mobile sidebar gap originates here. |
| `src/app/trainer/(dashboard)/layout.tsx` | Dashboard section layout with SectionSidebar | VERIFIED | Renders `<SectionSidebar groups={dashboardSidebarGroups} />`. |
| `src/app/trainer/(settings)/layout.tsx` | Settings section layout with SectionSidebar | VERIFIED | Renders `<SectionSidebar groups={settingsSidebarGroups} />`. |
| `src/app/trainer/(dashboard)/page.tsx` | Roster page (moved) | VERIFIED | Exists. Old `trainer/page.tsx` deleted. |
| `src/app/trainer/(dashboard)/gap-analysis/page.tsx` | Gap Analysis placeholder | VERIFIED | Contains "Gap Analysis" heading + "Coming in the next release." |
| `src/app/trainer/(dashboard)/calibration/page.tsx` | Calibration placeholder | VERIFIED | Contains "Calibration" heading + "Coming in the next release." |
| `src/app/trainer/(dashboard)/reports/page.tsx` | Reports placeholder | VERIFIED | Contains "Reports" heading + "Coming in the next release." |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/trainer/layout.tsx` | `src/components/shell/TopBar.tsx` | import + render | WIRED | `import { TopBar }` on line 1; `<TopBar />` on line 10. |
| `src/app/trainer/(dashboard)/layout.tsx` | `src/components/shell/SectionSidebar.tsx` | import with dashboardSidebarGroups | WIRED | Both imported and rendered with correct prop. |
| `src/app/trainer/(settings)/layout.tsx` | `src/components/shell/SectionSidebar.tsx` | import with settingsSidebarGroups | WIRED | Both imported and rendered with correct prop. |
| `src/components/shell/TopBar.tsx` | `src/components/shell/MobileSidebar.tsx` | import + conditional render | PARTIAL | Imported and renders when `sidebarGroups` prop provided — but the prop is never passed from `trainer/layout.tsx`. Hamburger and sheet unreachable at runtime. |
| `src/components/ClientLayout.tsx` | `src/components/ConditionalNavbar.tsx` | import replacement | WIRED | Lines 5+11 confirm replacement of Navbar. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `CohortSwitcher.tsx` | `cohorts` state | `fetch('/api/cohorts')` on mount | Yes — `/api/cohorts` is a real Prisma endpoint | FLOWING |
| `AvatarMenu.tsx` | `user` | `useAuth()` → Supabase session | Yes — live auth session | FLOWING |
| `SectionSidebar.tsx` | `groups` | prop from section layout → sidebar-configs.ts | Yes — static config with real hrefs | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| All shell component files exist | `ls src/components/shell/` | 8 files present | PASS |
| Sidebar configs export correct groups | grep on sidebar-configs.ts | dashboardSidebarGroups (2 groups, 5 items), settingsSidebarGroups (1 group, 5 items) — all hrefs correct | PASS |
| No route conflicts (old files deleted) | `test -f trainer/page.tsx` + `test -d trainer/cohorts` + `test -d trainer/[slug]` | All deleted | PASS |
| No stale `/trainer/cohorts` links | grep across trainer/ src | 0 matches (only `/trainer/settings/cohorts` present) | PASS |
| TypeScript compiles clean | `npx tsc --noEmit` | No errors | PASS |
| Full test suite | `npm run test` | 405 passed, 4 skipped (41 files) | PASS |
| Mobile hamburger reachable | `trainer/layout.tsx` passes sidebarGroups to TopBar | `<TopBar />` — no prop passed | FAIL |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SHELL-01 | 21-01, 21-02 | Global topbar on all authenticated trainer routes | SATISFIED | trainer/layout.tsx renders TopBar; 4 nav items + avatar menu verified |
| SHELL-02 | 21-01, 21-02 | Section-scoped sidebar; mobile = Radix sheet | PARTIAL | Desktop sidebar verified. Mobile Radix sheet component exists but is not reachable (prop wiring gap). |
| SHELL-03 | 21-02 | Route reorganization preserving existing URLs | SATISFIED | /trainer, /trainer/[slug], /interview/new, /question-banks all preserved; cohorts moved to /trainer/settings/cohorts; old routes deleted |
| SHELL-04 | 21-01, 21-02 | Cohort switcher persists to ?cohort param; sidebar collapse persists to localStorage | SATISFIED (mechanical) | CohortSwitcher writes ?cohort + localStorage. SectionSidebar persists collapsed state. Consuming ?cohort in page queries deferred to Phase 22. |

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/app/trainer/(dashboard)/gap-analysis/page.tsx` | "Coming in the next release." placeholder | INFO | Intentional — placeholders for Phase 22 analytics work per SUMMARY.md Known Stubs |
| `src/app/trainer/(dashboard)/calibration/page.tsx` | "Coming in the next release." placeholder | INFO | Intentional |
| `src/app/trainer/(dashboard)/reports/page.tsx` | "Coming in the next release." placeholder | INFO | Intentional |
| `src/app/trainer/layout.tsx` | `<TopBar />` without `sidebarGroups` prop | BLOCKER | Prevents mobile off-canvas sidebar from ever mounting; blocks SHELL-02 SC-6 compliance |

---

### Human Verification Required

None — all remaining items are programmatically verifiable or deferred to Phase 22.

---

### Gaps Summary

**1 gap found with 1 root cause:**

The `MobileSidebar` component is fully implemented (Radix Dialog, hamburger trigger, close button, auto-close on navigation, aria labels). The `TopBar` component correctly gates its render on the `sidebarGroups` prop. However, `src/app/trainer/layout.tsx` calls `<TopBar />` with no props, so the hamburger and mobile sheet never mount on any `/trainer/*` route.

The fix is a one-line change (pass sidebar groups to TopBar) or a small architectural adjustment (move hamburger into section-level layouts where groups are already available, or have TopBar always render MobileSidebar with a contextually-determined group list).

This gap directly violates SHELL-02 ("Mobile sidebar = Radix sheet (off-canvas hamburger)") and SC-6 ("mobile sidebar is a Radix off-canvas sheet").

---

_Verified: 2026-04-16T02:35:00Z_
_Verifier: Claude (gsd-verifier)_
