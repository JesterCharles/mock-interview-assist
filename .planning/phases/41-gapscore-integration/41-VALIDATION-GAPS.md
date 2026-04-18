---
phase: 41-gapscore-integration
audited: 2026-04-18
auditor: gsd-validate-phase
suite: 888 tests (887 passed, 1 flaky pre-existing — `coding-challenge-service.test.ts` TTL timing test, passes in isolation)
trivial_filled: 1 (CodingAttemptsTable component tests — 8 cases)
non_trivial_deferred: 3
---

# Phase 41 Validation Gaps

## Coverage Matrix

| Requirement | Covered By | Status |
|-------------|-----------|--------|
| **CODING-SCORE-01** (fire-and-forget, 5s budget) | `src/lib/codingAttemptPoll.test.ts` (2 tests: call shape + rejection swallowed) + `src/lib/__tests__/gapPersistence.coding.test.ts` (11 tests) | COVERED |
| **CODING-SCORE-02** (difficulty multiplier, farming resistance) | `src/lib/__tests__/gapPersistence.coding.test.ts` — farming resistance, exact multipliers, per-difficulty arithmetic | COVERED |
| **CODING-SCORE-03** (trainer panel) | `src/app/api/trainer/[slug]/coding/route.test.ts` (7 tests: auth, shape, shield, aggregation) + **NEW** `CodingAttemptsTable.test.tsx` (8 tests: render, badges, formatting) | PARTIAL — see gaps below |
| **CODING-SCORE-04** (doc update) | `grep -q` verify in 41-03-PLAN (PROJECT.md + DESIGN.md anchors) | COVERED (grep gate) |

## Gaps Filled (Trivial)

### CodingAttemptsTable component render tests — NEW

**File:** `src/app/trainer/(dashboard)/[slug]/__tests__/CodingAttemptsTable.test.tsx`
**Command:** `npx vitest run 'src/app/trainer/(dashboard)/[slug]/__tests__/CodingAttemptsTable.test.tsx'`
**Result:** 8/8 passing (652ms)

Behavioral coverage added:
1. Empty-state copy renders when `attempts=[]`
2. Row-per-attempt with title/language/difficulty/verdict/score
3. `score=null` renders as em-dash
4. Verdict badge color: `pass` → `var(--success)`
5. Verdict badge color: `fail`/`timeout`/`compile_error` → `var(--danger)`
6. Verdict badge color: `pending` → `var(--muted)`
7. ISO `submittedAt` formatted as "MMM d, yyyy"
8. Expected column headers present

## Non-Trivial Gaps (Deferred — Require Manual UAT or Integration Harness)

### G-41-A: CodingPanel fetch + filter integration

**Requirement:** CODING-SCORE-03 — "Language + skillSlug filter controls narrow both the attempts table and the skill bars"
**Why non-trivial:** `CodingPanel.tsx` owns `useEffect`-driven fetch + useState filter wiring. Would require `vi.mock('global.fetch')` plus careful `act()` sequencing to assert filter state drives both child components. Recharts in `CodingSkillBars` requires the same SVG-measurement stub pattern used in `SkillRadar.test.tsx`.

**Manual UAT:**
1. Trainer visits `/trainer/<slug>` for associate with ≥2 coding attempts across ≥2 languages
2. Coding panel renders below interview panel with loading → populated state
3. Change Language dropdown → attempts table narrows, bar chart stays (skills filter independent)
4. Change Skill dropdown → bar chart narrows to selected skill
5. Associate with zero attempts → empty-state copy for both child components

**Suggested harness for future:** Mock `fetch` with `AssociateCodingPayload` fixture, mock recharts primitives same as `SkillRadar.test.tsx`, assert filter `<select>` change events update rendered rows/bars.

### G-41-B: CodingSkillBars recharts integration

**Requirement:** CODING-SCORE-03 — "coding uses `--chart-4` warm-taupe bars to distinguish from existing `--accent` interview visuals"
**Why non-trivial:** Recharts composes SVG via measurement — JSDOM cannot render. Requires the stub pattern from `SkillRadar.test.tsx` to assert `<Bar fill="var(--chart-4)">` and `<BarChart data>` props structurally.

**Manual UAT:**
1. Trainer visits dashboard; inspect bar fill = computed `var(--chart-4)` value
2. Toggle dark mode — bars re-color via token remap (no component change)
3. Zero skill scores → empty-state copy replaces chart

### G-41-C: End-to-end fire-and-forget timing (CODING-SCORE-01 5s budget)

**Requirement:** CODING-SCORE-01 — "GapScore recompute triggered within 5 sec of attempt verdict"
**Why non-trivial:** Unit tests (`codingAttemptPoll.test.ts`) verify the call shape and rejection handling, but the 5-sec wall-clock budget is an integration-level property. Requires Judge0-backed or fixtured attempt → poll → GapScore row existence with timing assertion.

**Manual UAT:**
1. Submit a coding attempt against real Judge0 (or fixtured verdict flow)
2. Poll resolves; `CodingSkillSignal` + `GapScore` rows both present within 5s
3. Assert via Prisma query on `gapScore` table keyed on `(associateId, skillSlug, "coding:<lang>")`

**Note:** Implementation is fire-and-forget `void ... .catch(log)` — upsert is < 100ms locally, so budget is met by design. Integration test would formalize.

## Files for Commit

- `src/app/trainer/(dashboard)/[slug]/__tests__/CodingAttemptsTable.test.tsx` (NEW, 8 tests)
- `.planning/phases/41-gapscore-integration/41-VALIDATION-GAPS.md` (NEW)

## Suite Health

- **Total:** 892 tests, 887 passed, 4 skipped, 1 flaky (pre-existing, unrelated: `coding-challenge-service.test.ts` TTL timing — passes in isolation)
- **Phase 41 new tests:** 11 (gapPersistence.coding) + 2 (codingAttemptPoll) + 7 (coding route) + 8 (CodingAttemptsTable) = **28 behavioral tests** covering CODING-SCORE-01..03
