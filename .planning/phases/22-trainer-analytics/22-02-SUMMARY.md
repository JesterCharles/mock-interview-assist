---
phase: 22-trainer-analytics
plan: "02"
subsystem: trainer-dashboard
tags: [analytics, kpi, sparklines, recharts, tdd, api-routes]
dependency_graph:
  requires: [22-01]
  provides: [KPI-strip, roster-sparklines, cohort-trends-chart, analytics-api-routes]
  affects: [trainer-dashboard, RosterTable, trainer-page]
tech_stack:
  added: []
  patterns: [tdd-red-green, queryRaw-bigint-safety, windowed-sql-query, url-param-state, recharts-sparkline]
key_files:
  created:
    - src/app/api/trainer/kpis/route.ts
    - src/app/api/trainer/kpis/route.test.ts
    - src/app/api/trainer/sparklines/route.ts
    - src/app/api/trainer/sparklines/route.test.ts
    - src/app/api/trainer/cohort-trends/route.ts
    - src/app/api/trainer/cohort-trends/route.test.ts
    - src/components/trainer/KpiStrip.tsx
    - src/components/trainer/RosterSparkline.tsx
    - src/components/trainer/CohortTrends.tsx
  modified:
    - src/components/trainer/RosterTable.tsx
    - src/app/trainer/(dashboard)/page.tsx
decisions:
  - useSearchParams() for cohort URL param instead of local state (P21 CohortSwitcher already owns selection)
  - CohortFilter + ReadinessSummaryBar removed — KpiStrip supersedes both
  - Cohort Trends only rendered when cohort param is present (no meaningful global trend)
  - Sparkline topGap queried with DISTINCT ON in separate query (not inline with windowed session query)
  - ROW_NUMBER filter applied in application layer (filter rn <= 6 after $queryRaw)
metrics:
  duration_seconds: 290
  completed_date: "2026-04-16"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 2
  files_created: 9
---

# Phase 22 Plan 02: Roster Analytics — KPI Strip, Sparklines, Cohort Trends Summary

**One-liner:** Three analytics API routes + three Recharts components + RosterTable enrichment delivering 4 KPI cards, per-associate sparklines with trend words, and a 12-week cohort readiness chart — all scoped by the URL-param cohort switcher.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | KPI API route + KpiStrip component | e1a68cd | kpis/route.ts, kpis/route.test.ts, KpiStrip.tsx |
| 2 | Sparkline API + RosterSparkline + RosterTable enrichment | 6f4853f | sparklines/route.ts, sparklines/route.test.ts, RosterSparkline.tsx, RosterTable.tsx |
| 3 | Cohort Trends API + CohortTrends component + roster page wiring | 91e0104 | cohort-trends/route.ts, cohort-trends/route.test.ts, CohortTrends.tsx, page.tsx |

## What Was Built

**API Routes (3):**
- `GET /api/trainer/kpis` — single `$queryRaw` returning all 4 KPI values (avgReadiness, mocksThisWeek, atRiskCount, topGapSkill, avgVariance). Cohort-scoped via `?cohort=<id>`. All bigint COUNT values converted with `Number()` before JSON response.
- `GET /api/trainer/sparklines` — ROW_NUMBER() windowed query for max 6 sessions per associate. Linear regression slope → trendWord (improving/declining/steady/new). Top gap from separate DISTINCT ON query. Returns `RosterSparklineData[]`.
- `GET /api/trainer/cohort-trends` — DATE_TRUNC('week', createdAt) grouping over last 12 weeks. Returns empty array when no cohort param. bigint COUNT and Date week_start both serialized to plain values.

**UI Components (3):**
- `KpiStrip` — 4-card CSS grid (2-col mobile, 4-col desktop). At-risk count uses `--danger` when > 0. Variance colored `--success`/`--danger`. Loading skeleton + null `—` states.
- `RosterSparkline` — 56×20 `ResponsiveContainer` with `isAnimationActive={false}`, no axes/grid/tooltip per spec. Empty array renders spacer div.
- `CohortTrends` — 12-week `LineChart` with `--accent` stroke, hidden axis lines, dotted horizontal grid, custom tooltip ("W7 · 68% avg"). Empty state for < 2 data points.

**RosterTable enrichment:**
- 3 new columns: Sparkline (56px), Trend+timestamp, Top Gap tag
- `SortField` union extended with `'trend'` and `'topGap'`
- Sparkline data matched by slug via `Map` for O(1) lookup

**Roster page rewrite:**
- `useSearchParams()` replaces local `selectedCohortId` state
- 3 parallel fetch effects (KPI, sparklines, cohort trends) all scoped by cohort URL param
- `CohortFilter` and `ReadinessSummaryBar` removed — superseded by KpiStrip
- Layout order per UI-SPEC: CohortTrends → KpiStrip → RosterTable
- `<Suspense>` wrapper required for `useSearchParams()` in Next.js App Router

## Deviations from Plan

**[Rule 2 - Missing] Suspense wrapper for useSearchParams**
- Found during: Task 3
- Issue: Next.js App Router requires `useSearchParams()` to be inside a `<Suspense>` boundary or the build warns/errors about missing fallback during static rendering
- Fix: Extracted inner component `TrainerDashboard`, wrapped in `<Suspense fallback={null}>` in the default export
- Files modified: src/app/trainer/(dashboard)/page.tsx

## Verification

- `npm run test` — 435 passed, 4 skipped (22 new tests in 3 new test files)
- `npx tsc --noEmit` — clean (no output)
- `grep -q "queryRaw" src/app/api/trainer/kpis/route.ts` — passes
- `grep -q "ROW_NUMBER" src/app/api/trainer/sparklines/route.ts` — passes
- `grep -q "DATE_TRUNC" src/app/api/trainer/cohort-trends/route.ts` — passes
- `grep -q "useSearchParams" src/app/trainer/(dashboard)/page.tsx` — passes
- `grep -q "KpiStrip" src/app/trainer/(dashboard)/page.tsx` — passes
- `grep -q "CohortTrends" src/app/trainer/(dashboard)/page.tsx` — passes

## Known Stubs

None — all data flows are wired. KpiStrip, RosterSparkline, and CohortTrends render real data from the 3 new API routes.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: auth-guard | src/app/api/trainer/kpis/route.ts | New route — getCallerIdentity() guard applied (T-22-02) |
| threat_flag: auth-guard | src/app/api/trainer/sparklines/route.ts | New route — getCallerIdentity() guard applied (T-22-03) |
| threat_flag: auth-guard | src/app/api/trainer/cohort-trends/route.ts | New route — getCallerIdentity() guard applied (T-22-04) |
| threat_flag: sql-injection | cohortId params | Prisma.sql tagged template used for all cohort params (T-22-05) |

All threats from the plan's threat register are mitigated.

## Self-Check: PASSED

- src/app/api/trainer/kpis/route.ts — FOUND
- src/app/api/trainer/kpis/route.test.ts — FOUND
- src/app/api/trainer/sparklines/route.ts — FOUND
- src/app/api/trainer/sparklines/route.test.ts — FOUND
- src/app/api/trainer/cohort-trends/route.ts — FOUND
- src/app/api/trainer/cohort-trends/route.test.ts — FOUND
- src/components/trainer/KpiStrip.tsx — FOUND
- src/components/trainer/RosterSparkline.tsx — FOUND
- src/components/trainer/CohortTrends.tsx — FOUND
- src/components/trainer/RosterTable.tsx — FOUND (enriched)
- src/app/trainer/(dashboard)/page.tsx — FOUND (rewritten)
- Commits e1a68cd, 6f4853f, 91e0104 — verified in git log
