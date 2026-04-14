---
phase: 07-adaptive-setup
plan: "02"
subsystem: adaptive-setup
tags: [adaptive-setup, dashboard, gap-scores, pre-population, zustand, ux]
dependency_graph:
  requires:
    - 07-01 (GapScoreResponse types and mapGapScoresToWeights utility)
    - 03-associate-profiles (associateSlug local state in dashboard)
    - 04-gap-service (GapScore table populated by session scoring)
  provides:
    - Adaptive pre-population of wizard Phase 1 from associate gap history
    - "auto" badge on pre-populated tech weights (disappears on trainer override)
    - Cold-start fallback: associates with < 3 sessions see unchanged manual wizard
  affects:
    - src/app/dashboard/page.tsx (sole modified file)
tech_stack:
  added: []
  patterns:
    - useCallback + useEffect deferred application pattern for async pre-population
    - Set<string> local state for ephemeral auto-badge tracking
    - encodeURIComponent on client-side fetch URL (threat T-07-05)
key_files:
  created: []
  modified:
    - src/app/dashboard/page.tsx
decisions:
  - "Slug input added to top of Phase 1 (tech selection) — not Phase 3 — so trainer sees pre-population at the moment they choose techs"
  - "associateSlug local state shared between Phase 1 slug input and Phase 2 Associate ID field — no double-entry per Research Pitfall 3"
  - "prePopulatedPaths is purely local ephemeral state — no Zustand persistence needed since badge is display-only"
metrics:
  duration: ~15 minutes
  completed: "2026-04-14T03:00:00Z"
  tasks_completed: 1
  tasks_total: 2
  files_created: 0
  files_modified: 1
---

# Phase 07 Plan 02: Adaptive Pre-Population in Dashboard Setup Wizard Summary

**One-liner:** Adaptive slug-triggered pre-population of wizard Phase 1 tech selection with inverted gap-score weights and ephemeral "auto" badge tracking.

**Status:** Task 1 complete. Awaiting human verification (Task 2 — checkpoint).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add adaptive pre-population to dashboard setup wizard | 9608a5e | src/app/dashboard/page.tsx |

## Task 2 (Checkpoint — Awaiting Verification)

| Task | Name | Status |
|------|------|--------|
| 2 | Verify adaptive setup wizard behavior | Awaiting human verification |

## What Was Built

### Task 1: Adaptive Pre-Population

Modified `src/app/dashboard/page.tsx` to wire gap score pre-population into the setup wizard:

**New imports:**
- `mapGapScoresToWeights` and `GapScoreResponse` from `@/lib/adaptiveSetup` (Plan 01 output)

**New local state:**
- `isLoadingGapScores` — shows Loader2 spinner during fetch
- `prePopulatedPaths: Set<string>` — tracks which tech paths were auto-filled (for "auto" badge)
- `pendingGapScores` — defers gap score application until `availableTechs` loads

**New functions:**
- `applyGapScores(scores)` — maps gap scores to weights, filters `availableTechs` by matching paths, calls `setSelectedTechs` + `setTechWeight`, populates `prePopulatedPaths`
- `handleSlugLookup(slug)` — async onBlur handler: fetches `/api/associates/[slug]/gap-scores`, applies cold-start guard (< 3 sessions = manual mode), defers if techs not loaded
- `handleWeightChange(path, weight)` — wraps `setTechWeight` and removes path from `prePopulatedPaths` (clears "auto" badge on manual override)

**New useEffect:**
- Deferred application: fires when `pendingGapScores` is set and `availableTechs` later populates

**UI additions in renderPhase1():**
- "Associate Slug" compact input at the TOP of Phase 1, before Assessment Focus section
- `onBlur` triggers `handleSlugLookup`
- Loader2 spinner inline during fetch (non-blocking)
- Counter text when pre-populated paths > 0: "N technologies pre-selected from gap history"
- "auto" label (12px, `--muted` color) next to weight buttons for each pre-populated tech
- Weight range slider and buttons replaced with `handleWeightChange` calls

**Shared slug state:**
The `associateSlug` local state introduced in Phase 3 (Associate ID in Phase 2) is reused by the Phase 1 slug input — trainer types slug once in Phase 1 and it carries over to Phase 2 for session attribution. No double-entry required.

## Deviations from Plan

None. Plan executed exactly as written. The only adaptation was reusing the existing `associateSlug` local state (introduced in Phase 3 work) rather than creating a duplicate, which is consistent with Research Pitfall 3 guidance and the plan's instruction to share state.

## Known Stubs

None. The pre-population logic is fully implemented and wired. It will silently fall back to manual mode until Phase 4 GapScore data is populated in the database — this is correct per D-04 (cold-start fallback), not a stub.

## Threat Surface

Threats mitigated per plan's threat model:
- T-07-05: `encodeURIComponent(trimmed)` applied on slug before fetch URL construction
- T-07-06: Accepted — gap scores are non-sensitive skill ratings, accessible only to authenticated trainers
- T-07-07: Accepted — onBlur-only trigger limits request frequency; existing app rate limiting covers the rest

## Self-Check

- [x] `src/app/dashboard/page.tsx` modified with all required symbols
- [x] `grep "handleSlugLookup"` — present at lines 172, 265
- [x] `grep "mapGapScoresToWeights"` — present at lines 17, 162
- [x] `grep "prePopulatedPaths"` — present at lines 66, 167, 168, 199-205, 273-276, 449-452
- [x] `grep "pendingGapScores"` — present at lines 67, 182, 193-195
- [x] `grep "handleWeightChange"` — present at lines 199, 432, 439
- [x] `grep "auto"` — present at lines 449-452 (badge render)
- [x] `grep "onBlur"` — present at line 265 (slug input)
- [x] `grep "Associate Slug"` — present at line 258
- [x] TypeScript: clean (`npx tsc --noEmit --skipLibCheck` — no errors)
- [x] Commit 9608a5e verified in git log

## Self-Check: PASSED
