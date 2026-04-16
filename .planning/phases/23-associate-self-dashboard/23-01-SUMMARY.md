---
phase: 23-associate-self-dashboard
plan: "01"
subsystem: associate-nav
tags: [navigation, associate, layout, client-component]
dependency_graph:
  requires: []
  provides: [associate-slug-layout, AssociateNav]
  affects: [associate-profile-page, associate-dashboard-page]
tech_stack:
  added: []
  patterns: [next-layout-nesting, mailto-cta, tdd-node-env]
key_files:
  created:
    - src/components/associate/AssociateNav.tsx
    - src/components/associate/AssociateNav.test.tsx
    - src/app/associate/[slug]/layout.tsx
  modified:
    - src/app/associate/[slug]/page.tsx
decisions:
  - "buildTabs + buildMailtoHref exported as pure functions for node-env unit testing (no @testing-library/react needed)"
  - "Profile page happy path unwrapped from PublicShell to avoid double-nesting; renderForbidden() retains PublicShell for standalone 403 response"
  - "Active tab detection: exact match for /associate/[slug] (profile), prefix match for deeper routes"
metrics:
  duration: "~3 min"
  completed_date: "2026-04-16"
  tasks_completed: 2
  files_changed: 4
---

# Phase 23 Plan 01: AssociateNav + Layout Summary

AssociateNav tabbed navigation with Dashboard / Profile / mailto CTA wired into a Next.js segment layout that wraps all /associate/[slug]/* pages.

## What Was Built

**AssociateNav** (`src/components/associate/AssociateNav.tsx`) — `'use client'` component with 3 tabs:
- Dashboard → `/associate/${slug}/dashboard`
- Profile → `/associate/${slug}`
- Book a Mock → `mailto:${trainerEmail}?subject=Book+a+Mock+Interview+%E2%80%94+${name}` (inline anchor, not a Next.js Link)

Active tab detection via `usePathname()`: exact match for the profile route, prefix match for dashboard and sub-routes. Active tab gets `aria-current="page"` + `border-bottom: 2px solid var(--accent)`. Inactive tabs use `var(--muted)`. DESIGN.md tokens throughout.

**Associate layout** (`src/app/associate/[slug]/layout.tsx`) — async server component that:
1. Awaits `params` (Next.js 16 async params)
2. Queries Prisma for `displayName` + `slug` (select only — no sensitive data)
3. Calls `notFound()` if associate missing
4. Reads `TRAINER_EMAIL` env var
5. Renders `PublicShell` → `AssociateNav` → `{children}`

No identity guard in layout — deferred to child pages per plan spec.

**Profile page** (`src/app/associate/[slug]/page.tsx`) — stripped outer `PublicShell` from happy path to prevent double-nesting. `renderForbidden()` retains its `PublicShell` since it returns a standalone 403 response outside the layout's normal render path.

## Test Results

8/8 tests pass. Tests cover:
- 3 tabs render with correct labels
- Dashboard href, Profile href
- Book a Mock mailto href + subject encoding
- Active tab detection (aria-current)
- trainerEmail present vs absent in mailto

## Commits

| Hash | Message |
|------|---------|
| 663006d | test(23-01): add failing tests for AssociateNav buildTabs + buildMailtoHref |
| ea7cb42 | feat(23-01): implement AssociateNav with 3 tabs, active state, mailto CTA |
| 06b2b74 | feat(23-01): add associate slug layout with AssociateNav chrome |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Stripped PublicShell double-wrap from profile page**
- **Found during:** Task 2
- **Issue:** The existing profile page wraps its happy-path return in `<PublicShell>`. Adding a layout that also wraps in `<PublicShell>` would produce double-nested shells (double padding, nested `<main>` elements).
- **Fix:** Changed profile page happy-path return from `<PublicShell title={displayName}>` to `<>` fragment. `renderForbidden()` retains its own `PublicShell` since it is a standalone 403 response path that bypasses normal layout nesting (the layout's `notFound()` would fire first for missing associates, so the forbidden case is only hit when the associate exists but doesn't match the caller — at which point the layout has already rendered the shell).
- **Files modified:** `src/app/associate/[slug]/page.tsx`
- **Commit:** 06b2b74

**2. [Rule 3 - Blocking Issue] Test infrastructure uses node env, not jsdom**
- **Found during:** Task 1 RED phase
- **Issue:** Vitest is configured with `environment: 'node'` — `@testing-library/react` is not installed. Tests cannot use DOM rendering.
- **Fix:** Exported `buildTabs` and `buildMailtoHref` as pure functions from AssociateNav, tested those directly in node env without render. Component behavior (active state, conditional styling) is a function of these pure outputs.
- **Files modified:** `src/components/associate/AssociateNav.tsx`, `src/components/associate/AssociateNav.test.tsx`
- **Commit:** ea7cb42

## Known Stubs

None — all tabs have real hrefs wired. Dashboard page currently redirects to profile (pre-existing stub from Plan 02 scope), but that is tracked in 23-02-PLAN.md.

## Threat Flags

None — layout queries `displayName` + `slug` only (no sensitive data). `trainerEmail` comes from env var (server-side), not user input. Threat register T-23-01 and T-23-02 both accepted per plan.

## Self-Check: PASSED

- AssociateNav.tsx: FOUND
- AssociateNav.test.tsx: FOUND
- layout.tsx: FOUND
- commit 663006d: FOUND
- commit ea7cb42: FOUND
- commit 06b2b74: FOUND
