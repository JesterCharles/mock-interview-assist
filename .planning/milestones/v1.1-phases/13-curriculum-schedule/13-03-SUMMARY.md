---
phase: 13-curriculum-schedule
plan: "03"
subsystem: dashboard-wizard
tags: [dashboard, curriculum, filter, tdd, playwright, e2e, adaptive-setup]
dependency_graph:
  requires: ["13-01", "07-gap-scores", "06-adaptive-setup"]
  provides: ["curriculum-filter", "wizard-curriculum-integration"]
  affects: ["dashboard-setup-wizard", "gap-score-api"]
tech_stack:
  added: ["@playwright/test"]
  patterns: ["Set-based exact match", "Promise.all parallel fetch", "route mocking in E2E", "deferred state pattern"]
key_files:
  created:
    - src/lib/curriculumFilter.ts
    - src/lib/curriculumFilter.test.ts
    - src/components/dashboard/CurriculumFilterBadge.tsx
    - tests/e2e/setup-wizard-curriculum.spec.ts
    - tests/e2e/fixtures/seed-curriculum.ts
    - playwright.config.ts
  modified:
    - src/app/dashboard/page.tsx
    - src/lib/adaptiveSetup.ts
    - src/app/api/associates/[slug]/gap-scores/route.ts
decisions:
  - "Exact first-path-segment match via Set lookup — no substring (Codex #9)"
  - "Extended GapScoreResponse with cohortId to avoid a second API call for associate lookup"
  - "Deferred filter pattern mirrors existing pendingGapScores — applies when techs load after slug lookup"
  - "E2E specs use Playwright route mocking (not a live DB) for determinism and speed"
  - "Build verified at main repo root (worktree Turbopack env issue is not a code defect)"
metrics:
  duration_seconds: 388
  completed_date: "2026-04-14"
  tasks_completed: 3
  tasks_total: 3
  files_created: 6
  files_modified: 3
  tests_added: 19
---

# Phase 13 Plan 03: Curriculum-Filtered Setup Wizard Summary

**One-liner:** Setup wizard now filters GitHub tech list to taught curriculum skillSlugs via exact Set-based matching, composes with adaptive gap weights, and shows a filter badge — with Playwright E2E covering exact-match semantics and advisory perf.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Build curriculumFilter pure function (TDD) | 2c04146 | curriculumFilter.ts, curriculumFilter.test.ts |
| 2 | Integrate curriculum fetch + filter + badge | 67cc79b | dashboard/page.tsx, CurriculumFilterBadge.tsx, adaptiveSetup.ts, gap-scores/route.ts |
| 3 | Playwright E2E specs + advisory perf logging | 5db28a0 | setup-wizard-curriculum.spec.ts, seed-curriculum.ts, playwright.config.ts |

## What Was Built

### curriculumFilter.ts — Pure filter functions

Two exported functions with exact (case-insensitive) Set-based matching on first path segment:

- `filterTechsByCurriculum(techs, taughtSlugs)` — filters `GitHubFile[]` to those whose `path.split('/')[0].toLowerCase()` is in the taught-slugs Set. Empty slugs → returns all (D-17 fallback).
- `filterGapScoresByCurriculum(scores, taughtSlugs)` — same exact-match rule for `SkillGapScore[]`.

Key invariant: `"react"` does NOT match `"react-native/"`. Codex finding #9 closed at the filter layer.

### Dashboard integration (page.tsx)

- `handleSlugLookup` now fetches curriculum via `Promise.all` when `data.cohortId` is present (D-14).
- `filterGapScoresByCurriculum` applied before `mapGapScoresToWeights` (D-22).
- `filterTechsByCurriculum` applied to `availableTechs` after curriculum fetch (D-15).
- Deferred patterns: `pendingTaughtSlugs` mirrors existing `pendingGapScores` for when techs load after slug lookup.
- `try/catch` around curriculum fetch; on failure → `console.warn`, full tech list shown (D-17).

### GapScoreResponse extended

