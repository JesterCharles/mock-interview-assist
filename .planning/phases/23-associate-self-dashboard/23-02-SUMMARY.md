---
phase: 23-associate-self-dashboard
plan: "02"
subsystem: associate-dashboard
tags: [associate, dashboard, gap-trend, readiness, server-component, identity-guard]
dependency_graph:
  requires: [23-01]
  provides: [associate-self-dashboard, RecommendedAreaCard, ReadinessProgressBar]
  affects: [associate-profile-page, GapTrendChart]
tech_stack:
  added: []
  patterns: [server-component-identity-guard, direct-prisma-query, localStorage-dismiss, recharts-reuse]
key_files:
  created:
    - src/components/associate/RecommendedAreaCard.tsx
    - src/components/associate/ReadinessProgressBar.tsx
    - src/components/associate/RecommendedAreaCard.test.tsx
    - src/app/associate/[slug]/dashboard/page.test.tsx
  modified:
    - src/app/associate/[slug]/dashboard/page.tsx
decisions:
  - "RecommendedAreaCard exports getDismissRecord + isDismissedForArea as pure functions for node-env testability (same pattern as AssociateNav in 23-01)"
  - "ReadinessProgressBar is a pure presentational component (no use client needed — all props, no browser APIs)"
  - "Dashboard queries Prisma directly rather than calling trainer-gated API routes (per plan research pitfall)"
  - "Readiness % computed server-side from skill-level gap scores (topic===null or '') before rendering"
metrics:
  duration: "~3 min"
  completed_date: "2026-04-16"
  tasks_completed: 2
  files_changed: 5
---

# Phase 23 Plan 02: Associate Self-Dashboard Summary

Full server-rendered associate dashboard with gap trend chart, 7-day dismissable recommended area card, and readiness progress bar with color-coded fill and threshold marker — replacing the P19 one-line redirect stub.

## What Was Built

**RecommendedAreaCard** (`src/components/associate/RecommendedAreaCard.tsx`) — `'use client'` component:
- Reads localStorage key `nlm_dismiss_recommended_${slug}` on mount
- Shows card when: no dismiss record, OR dismiss > 7 days ago, OR stored area differs from current recommended area
- "Not now" button writes dismiss record with `dismissedAt` ISO timestamp and `recommendedArea`
- Exports `getDismissRecord` + `isDismissedForArea` as pure functions for node-env unit testing

**ReadinessProgressBar** (`src/components/associate/ReadinessProgressBar.tsx`) — pure presentational component:
- Horizontal bar `height: 12px`, `border-radius: 6px`, fill color from DESIGN tokens
- Color logic: `>= threshold` → `var(--success)`, `>= threshold - 10` → `var(--warning)`, else → `var(--danger)`
- Absolute-positioned threshold marker at `left: ${threshold}%`
- Label: "Your Readiness: X% (Target: Y%)"

**Dashboard page** (`src/app/associate/[slug]/dashboard/page.tsx`) — async server component:
- Identity guard matches profile page pattern exactly: anonymous → `/signin?as=associate&next=...`, wrong-slug associate → 403, trainer/admin → allowed
- Direct Prisma `findUnique` for associate + gapScores + sessions (no API calls to trainer-gated routes)
- `getSettings()` imported directly for readiness threshold
- Readiness % computed server-side: skill-level gap scores (topic===null or '') averaged × 100
- Passes `GapScoreEntry[]` + `SessionSummary[]` to reused `GapTrendChart` component
- Empty state when no completed sessions

## Test Results

13 new tests across 2 test files — all pass. Full suite: 481 passed, 4 skipped.

- `RecommendedAreaCard.test.tsx`: 8 tests covering getDismissRecord (null, stored, malformed JSON) and isDismissedForArea (not dismissed, within 7 days, expired, area changed)
- `page.test.tsx`: 5 tests covering guard matrix (own slug, wrong slug → 403, anonymous → redirect, trainer access) + readiness % computation

## Commits

| Hash | Message |
|------|---------|
| 8a86991 | feat(23-02): add RecommendedAreaCard + ReadinessProgressBar components |
| 1c3931f | feat(23-02): replace dashboard stub with full server-rendered page |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Exported pure helpers from RecommendedAreaCard for node-env testability**
- **Found during:** Task 1
- **Issue:** Vitest runs in `environment: 'node'` — no jsdom, no React testing library. Component render tests are not feasible. The plan called for tests including "Clicking Not now hides the card and writes localStorage."
- **Fix:** Exported `getDismissRecord` and `isDismissedForArea` as named exports. Tests exercise the full dismiss logic through these pure functions. Component lifecycle behavior (useState hide) is implicit in the pure logic tests.
- **Files modified:** `src/components/associate/RecommendedAreaCard.tsx`, `src/components/associate/RecommendedAreaCard.test.tsx`
- **Commit:** 8a86991

## Known Stubs

None — all data is live from Prisma. `recommendedArea` comes from the DB Associate record (populated by readinessPipeline). If an associate has no gap scores, readinessPercent renders as 0% and RecommendedAreaCard renders nothing (null guard in place).

## Threat Flags

None — threat register T-23-03 through T-23-06 all mitigated or accepted per plan spec. Identity guard is in place (T-23-03). Prisma query filters by validated slug (T-23-04). Trainer access intentionally allowed (T-23-05). localStorage dismiss is UX preference only (T-23-06).

## Self-Check: PASSED

- RecommendedAreaCard.tsx: FOUND
- ReadinessProgressBar.tsx: FOUND
- RecommendedAreaCard.test.tsx: FOUND
- dashboard/page.tsx: FOUND (full implementation, stub removed)
- dashboard/page.test.tsx: FOUND
- commit 8a86991: FOUND
- commit 1c3931f: FOUND
