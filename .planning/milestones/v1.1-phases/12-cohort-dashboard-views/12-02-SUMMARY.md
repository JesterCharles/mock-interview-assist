---
phase: 12-cohort-dashboard-views
plan: 02
subsystem: trainer-dashboard-ui
tags: [ui, cohort, roster, readiness, trainer-dashboard]
requires:
  - GET /api/trainer?cohortId=<int>&includeSummary=true (Phase 12-01)
  - GET /api/cohorts (Phase 11)
  - CohortSummary, RosterResponse (src/lib/trainer-types.ts, Phase 12-01)
provides:
  - CohortFilterBar component (dropdown with "All Associates" default)
  - CohortSummaryBar component (Ready/Improving/Not Ready pills)
  - Stateful cohort filtering on /trainer roster page
affects:
  - /trainer page (visual + behavioral change)
tech-stack:
  added: []
  patterns:
    - Opt-in opt-out response parsing (Array.isArray branch handles both v1.0 raw array and RosterResponse shape)
    - Silent degrade on /api/cohorts 404 (dropdown still functional with just "All Associates")
    - Client-only components with inline-style DESIGN.md tokens (no new CSS module)
key-files:
  created:
    - src/components/trainer/CohortFilterBar.tsx
    - src/components/trainer/CohortSummaryBar.tsx
  modified:
    - src/app/trainer/page.tsx