Added `cohortId: number | null` to `GapScoreResponse` interface and the gap-scores API route. This avoids a separate associate-lookup API call from the wizard.

### CurriculumFilterBadge component

- Renders only when `taughtWeeks.length > 0` (D-18).
- Shows "Filtered by cohort curriculum" + pill with count.
- Click expands dropdown with week list ordered by weekNumber asc.
- Display uses `skillName` (human-readable); matching uses `skillSlug` (canonical).
- DESIGN.md tokens: `--surface`, `--accent`, `--muted`, `--border`, JetBrains Mono for labels.

### E2E specs (Playwright, route-mocked)

4 specs using `page.route()` mocking — deterministic, no live DB required:

1. **No cohort** → full tech list, no badge (v1.0 regression guard)
2. **Cohort curriculum** → filters to taught slugs, badge shows count "2"
3. **Substring exclusion** (Codex #9) → `react-native` excluded when only `react` taught
4. **Advisory perf** → asserts `elapsed < 2000ms` sanity ceiling; logs actual ms. Comment in spec: `<400ms is a target not a gate (Codex #7)`.

## Deviations from Plan

### [Rule 2 - Missing Functionality] Extended GapScoreResponse with cohortId

**Found during:** Task 2
**Issue:** The plan said "look up associate's cohortId after slug validation" but there was no existing API returning cohortId — only the gap-scores API returned associate data.
**Fix:** Added `cohortId: number | null` to `GapScoreResponse` and the gap-scores route handler. Single DB round-trip vs two.
**Files modified:** `src/lib/adaptiveSetup.ts`, `src/app/api/associates/[slug]/gap-scores/route.ts`
**Commit:** 67cc79b

### [Rule 3 - Blocking Issue] Playwright not installed

**Found during:** Task 3
**Issue:** No `@playwright/test` dependency, no `playwright.config.ts`, no `tests/e2e/` directory.
**Fix:** Installed `@playwright/test`, created config, created test directory structure.
**Commit:** 5db28a0

### [Environment] Worktree Turbopack build failure

**Found during:** Task 2 verification
**Issue:** `npm run build` fails in the worktree with "Next.js inferred workspace root incorrectly" — a Turbopack limitation with git worktrees at non-standard paths.
**Resolution:** Verified TypeScript (`npx tsc --noEmit` — clean) and confirmed build succeeds at main repo root. This is an environment artifact, not a code defect.
**No code change needed.**

### [Note] Task 4 (dev server) + checkpoint:human-verify

Task 4 (start dev server) and the final checkpoint were not executed — the checkpoint is a human-verify gate requiring browser interaction. The server needs to be started manually (`npm run dev`) and the verification steps in the plan's checkpoint section should be followed.

## Known Stubs

None — filter, badge, and API integration are fully wired. The curriculum fetch uses the live `/api/cohorts/[id]/curriculum?taught=true` endpoint from Plan 13-01.

## Threat Flags

None. The curriculum fetch is guarded by the existing trainer auth cookie check on the gap-scores endpoint (which returns cohortId). The curriculum route itself is auth-guarded per 13-01.

## Self-Check: PASSED

Files created:
- src/lib/curriculumFilter.ts — FOUND
- src/lib/curriculumFilter.test.ts — FOUND
- src/components/dashboard/CurriculumFilterBadge.tsx — FOUND
- tests/e2e/setup-wizard-curriculum.spec.ts — FOUND
- tests/e2e/fixtures/seed-curriculum.ts — FOUND
- playwright.config.ts — FOUND

Files modified:
- src/app/dashboard/page.tsx — modified (imports + state + handleSlugLookup + badge render)
- src/lib/adaptiveSetup.ts — modified (cohortId in GapScoreResponse)
- src/app/api/associates/[slug]/gap-scores/route.ts — modified (returns cohortId)

Commits verified:
- 2c04146 — Task 1 (curriculumFilter)
- 67cc79b — Task 2 (wizard integration + badge)
- 5db28a0 — Task 3 (E2E specs)
