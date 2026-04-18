---
phase: 40-ui-mvp
plan: 02
subsystem: coding-ui
tags: [ui, coding, list, filters]
requires:
  - 40-01 (Monaco wrapper, nav, route shells)
provides:
  - /coding list view with URL-synced filters
  - ChallengeCard + EmptyState reusable components
  - useChallengeList hook (cursor pagination, filter state, abort-on-change)
affects:
  - src/app/coding/page.tsx (SSR fetch + hydration)
tech-stack:
  patterns:
    - "Hook-first client state with SSR-seeded initial data (no double-fetch)"
    - "URL-encoded filter state via next/navigation useSearchParams"
    - "Abort-on-change via AbortController ref"
key-files:
  created:
    - src/hooks/useChallengeList.ts
    - src/components/coding/ChallengeFilters.tsx
    - src/components/coding/ChallengeCard.tsx
    - src/components/coding/ChallengeEmptyState.tsx
    - src/components/coding/ChallengeList.tsx
    - src/components/coding/ChallengeList.test.tsx
  modified:
    - src/app/coding/page.tsx
decisions:
  - "Native <select> over Radix dropdowns — accessible, smaller bundle, matches warm editorial aesthetic"
  - "availableWeeks derived server-side from associate's cohort curriculum; defaults 1-11 if unknown"
  - "SSR-seeded items skip the first client fetch to avoid double-fetch flash"
  - "Status filter applied client-side-equivalent via hook; server filter does the primary cut"
metrics:
  duration: "~2 min"
  completed: "2026-04-18"
---

# Phase 40 Plan 02: Challenge List Page Summary

Shipped `/coding` list view per CODING-UI-01. Server component SSR-fetches first page from `/api/coding/challenges` with filters from `searchParams`, hydrates into a `<ChallengeList>` client component with sticky filter bar, URL-synced filter state, cursor-based "Load more", and distinct empty states for `no-cohort` vs `no-matches`.

## What shipped
- `useChallengeList` hook: filters from URL, `setFilters` updates URL + refetches, `loadMore` appends, abort-in-flight on filter change.
- `ChallengeFilters`: sticky top bar with 4 native selects (language, week, difficulty, status) + Clear filters button; DESIGN tokens only.
- `ChallengeCard`: CohortCard-pattern surface (var(--surface), 12px radius, 24px padding, hover → var(--accent) border), tiered difficulty pill, status pill (unstarted/attempted/passed), skill pill, Next Link wrap.
- `ChallengeEmptyState`: two variants (no-cohort + no-matches); optional `onClearFilters` CTA.
- `ChallengeList`: composes filters + card grid + empty-state routing + load-more; error banner with 429 retry countdown.
- `/coding` page.tsx: SSR fetch, error handling (4xx/network), cohort-aware hydration props.

## Deviations from Plan

### Auto-fixed Issues
None — hooks followed plan exactly.

### DESIGN token usage
- Badge backgrounds use semantic tokens (`var(--success-bg)`, `var(--warning-bg)`, `var(--danger-bg)`) which are defined in globals.css. No hardcoded hex needed — the fallback path documented in the plan wasn't triggered.

## Test coverage
- **15 tests** in `ChallengeList.test.tsx`:
  - Hook: filters-from-URL init, setFilters preserves/removes params, loadMore appends, loadMore no-op when `hasMore=false`, 429 surface with Retry-After
  - ChallengeFilters: 4 dropdowns, onChange emits language, All → undefined
  - ChallengeCard: title/language/difficulty/skillSlug render, status label mapping (null/pass/fail), link href
  - ChallengeEmptyState: no-cohort copy, no-matches onClearFilters callback

## Authentication gates
None.

## DESIGN token gaps encountered
None — semantic `--*-bg` tokens covered badge backgrounds.

## Hook-level decisions
- **Initial-state hydration:** hook accepts `initialItems` + `initialCursor`; first effect skips when items seeded (prevents SSR-then-client double-fetch).
- **AbortController scope:** one ref shared across fetchPage calls; each new fetch aborts the previous in-flight request.

## Self-Check: PASSED

- [x] `src/hooks/useChallengeList.ts` FOUND
- [x] `src/components/coding/ChallengeFilters.tsx` FOUND
- [x] `src/components/coding/ChallengeCard.tsx` FOUND
- [x] `src/components/coding/ChallengeEmptyState.tsx` FOUND
- [x] `src/components/coding/ChallengeList.tsx` FOUND
- [x] `src/components/coding/ChallengeList.test.tsx` FOUND
- [x] Commit `e840cb4` FOUND