decisions:
  - Native `<select>` for cohort dropdown (plan: "Claude's discretion — minimal scope")
  - Cohort id cast to string at the UI boundary (select value is always string); URL param retains the string value so the API receives a numeric-parseable string
  - Sort cohorts client-side by startDate desc (D-03) — API returns them that way but we re-sort defensively
  - Silent degrade (not error) on /api/cohorts 404 — dropdown still offers "All Associates"
  - Improving pill uses burnt orange (--accent #C85A2E) to match RosterTable's .readiness-improving class, not a separate warning tone
metrics:
  duration: ~10m
  completed: 2026-04-14
  tasks: 3
  tests_added: 0
---

# Phase 12 Plan 02: Cohort Filter + Summary Bar Summary

Delivers the user-facing surface for COHORT-03 (cohort filter dropdown) and COHORT-04 (aggregate readiness summary) on `/trainer`. Adds two new client components and wires them into the existing trainer page without touching `RosterTable` internals.

## What Shipped

### Components

**`src/components/trainer/CohortFilterBar.tsx`** (75 lines)
- Client component, native `<select>` element.
- Props: `{ cohorts, selectedCohortId, onChange }`.
- First option always pinned: `<option value="all">All Associates</option>` (D-02).
- DESIGN.md tokens inline: DM Sans body, JetBrains Mono uppercase label, #FFFFFF surface on #DDD5C8 border, burnt orange (#C85A2E) focus ring with 3px 15%-opacity glow.
- Layout: 11px uppercase "COHORT" label + 240px-min-width select, 12px gap, 24px bottom margin.

**`src/components/trainer/CohortSummaryBar.tsx`** (97 lines)
- Client component, renders three readiness pills horizontally.
- Props: `{ summary: CohortSummary }` — imported from `@/lib/trainer-types`.
- Ready pill: `#2D6A4F` on `#E8F5EE`. Improving pill: `#C85A2E` on `#FFF1E6` (matches RosterTable `.readiness-improving`). Not Ready pill: `#B83B2E` on `#FDECEB`.
- Label in DM Sans 600 uppercase + count in Clash Display 600 tabular-nums (per DESIGN.md "readiness as typography" pattern).
- Container: white surface, 1px #DDD5C8 border, 12px radius — reads as a "scoreboard" card.
- Caller is responsible for conditional render (D-04): component always renders when mounted.

### Page wiring (`src/app/trainer/page.tsx`)

- New state: `cohorts`, `selectedCohortId` (default `'all'`), `summary`.
- New effect: one-time `/api/cohorts` fetch after auth, sorted by startDate desc, silent degrade on non-OK response.
- Updated roster effect: dependency now includes `selectedCohortId`; URL is `/api/trainer` for "all" or `/api/trainer?cohortId=<id>&includeSummary=true` when filtered.
- Response parser handles both shapes: `Array.isArray(raw)` → v1.0 raw roster array (summary cleared); else `RosterResponse` → `{ associates, summary }`.
- Render order: nav → title → `<CohortFilterBar>` → `{summary && <CohortSummaryBar>}` → loading/error/`<RosterTable>`.
- `RosterTable` not touched — sort and search behavior preserved (D-10).

## Requirements Satisfied

- **COHORT-03** (frontend): cohort dropdown filters the trainer roster.
- **COHORT-04** (frontend): aggregate readiness summary visible when a specific cohort is selected; hidden under "All Associates".

## Verification

- `npx tsc --noEmit` → clean.
- `npm run build` → builds cleanly, `/trainer` present as a static page.
- `npm run lint` → no new errors introduced by these files (repo has pre-existing lint noise unrelated to this plan).
- Dev server running at http://localhost:3000 (PID 65568, pre-existing); `/trainer` returns 307 (auth redirect) as expected.

## Acceptance Criteria

- [x] CohortFilterBar.tsx contains "All Associates" string and `<option value="all">`
- [x] CohortFilterBar.tsx accepts onChange prop and calls it with the new cohortId
- [x] CohortSummaryBar.tsx contains "Ready", "Improving", "Not Ready" labels
- [x] CohortSummaryBar.tsx imports CohortSummary type from @/lib/trainer-types
- [x] page.tsx contains "selectedCohortId" state
- [x] page.tsx useState initialized to 'all'
- [x] page.tsx fetch URL includes cohortId param when selectedCohortId !== 'all'
- [x] page.tsx renders CohortFilterBar and conditionally renders CohortSummaryBar (summary && ...)
- [x] page.tsx parses RosterResponse (data.associates, data.summary) — also handles raw array for v1.0 "All" path
- [x] RosterTable component file is unchanged (no modifications in commit diffs)

## Backward Compatibility Notes

- "All Associates" selection preserves v1.0 behavior: calls `/api/trainer` with no params, receives raw `RosterAssociate[]`, shows ALL associates including those with no cohort (D-02).
- Summary bar is hidden under "All Associates" (D-04).
- Existing RosterTable sort + search work unchanged on the filtered list (D-10).
- Auth guard, skeleton loading, and error states from the prior implementation preserved.

## Deviations from Plan

None material. One minor clarification noted below.

### Clarifications

**Cohort id is stringified at UI boundary**
- The `/api/cohorts` response returns `id: number` (CohortDTO). The `<select>` value must be a string, and the query param to `/api/trainer?cohortId=` is also a string (the API already parses with `Number.parseInt`). Stringifying at the boundary (`String(c.id)`) keeps the component props cleanly typed as `{ id: string; name: string }` per the plan's spec and avoids double-conversion.

## Commits

- `baad991` feat(12-02): add CohortFilterBar and CohortSummaryBar components
- `28fd917` feat(12-02): wire cohort filter + summary bar on /trainer page

## Checkpoint Status

Plan includes a `checkpoint:human-verify` for visual QA on `/trainer`. Dev server is running at http://localhost:3000 — orchestrator / user can verify:

1. Default state: "All Associates" selected, no summary bar, full roster.
2. Select a cohort → roster filters, summary pills appear with matching counts.
3. Switch back to "All Associates" → summary hidden, full roster restored.
4. Search/sort still function on filtered list.
5. Styling matches DESIGN.md tokens.

Automated verification (build, typecheck, lint) passed. Visual checkpoint deferred to post-execution review per parallel-wave execution pattern.

## Self-Check: PASSED

- src/components/trainer/CohortFilterBar.tsx — FOUND (77 lines, contains "All Associates" + `<option value="all">`)
- src/components/trainer/CohortSummaryBar.tsx — FOUND (98 lines, contains "Ready"/"Improving"/"Not Ready" + imports CohortSummary)
- src/app/trainer/page.tsx — MODIFIED (contains selectedCohortId, useState('all'), cohortId URL param, CohortFilterBar + CohortSummaryBar render)
- Commits `baad991`, `28fd917` — both FOUND on HEAD
