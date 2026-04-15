---
phase: 13-curriculum-schedule
verified: 2026-04-14T16:50:00Z
status: human_needed
score: 4/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Trainer curriculum UI add/edit/delete round-trip"
    expected: "Navigate to /trainer/cohorts/[id]/curriculum — empty state shows, add-week form visible. Add a week (number=1, skill=React, slug=react, tags=hooks,state, startDate=today). Row appears. Edit the row inline — change skill name, save, verify persists after refresh. Delete the row — confirm dialog appears, row removed. Visual check: warm parchment background, Clash Display headers, DM Sans body, burnt orange buttons."
    why_human: "checkpoint:human-verify was auto-approved in autonomous mode — no human browser session ever confirmed the UI round-trip against a live DB. All automated checks (build, typecheck) pass but user-visible behavior requires manual confirmation."
  - test: "Setup wizard curriculum filter end-to-end against live server"
    expected: "Associate with no cohort sees full tech list (no badge). Associate in cohort with taught curriculum sees only matching slugs. IF question bank contains both react/ and react-native/ folders, only react/ appears. Filter badge shows correct count and expands to show skill names. Adaptive weights compose on top of filtered set. Future-dated week excluded. Deleting all curriculum weeks restores full list."
    why_human: "Playwright specs use route mocking — they do not test against a real DB or real GitHub API. Live browser verification against actual data was not completed (Task 4 dev server + checkpoint:human-verify were not executed per 13-03-SUMMARY.md)."
  - test: "Parallel fetch verification"
    expected: "In DevTools Network, curriculum?taught=true and gap-scores fetches should overlap in time (not waterfall). Currently the implementation awaits gap-scores before starting the curriculum fetch — this is technically sequential."
    why_human: "The code has Promise.all wrapping only one item (curriculum), preceded by an awaited gap-scores fetch. True parallelism requires both fetches to start concurrently. Functional behavior is correct; performance posture needs human review to decide if the sequential pattern is acceptable."
---

# Phase 13: Curriculum Schedule Verification Report

**Phase Goal:** Trainers can define a weekly curriculum schedule per cohort, and the interview setup wizard auto-filters available questions to taught skills via canonical skillSlug exact match
**Verified:** 2026-04-14T16:50:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Trainer can add, edit, and delete curriculum weeks via API with required canonical skillSlug | VERIFIED | `curriculumService.ts` exports all CRUD functions with slug validation regex. API routes at `/api/cohorts/[id]/curriculum` (GET/POST) and `/api/cohorts/[id]/curriculum/[weekId]` (PATCH/DELETE) all auth-guarded, P2002→409 wired. 17 unit tests green. |
| 2 | For an associate in a cohort with curriculum, wizard pre-populates selected skills with only taught weeks matched by exact skillSlug (no substring) | VERIFIED | `curriculumFilter.ts` uses `Set.has(firstSegment)` — pure exact match. "react" does NOT match "react-native". `filterTechsByCurriculum` and `filterGapScoresByCurriculum` both exported and wired in `dashboard/page.tsx` `handleSlugLookup`. 32 unit tests (17 service + 15 filter) all pass. |
| 3 | Wizard load time <400ms is TARGET not a gate; sanity ceiling assertion is <2000ms | VERIFIED | Playwright spec 4 asserts `elapsed < 2000`, not 400. Comment in spec explicitly states "Per Codex finding #7, <400ms is a target not a gate." |
| 4 | If cohort has no curriculum or associate has no cohort, wizard behaves identically to v1.0 | VERIFIED | `dashboard/page.tsx` only fetches curriculum when `data.cohortId` is truthy. Empty `taughtSlugs` → `filterTechsByCurriculum` returns full list unchanged (D-17 fallback). Playwright spec 1 guards regression. |
| 5 | Adaptive gap-based weight pre-population composes on top of curriculum filter | VERIFIED | `filterGapScoresByCurriculum(data.scores, taughtSlugs)` called BEFORE `applyGapScores` in `handleSlugLookup` (line 269). Deferred pattern (`pendingGapScores`) preserved for async case. |

