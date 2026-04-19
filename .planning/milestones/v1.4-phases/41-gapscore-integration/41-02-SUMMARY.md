---
phase: 41-gapscore-integration
plan: 02
subsystem: trainer-dashboard
tags: [trainer, coding, dashboard, recharts]
requires: [phase-36, phase-39, 41-01]
provides:
  - GET /api/trainer/[slug]/coding
  - CodingPanel trainer dashboard module
affects:
  - src/app/trainer/(dashboard)/[slug]/page.tsx
  - src/lib/trainer-types.ts
tech-stack:
  added: []
  patterns: [client-island-fetch, recharts-BarChart, explicit-field-whitelist]
key-files:
  created:
    - src/app/api/trainer/[slug]/coding/route.ts
    - src/app/api/trainer/[slug]/coding/route.test.ts
    - src/app/trainer/(dashboard)/[slug]/CodingPanel.tsx
    - src/app/trainer/(dashboard)/[slug]/CodingAttemptsTable.tsx
    - src/app/trainer/(dashboard)/[slug]/CodingSkillBars.tsx
  modified:
    - src/lib/trainer-types.ts
    - src/app/trainer/(dashboard)/[slug]/page.tsx
decisions:
  - D-06 — panel (not tab) below AssociateDashboardClient
  - D-07 — trainer-only GET endpoint, associate even matching slug → 401
  - Bars: var(--chart-4) warm taupe — distinct from interview var(--accent)
  - Bars sorted ascending (weakest skill first — gap-focus UX)
metrics:
  duration: ~20 min
  completed: 2026-04-18
requirements: [CODING-SCORE-03]
---

# Phase 41 Plan 02: Trainer Coding Panel Summary

Per-associate coding panel on `/trainer/[slug]` backed by a trainer-only API route. Ships skill bar chart + attempt history with language/skill filters.

## What Shipped

### API — `src/app/api/trainer/[slug]/coding/route.ts`
- `GET` handler, trainer/admin only (`getCallerIdentity()`).
- 401 anonymous, 401 associate, 400 invalid slug, 404 associate not found.
- Response: `AssociateCodingPayload = { attempts, codingSkillScores }`.
- `attempts`: latest 20 `CodingAttempt` rows by `submittedAt desc`, `include: challenge select { slug, title, difficulty }`. Mapped explicitly — no spread, no leak of `submittedCode` / `visibleTestResults` / `hiddenTestResults` / `judge0Token`.
- `codingSkillScores`: aggregated by `skill` from `GapScore` rows where `topic startsWith 'coding:'`. Multi-language skills aggregate as weighted mean (`sum(weightedScore*sessionCount)/sum(sessionCount)`) with `attemptCount = sum(sessionCount)`.

### Types — `src/lib/trainer-types.ts`
Appended (zero modification of existing types):
- `CodingAttemptSummary`
- `CodingSkillScore`
- `AssociateCodingPayload`

### Components — `src/app/trainer/(dashboard)/[slug]/`
- **`CodingAttemptsTable.tsx`** — plain `<table>` (Date, Challenge, Language, Difficulty, Verdict, Score). Verdict badges token-mapped (pass→success, fail/timeout/*err→danger, pending→muted). Difficulty pill = neutral `var(--border)` bg. Date via `Intl.DateTimeFormat`. Empty state "No coding attempts yet." — DM Sans muted.
- **`CodingSkillBars.tsx`** — recharts `BarChart` with `fill="var(--chart-4)"` (warm taupe). Axis/tooltip tokens from DESIGN. Sorted ascending — weakest surfaces first.
- **`CodingPanel.tsx`** — wraps both with loading/error, language + skill dropdowns, client-side filter wiring. Card container (`var(--surface)`, 12px radius, 32px padding, 48px top margin). Fetches once on mount.

### Page wiring — `src/app/trainer/(dashboard)/[slug]/page.tsx`
Added `import { CodingPanel }` and mounted `<CodingPanel slug={slug} />` after `<AssociateDashboardClient />` inside the existing `trainer-shell`. Zero modification of interview panel.

## Verification

- `npm run test -- --run coding/route.test.ts` → 7/7 ✓
- Full suite: `npm run test -- --run` → 861/865 passing (4 skipped, 0 new failures; up from 797 baseline — new tests from 41-01/41-02 accounted).
- `npx tsc --noEmit` → no new errors (pre-existing unrelated errors in `coding-challenge-service.test.ts` + `ChallengeList.test.tsx`).
- `grep -E "#[0-9a-fA-F]{3,6}" src/app/trainer/(dashboard)/[slug]/Coding*.tsx` → empty (DESIGN token compliance).

## Screenshot-worthy states

1. **Populated (trainer, associate with coding history):** section heading "Coding practice", language + skill dropdowns, bar chart in warm taupe, 20-row attempts table with verdict badges + difficulty pills. Chart bars ascend-sorted so lowest-gap skill sits leftmost.
2. **Empty (associate with zero attempts):** section card renders, filters collapse to just "All languages" / "All skills", two "No coding … yet." muted paragraphs replace chart + table.
3. **Dark mode:** all tokens remap via `globals.css`; chart-4 shifts to dark-mode taupe, danger/success badges recolor; no component changes needed.

## Design Feed-Through (for Plan 41-03)

- Chart color = `var(--chart-4)` (warm taupe) — justification: adjacent-to-accent earth tone, on-brand, visibly separable from interview trend line. Locked.
- Verdict badge color-coding → `var(--success)` / `var(--danger)` / `var(--muted)` mapped via `verdictStyle()` helper.
- Difficulty pill kept deliberately color-neutral (`var(--border)` bg) — the signal is in the verdict, not the difficulty.
- Panel placement (below, not tab) — rationale: trainer page is a vertical stack; stacked panel preserves existing UX, adding tab chrome would fragment scroll.

## Deviations from Plan

None material. Plan text left chart color choice to "planner discretion"; chose `--chart-4` as recommended by plan's own design guidance.

## Commits

- `28ff159` — feat(41-02): GET /api/trainer/[slug]/coding — attempts + skill scores
- `025c4e4` — feat(41-02): CodingAttemptsTable + CodingSkillBars components
- `ce0f0a4` — feat(41-02): mount CodingPanel on /trainer/[slug] dashboard

## Known Stubs

None.

## Self-Check: PASSED

- `src/app/api/trainer/[slug]/coding/route.ts` + test exist ✓
- `CodingPanel.tsx`, `CodingAttemptsTable.tsx`, `CodingSkillBars.tsx` exist ✓
- `page.tsx` imports + mounts `<CodingPanel />` ✓
- `AssociateDashboardClient` untouched (grep confirms) ✓
- Commits `28ff159`, `025c4e4`, `ce0f0a4` in `git log` ✓
