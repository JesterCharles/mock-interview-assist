---
phase: 22-trainer-analytics
plan: "03"
subsystem: trainer-dashboard
tags: [analytics, gap-analysis, drill-through, tdd, api-routes, sql]
dependency_graph:
  requires: [22-01]
  provides: [gap-analysis-api, gap-analysis-page, gap-drill-through-page]
  affects: [trainer-dashboard, gap-analysis]
tech_stack:
  added: []
  patterns: [tdd-red-green, queryRaw-bigint-safety, parameterized-sql, url-param-state, drill-through-navigation]
key_files:
  created:
    - src/app/api/trainer/gap-analysis/route.ts
    - src/app/api/trainer/gap-analysis/route.test.ts
    - src/app/trainer/(dashboard)/gap-analysis/[skill]/page.tsx
  modified:
    - src/app/trainer/(dashboard)/gap-analysis/page.tsx
decisions:
  - Single GET route handles both aggregation (no skill param) and drill-through (skill+topic) modes
  - Returns 400 when only skill is provided without topic (prevents ambiguous partial drill-through)
  - Date->ISO conversion handles both Date objects and string values from Prisma $queryRaw
  - Associate name rendered as button (not Link) for inline hover color change without anchor nav conflicts
metrics:
  duration_seconds: 141
  completed_date: "2026-04-16"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
  files_created: 3
---

# Phase 22 Plan 03: Gap Analysis Page Summary

**One-liner:** Single-route gap aggregation API (Prisma $queryRaw) + sortable skill/topic table replacing P21 placeholder + drill-through page showing affected associates — all cohort-scoped via URL param.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Gap Analysis API route (aggregation + drill-through) | 928e016 | route.ts, route.test.ts |
| 2 | Gap Analysis page + drill-through page | 61bca80 | gap-analysis/page.tsx, [skill]/page.tsx |

## What Was Built

**API Route (`GET /api/trainer/gap-analysis`):**
- Aggregation mode (no `skill` param): `$queryRaw` groups by `(skill, topic)`, returns `COUNT(DISTINCT associateId)` as `associatesAffected` + `AVG(weightedScore)`. Sorted by `associates_affected DESC, avg_gap_score ASC`.
- Drill-through mode (`skill` + `topic` params): returns `GapDrillThroughRow[]` with associate slug, displayName, gapScore, and last session date.
- `?cohort=<id>` scopes both modes via `AND a."cohortId" = $N` in the parameterized query.
- All user-supplied strings (skill, topic, cohortId) go through `Prisma.sql` tagged templates — no string interpolation (T-22-07, T-22-08).
- `401` guard via `getCallerIdentity()` (T-22-06).
- BigInt `COUNT` values converted with `Number()` before JSON response.
- Validates that `skill` + `topic` must both be present for drill-through; returns `400` otherwise.

**Gap Analysis page (`/trainer/gap-analysis`):**
- Replaces P21 "coming soon" placeholder with a full data table.
- 4 sortable columns: Skill (20%), Topic (40%), Associates Affected (20%), Avg Gap Score (20%).
- Default sort: Associates Affected DESC. Click header toggles direction. Active column shows `--accent` sort arrow.
- Avg Gap Score: inline colored bar — `--danger` < 50, `--warning` 50–74, `--success` 75+.
- Row click navigates to `/trainer/gap-analysis/${skill}?topic=${topic}&cohort=${id}`.
- Loading skeleton (8 rows), empty state, error state per UI-SPEC copywriting contract.
- `useSearchParams()` reads `?cohort=` param; re-fetches on param change.

**Drill-through page (`/trainer/gap-analysis/[skill]`):**
- 3-column table: Associate Name, Gap Score, Last Session.
- Back link: "← Back to Gap Analysis" in `--accent`.
- Heading: "[Skill] — [Topic]" decoded from route params + search params.
- Associate name navigates to `/trainer/[slug]` on click with hover-to-`--accent` color.
- Relative date helper: "today" / "1d ago" / "Nd ago".
- Empty state: "No associates with this gap in the selected cohort."
- Cohort-scoped via `?cohort=` forwarded through from parent navigation.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npm run test` — 447 passed, 4 skipped (12 new tests in route.test.ts)
- `npx tsc --noEmit` — clean (no output)
- `grep -q "queryRaw" src/app/api/trainer/gap-analysis/route.ts` — passes
- `grep -q "associates_affected" src/app/api/trainer/gap-analysis/route.ts` — passes
- `grep -q "GapAnalysisRow\|GapDrillThroughRow" src/app/api/trainer/gap-analysis/route.ts` — passes
- `grep -q "Gap Analysis" src/app/trainer/(dashboard)/gap-analysis/page.tsx` — passes
- `grep -q "useSearchParams" src/app/trainer/(dashboard)/gap-analysis/page.tsx` — passes
- `grep -q "Back to Gap Analysis" src/app/trainer/(dashboard)/gap-analysis/[skill]/page.tsx` — passes

## Known Stubs

None — all data flows are wired. Both pages fetch from `/api/trainer/gap-analysis` with real `$queryRaw` queries against the GapScore + Associate tables.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: auth-guard | src/app/api/trainer/gap-analysis/route.ts | getCallerIdentity() guard applied — 401 for non-trainer/admin (T-22-06) |
| threat_flag: sql-injection | skill/topic params | Prisma.sql tagged template for all user-supplied params (T-22-07) |
| threat_flag: sql-injection | cohortId param | parseInt + isInteger check + Prisma.sql parameterized (T-22-08) |

All threats from plan's threat register are mitigated.

## Self-Check: PASSED

- src/app/api/trainer/gap-analysis/route.ts — FOUND
- src/app/api/trainer/gap-analysis/route.test.ts — FOUND
- src/app/trainer/(dashboard)/gap-analysis/page.tsx — FOUND (replaced placeholder)
- src/app/trainer/(dashboard)/gap-analysis/[skill]/page.tsx — FOUND
- Commits 928e016, 61bca80 — verified in git log