**Score:** 5/5 truths verified by static analysis and unit tests.

Note: 2 human verification items exist (UI round-trip + live wizard), so status is `human_needed`.

### Deferred Items

None.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/curriculumService.ts` | Pure DB access, skillSlug validation, getTaughtWeeks | VERIFIED | 163 lines. Exports `listWeeks`, `getTaughtWeeks`, `createWeek`, `updateWeek`, `deleteWeek`. SLUG_REGEX enforced. P2002 not caught (propagates to route). |
| `src/lib/curriculumService.test.ts` | 17+ tests covering slug validation, boundary, P2002 | VERIFIED | 17 tests, all passing. Covers missing slug, non-kebab slug, uppercase slug, leading hyphen, missing skillName, weekNumber < 1, valid create, P2002 propagation. |
| `src/app/api/cohorts/[id]/curriculum/route.ts` | GET list + POST create, ?taught=true filter, 409 on P2002 | VERIFIED | 151 lines. GET branches on `?taught=true`. POST has Zod schema requiring skillSlug with regex. `isPrismaError('P2002')` → 409. Auth-guarded. |
| `src/app/api/cohorts/[id]/curriculum/[weekId]/route.ts` | PATCH update + DELETE, cross-cohort guard, 409 | VERIFIED | 182 lines. Both verify `existing.cohortId !== cohortId`. PATCH maps P2002 → 409. DELETE returns 204. Auth-guarded. |
| `src/components/trainer/CurriculumTable.tsx` | Sortable table, fetches on mount, refresh signal | VERIFIED | 127 lines. Fetches `GET /api/cohorts/{cohortId}/curriculum` on mount and on `refreshSignal` change. Loading/error/empty states handled. Renders `CurriculumWeekRow` per row. |
| `src/components/trainer/CurriculumWeekRow.tsx` | Display + edit modes, PATCH/DELETE wired | VERIFIED | 329 lines. Two modes (display/edit). Save calls PATCH, Cancel reverts. Delete calls `window.confirm` then DELETE. Inline error display. |
| `src/components/trainer/AddCurriculumWeekForm.tsx` | Inline add form, all 5 fields, POST wired | VERIFIED | 359 lines. 5 fields: weekNumber, skillName, skillSlug, topicTags, startDate. Auto-generates slug from skillName. Client-side validation. POSTs to `/api/cohorts/{cohortId}/curriculum`. |
| `src/app/trainer/cohorts/[id]/curriculum/page.tsx` | Server-rendered page, reads cohort from Prisma | VERIFIED | 113 lines. Auth-guarded server component. Reads cohort from Prisma. Renders `CurriculumManager`. `force-dynamic`. |
| `src/lib/curriculumFilter.ts` | Pure filter, exact Set-based match, empty slug fallback | VERIFIED | 66 lines. `filterTechsByCurriculum` and `filterGapScoresByCurriculum`. Uses `Set.has(firstSegment())` — exact match, not `.includes()`. Empty slugs → return all. |
| `src/lib/curriculumFilter.test.ts` | Tests including react vs react-native exclusion | VERIFIED | 15 tests covering positive, negative (react-native excluded), empty input, case-insensitive, multi-slug, empty techs. All passing. |
| `src/components/dashboard/CurriculumFilterBadge.tsx` | Badge with count, dropdown with skillName, hidden when empty | VERIFIED | 105 lines. Returns null when `taughtWeeks.length === 0`. Shows pill count. Click expands dropdown. Uses `skillName` for display. `data-testid` attributes for E2E. |
| `tests/e2e/setup-wizard-curriculum.spec.ts` | 4 Playwright specs: no-cohort, filter, substring exclusion, perf | VERIFIED | 264 lines. 4 specs using route mocking. Spec 3 specifically tests react-native exclusion. Spec 4 asserts `< 2000ms` with advisory comment. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `route.ts` (collection) | `prisma.curriculumWeek` | `listWeeks`/`getTaughtWeeks`/`createWeek` imports | WIRED | Service functions imported and called. Cohort existence verified before query. |
| `route.ts` ([weekId]) | `prisma.curriculumWeek` | `updateWeek`/`deleteWeek` imports | WIRED | Cross-cohort guard fetches week, verifies `cohortId` match before mutation. |
| `CurriculumTable.tsx` | `/api/cohorts/{cohortId}/curriculum` | `fetch` on mount + refreshSignal | WIRED | `fetchWeeks()` called in `useCallback`, triggered by `useEffect([fetchWeeks, refreshSignal])`. |
| `CurriculumWeekRow.tsx` | `/api/cohorts/{cohortId}/curriculum/{weekId}` | PATCH on Save, DELETE on confirm | WIRED | `handleSave` → PATCH, `handleDelete` → `window.confirm` then DELETE. Response handled. |
| `AddCurriculumWeekForm.tsx` | `/api/cohorts/{cohortId}/curriculum` | POST on submit | WIRED | `handleSubmit` → `fetch POST`. On success calls `onWeekAdded()` and resets form. |
| `dashboard/page.tsx` | `/api/cohorts/{cohortId}/curriculum?taught=true` | `fetch` in `handleSlugLookup` when `data.cohortId` present | WIRED | Fetch present. NOTE: sequential, not parallel with gap-scores fetch (see Anti-Patterns). |
| `dashboard/page.tsx` | `filterTechsByCurriculum` | Called with `taughtSlugs` derived from `w.skillSlug` | WIRED | Line 126: `applyCurriculumFilter` calls `filterTechsByCurriculum(files, taughtSlugs)`. Slugs extracted from `weeks.map(w => w.skillSlug)` — NOT `skillName`. |
| `dashboard/page.tsx` | `filterGapScoresByCurriculum` | Called before `mapGapScoresToWeights` | WIRED | Line 269-271: `filterGapScoresByCurriculum(data.scores, taughtSlugs)` before `applyGapScores`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `CurriculumTable.tsx` | `weeks` state | `GET /api/cohorts/{id}/curriculum` → `listWeeks` → `prisma.curriculumWeek.findMany` | Yes — real DB query | FLOWING |
| `dashboard/page.tsx` | `availableTechs` (post-filter) | `filterTechsByCurriculum(githubFiles, taughtSlugs)` where `taughtSlugs` from curriculum API | Yes — real taught slugs from DB | FLOWING |
| `CurriculumFilterBadge.tsx` | `taughtWeeks` prop | Set from `handleSlugLookup` → curriculum fetch response | Yes — from API | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Unit tests (17 service + 15 filter = 32) | `npm run test -- src/lib/curriculumService.test.ts src/lib/curriculumFilter.test.ts` | 32 tests passed in 121ms | PASS |
| TypeScript type check | `npx tsc --noEmit` | Clean (no output) | PASS |
| ESLint on phase 13 src files | `npx eslint src/lib/curriculumService.ts src/lib/curriculumFilter.ts src/components/trainer/CurriculumTable.tsx src/components/trainer/CurriculumWeekRow.tsx src/components/trainer/AddCurriculumWeekForm.tsx src/components/dashboard/CurriculumFilterBadge.tsx` | Clean (no output) | PASS |
| ESLint on dashboard/page.tsx | `npx eslint src/app/dashboard/page.tsx` | 3 warnings (unused vars — pre-existing), 0 errors | PASS |
| Playwright E2E | Not run (requires live server + APP_PASSWORD) | SKIP | ? SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CURRIC-01 | 13-01, 13-02 | Trainer can define curriculum weeks per cohort via trainer UI. CurriculumWeek fields: cohort FK, week number, skill name, topic tags, start date. | SATISFIED | API (4 endpoints), service layer (5 functions), trainer UI (CurriculumTable, CurriculumWeekRow, AddCurriculumWeekForm, page). Human UI verification pending. |
| CURRIC-02 | 13-03 | Interview setup auto-filters available questions to skills from taught curriculum weeks (startDate <= today). Adaptive weights still apply on top. | SATISFIED | `curriculumFilter.ts` exact-match filter wired in `dashboard/page.tsx`. `filterGapScoresByCurriculum` called before `mapGapScoresToWeights`. Human wizard verification pending. |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/app/dashboard/page.tsx` line 237 | `Promise.all([fetch(curriculum)])` wraps only one item — curriculum fetch is sequential after gap-scores await, not truly parallel | Warning | Performance: wizard makes two sequential network calls when cohortId present instead of one parallel Promise.all. Functionality is correct. Plan said "fetched in parallel" but implementation is sequential. |

