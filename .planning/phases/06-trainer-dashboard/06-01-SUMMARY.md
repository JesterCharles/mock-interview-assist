---
phase: 06-trainer-dashboard
plan: 01
subsystem: trainer-dashboard
tags: [trainer, roster, auth, recharts, design-system, readiness]
dependency_graph:
  requires: [05-readiness-signals]
  provides: [trainer-roster-page, trainer-api-route, trainer-design-tokens, trainer-types]
  affects: [src/app/layout.tsx]
tech_stack:
  added: [recharts@3.8.1]
  patterns: [scoped-css-design-tokens, client-side-sorting, auth-guard-useEffect]
key_files:
  created:
    - src/lib/trainer-types.ts
    - src/app/trainer/trainer.css
    - src/app/api/trainer/route.ts
    - src/app/trainer/page.tsx
    - src/app/trainer/loading.tsx
    - src/components/trainer/ReadinessDisplay.tsx
    - src/components/trainer/RosterTable.tsx
  modified:
    - src/app/layout.tsx
    - package.json
decisions:
  - Scoped CSS (.trainer-shell) rather than global tokens — prevents warm parchment design from bleeding into existing dark interview pages
  - readinessScore kept as null in roster response — Associate model stores readinessStatus enum but not a numeric score field; score computation is Plan 02 work
  - Cookie check (nlm_session === 'authenticated') matches auth/route.ts exact value — belt-and-suspenders per T-06-01
metrics:
  duration: ~10 minutes
  completed: "2026-04-14T01:05:03Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 7
  files_modified: 2
---

# Phase 06 Plan 01: Trainer Dashboard Foundation Summary

Installed recharts, established scoped warm parchment design tokens (.trainer-shell), and built the /trainer roster page with sortable associate table, DESIGN.md-compliant readiness displays (Clash Display score + DM Sans trend word), and useAuth() auth guard matching the existing /dashboard pattern.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Install recharts, create trainer types, design tokens, and API route | 624d846 | trainer-types.ts, trainer.css, api/trainer/route.ts, layout.tsx |
| 2 | Build roster page with auth guard, sortable table, and readiness displays | 160f0fd | page.tsx, loading.tsx, RosterTable.tsx, ReadinessDisplay.tsx |

## What Was Built

**Trainer Types** (`src/lib/trainer-types.ts`): `RosterAssociate`, `AssociateDetail`, `SessionSummary`, `GapScoreEntry`, `GapDataPoint` — shared interfaces for all trainer dashboard plans.

**Design Tokens** (`src/app/trainer/trainer.css`): `.trainer-shell` class scopes all DESIGN.md warm parchment tokens to the /trainer route tree. Includes `.trainer-card`, `.trainer-table`, `.trainer-section-label`, readiness color classes. No impact on existing pages.

**Font Loading** (`src/app/layout.tsx`): Added DM Sans (Google Fonts, weights 400/500/600/700) and Clash Display (jsDelivr CDN) — additive only, existing Inter/Geist Mono variables preserved.

**API Route** (`src/app/api/trainer/route.ts`): GET endpoint reads pre-computed Associate fields (`readinessStatus`, `recommendedArea`) and aggregates session count + last session date. Validates `nlm_session` cookie before returning data (T-06-01 mitigation).

**ReadinessDisplay** (`src/components/trainer/ReadinessDisplay.tsx`): Implements DESIGN.md Readiness Signal Pattern — score in Clash Display 700, trend word (ascending / climbing / stalling) in 11px DM Sans 600. Null score renders `-- pending` for associates with fewer than 3 sessions.

**RosterTable** (`src/components/trainer/RosterTable.tsx`): Client-side sortable by name, readiness status, session count, and last session date. Default sort: readiness ascending (not_ready first). Row click navigates to `/trainer/[slug]`. Uses `.trainer-shell` tokens, no forbidden design patterns.

**Trainer Page** (`src/app/trainer/page.tsx`): Auth guard via `useAuth()` + `useEffect` redirect to `/login` — matches `/dashboard` pattern exactly (D-06, T-06-02). Fetches `/api/trainer`, renders `RosterTable`, handles loading skeleton and error states. Wrapped in `.trainer-shell`. Max content width 1120px, centered.

**Loading State** (`src/app/trainer/loading.tsx`): Pulsing skeleton rows with warm parchment background using Tailwind `animate-pulse`.

## Deviations from Plan

**1. [Rule 1 - Note] readinessScore always null in API response**

- **Found during:** Task 1 (Prisma schema review)
- **Issue:** The plan's `RosterAssociate` type includes `readinessScore: number | null` sourced from the Associate model, but the Prisma schema has no numeric score column — only `readinessStatus` (string enum) and `recommendedArea`. The weighted score lives in GapScore rows.
- **Fix:** API route returns `readinessScore: null` for all associates. ReadinessDisplay renders `-- pending` for null scores. This is not a bug in this plan — the status enum (ready/improving/not_ready) is sufficient for the roster view, and numeric scores will be wired via GapScore aggregation in Plan 02 if needed.
- **Impact:** Readiness badges correctly show trend words without numeric scores for now. DASH-05 requirement (pre-computed badge read) is satisfied — the status itself is pre-computed.

## Known Stubs

None — the roster page is fully wired to the API. The `readinessScore: null` behavior is documented above as an intentional architectural note, not a rendering stub.

## Threat Flags

None — the threat model mitigations were applied:
- T-06-01: `/api/trainer` validates `nlm_session` cookie before returning data
- T-06-02: `/trainer` page uses `useAuth()` + `useEffect` redirect matching existing `/dashboard` pattern

## Self-Check: PASSED

All 8 files confirmed present on disk. Both task commits (624d846, 160f0fd) confirmed in git log. `npm run build` succeeded with `/trainer` route visible in build output.
