---
phase: 06-trainer-dashboard
plan: 02
subsystem: trainer-dashboard
tags: [trainer, associate-detail, recharts, gap-trends, calibration, empty-states, auth]
dependency_graph:
  requires: [06-01]
  provides: [associate-detail-page, associate-detail-api, gap-trend-chart, calibration-view, session-history-list, empty-gap-state]
  affects: [src/app/trainer/[slug]/page.tsx]
tech_stack:
  added: []
  patterns: [recharts-client-component, asymmetric-layout, session-selector-state, skill-filter-state, tabular-nums-alignment]
key_files:
  created:
    - src/app/api/trainer/[slug]/route.ts
    - src/app/trainer/[slug]/page.tsx
    - src/app/trainer/[slug]/loading.tsx
    - src/components/trainer/SessionHistoryList.tsx
    - src/components/trainer/EmptyGapState.tsx
    - src/components/trainer/GapTrendChart.tsx
    - src/components/trainer/SkillFilterDropdown.tsx
    - src/components/trainer/CalibrationView.tsx
  modified: []
decisions:
  - readinessScore remains null for all associates — no numeric score column in Associate model; status enum is sufficient for this page; unchanged from Plan 01 pattern
  - GapScore data is aggregate not per-session, so chart renders aggregate score points indexed by session count position rather than true time-series progression
  - CalibrationView filters to sessions with at least one llmScore or finalScore — avoids showing empty tables for sessions scored without override data
metrics:
  duration: ~20 minutes
  completed: "2026-04-14T01:12:05Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 8
  files_modified: 0
---

# Phase 06 Plan 02: Associate Detail Page Summary

Built the /trainer/[slug] associate detail page with JWT-cookie-auth-guarded API route, session history list, recharts gap trend chart with skill filter dropdown, AI vs trainer score calibration table, and graceful empty states for associates with fewer than 3 sessions.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create associate detail API route, page shell, session history | 2acec57 | route.ts, page.tsx, loading.tsx, SessionHistoryList.tsx, EmptyGapState.tsx |
| 2 | Build gap trend chart, skill filter, and calibration view | a5fdca3 | GapTrendChart.tsx, SkillFilterDropdown.tsx, CalibrationView.tsx, page.tsx (wired) |

## What Was Built

**Associate Detail API** (`src/app/api/trainer/[slug]/route.ts`): GET endpoint with slug validation (`/^[a-z0-9-]+$/` — T-06-04 defense-in-depth), `nlm_session` cookie auth check (T-06-05), and Prisma query including sessions (last 10, ordered by date desc), gapScores (ordered by skill+score), and session count. Returns `AssociateDetail` JSON with simplified `{ questionId, llmScore, finalScore }` assessment shape.

**Associate Detail Page** (`src/app/trainer/[slug]/page.tsx`): Client component with `useAuth()` + `useEffect` auth guard matching the exact `/dashboard` and `/trainer` pattern (D-06, T-06-02). Fetches `/api/trainer/${slug}`, handles 404 with redirect to roster, renders asymmetric layout (3fr session history / 2fr chart+calibration) with gap gate check (`gapScores.length > 0 && sessionCount >= 3`).

**SessionHistoryList** (`src/components/trainer/SessionHistoryList.tsx`): Renders session history as a table with date (formatted "Apr 13, 2026"), overall technical score, soft skill score (tabular-nums), and status badges. Empty sessions → "No sessions recorded yet" muted placeholder.

**EmptyGapState** (`src/components/trainer/EmptyGapState.tsx`): Shows "N more session(s) needed for gap analysis" (DASH-07) with "{sessionCount} of 3 minimum sessions completed" below. Py-12 centered, DESIGN.md tokens, no charts or blank panels.

**Loading Skeleton** (`src/app/trainer/[slug]/loading.tsx`): Animated pulse placeholders matching the asymmetric 3fr/2fr layout — header, session table rows, chart block, calibration rows.

**GapTrendChart** (`src/components/trainer/GapTrendChart.tsx`): `"use client"` recharts LineChart. `ResponsiveContainer width="100%" height={280}` (fixed pixel height — avoids Pitfall 6). Primary line stroke `#C85A2E` (accent). Topic secondary lines use earth tones `#2D6A4F`, `#B7791F`. CartesianGrid stroke `#DDD5C8`, axes fill `#7A7267`. Skill filter drives `selectedSkill` state. Data transformation merges skill-level and topic-level GapScore entries into unified chart array keyed by session labels S1, S2, etc.

**SkillFilterDropdown** (`src/components/trainer/SkillFilterDropdown.tsx`): `<select>` styled with DM Sans 14px, `#DDD5C8` border, 8px border-radius, JetBrains Mono 11px uppercase label.

**CalibrationView** (`src/components/trainer/CalibrationView.tsx`): `"use client"` component with session selector dropdown (defaults to most recent scored session). Renders calibration table: Question ID | AI Score (llmScore) | Trainer Score (finalScore) | Delta. Delta column: positive → `#2D6A4F` (success), negative → `#B83B2E` (danger), zero/null → `#7A7267` (muted). All score columns use `fontVariantNumeric: tabular-nums`. Hover rows use `#FFF8F0` (highlight). Filtered to sessions with at least one scored assessment.

## Deviations from Plan

None — plan executed exactly as written.

The `readinessScore: null` behavior (carried from Plan 01) is documented in that plan's SUMMARY and unchanged here. The plan's `AssociateDetail` interface includes this field and the page correctly passes it to `ReadinessDisplay` which renders `-- pending` for null scores.

## Known Stubs

None — all three sections are fully wired to real data:
- SessionHistoryList receives actual sessions from API
- GapTrendChart receives actual gapScores from API (shows EmptyGapState when < 3 sessions)
- CalibrationView receives actual sessions with assessments (shows placeholder text if no scored sessions)

## Threat Flags

No new security surface beyond the plan's threat model:
- T-06-04: Slug validation implemented (`/^[a-z0-9-]+$/` regex, returns 400 for invalid slugs)
- T-06-05: Auth check via `nlm_session` cookie before any data is returned
- T-06-06: No `dangerouslySetInnerHTML` anywhere; recharts renders SVG safely via React JSX

## Self-Check: PASSED

Files confirmed present on disk:
- src/app/api/trainer/[slug]/route.ts — FOUND
- src/app/trainer/[slug]/page.tsx — FOUND
- src/app/trainer/[slug]/loading.tsx — FOUND
- src/components/trainer/SessionHistoryList.tsx — FOUND
- src/components/trainer/EmptyGapState.tsx — FOUND
- src/components/trainer/GapTrendChart.tsx — FOUND
- src/components/trainer/SkillFilterDropdown.tsx — FOUND
- src/components/trainer/CalibrationView.tsx — FOUND

Commits confirmed in git log:
- 2acec57 — FOUND
- a5fdca3 — FOUND

TypeScript: `npx tsc --noEmit` passes with no errors.