### Human Verification Required

#### 1. Trainer Curriculum UI — Add/Edit/Delete Round-Trip

**Test:** Log in as trainer. Navigate to `/trainer/cohorts/[id]/curriculum` (using a real cohort ID from Phase 11). Verify:
1. Empty state: "No curriculum weeks yet. Add one below." is visible
2. Add-week form shows 5 fields (week #, skill name, skill slug, topic tags, start date)
3. Add Week 1 (React, react, hooks+state, today) — row appears in table
4. Click Edit on the row — inline fields appear, edit skill name, click Save — verify persists after page refresh
5. Delete the row — confirm dialog appears with week info, click OK — row removed
6. Add a future-dated week (next week) — row appears in table (future weeks are visible to trainer)

**Expected:** All above operations work against live DB.

**Why human:** `checkpoint:human-verify` in 13-02 plan was auto-approved in autonomous execution mode. No human ever confirmed the UI against a real DB. Build is green and typecheck passes but live functional behavior unconfirmed.

---

#### 2. Setup Wizard Curriculum Filter — Live Browser Test

**Test:** Log in as trainer. Visit `/dashboard`. Perform the following:
1. Enter an associate slug with NO cohort — full tech list visible, no filter badge
2. Enter an associate slug in a cohort that has curriculum weeks with taught skillSlugs — verify tech list narrows to only taught slugs
3. If question bank has both `react/` and `react-native/` folders: only `react/` should appear when `react` is taught (exact match)
4. Filter badge shows correct count; click expands dropdown showing skill names (not slugs)
5. Adaptive weights compose on the filtered set (correct pre-population)
6. Add a future-dated week to the curriculum, reload wizard — that week's skill not in filtered list
7. Delete all curriculum weeks, reload wizard — full tech list returns

**Expected:** All above behaviors work.

**Why human:** Playwright specs (spec 1-4) use `page.route()` mocking — they do NOT test against a live DB or real GitHub API. The live integration was not verified (Task 4 dev server + `checkpoint:human-verify` in 13-03 not executed per SUMMARY).

---

#### 3. Parallel Fetch Decision

**Test:** Open DevTools Network tab. Enter an associate slug with a cohort in the wizard. Observe whether gap-scores and curriculum requests fire simultaneously or in waterfall.

**Expected:** Plan intended parallel fetch. Current code is sequential (gap-scores → await → curriculum). Trainer/developer should decide if the sequential pattern is acceptable or needs to be refactored to true `Promise.all([gapScores, curriculum])`.

**Why human:** This is a design intent question. Functionality is correct; only the performance posture differs from the plan spec.

### Gaps Summary

No hard gaps — all 5 observable truths are verified by code analysis and unit tests. Three human verification items remain for browser/live-DB confirmation:

1. Trainer curriculum UI live round-trip (CURRIC-01 UI surface)
2. Setup wizard live integration (CURRIC-02 end-to-end)
3. Parallel vs sequential fetch decision (advisory)

These are standard `checkpoint:human-verify` items that were auto-approved in autonomous mode. The codebase is functionally complete; human confirmation is needed to close the phase.

---

_Verified: 2026-04-14T16:50:00Z_
_Verifier: Claude (gsd-verifier)_
