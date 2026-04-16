---
phase: 22-trainer-analytics
verified: 2026-04-16T00:00:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open /trainer (with a cohort selected) and confirm 4 KPI cards render above the table with real values (not em-dashes). Change cohort switcher and confirm KPI values update."
    expected: "KPI strip shows Avg Readiness %, Mocks This Week count, At-Risk Count with top-gap label, AI-Trainer Variance. Values change when cohort changes."
    why_human: "KPI values require live DB data. Data-flow correctness and cohort-scoping behavior require a running server."
  - test: "On /trainer roster, inspect each row for sparkline graphic, trend word (improving/declining/steady/new), top-gap skill tag, and last-mock timestamp."
    expected: "Every associate row shows a 56px inline sparkline, a colored trend word, a skill tag, and a relative date."
    why_human: "Sparkline rendering (Recharts ResponsiveContainer) and per-row data hydration require browser rendering."
  - test: "Navigate to /trainer/gap-analysis (with a cohort). Confirm table shows skill+topic rows sorted by Associates Affected desc. Click a row and confirm drill-through navigates to /trainer/gap-analysis/[skill] showing affected associates."
    expected: "Sortable table with skill/topic/count/avg-score columns. Row click navigates. Drill-through page shows associate list."
    why_human: "Table rendering, sort behavior, navigation, and cohort-scoped data require interactive browser testing."
  - test: "Navigate to /trainer/calibration. Confirm override frequency card shows a percentage and the delta histogram shows 7 bars (-3 to +3)."
    expected: "Override frequency percentage visible. BarChart with 7 colored buckets. Positive deltas green, negative red, zero muted."
    why_human: "Recharts BarChart rendering and correct color-coding per bucket value require browser rendering."
  - test: "On /trainer roster with a cohort selected, confirm the Cohort Trends card renders a 12-week line chart above the KPI strip."
    expected: "Line chart visible with week labels on X-axis and avgScore on Y-axis. Empty state shown when no cohort selected."
    why_human: "Chart rendering and conditional display require browser rendering."
---

# Phase 22: Trainer Analytics Verification Report

**Phase Goal:** Trainers see actionable analytics (KPIs, sparklines, gap aggregation, cohort trends, calibration) scoped by the global cohort switcher.
**Verified:** 2026-04-16T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Dashboard > Roster renders 4 KPI cards sourced from a single `$queryRaw` scoped by cohort switcher | VERIFIED | `src/app/api/trainer/kpis/route.ts` uses `prisma.$queryRaw` with `Prisma.sql` cohort scoping. `KpiStrip` component renders 4 cards (2-col / 4-col responsive grid). `page.tsx` fetches `/api/trainer/kpis` in `useEffect`, scoped by `useSearchParams().get('cohort')`. |
| 2 | Roster rows show per-associate sparkline + trend word + top-gap tag + last-mock timestamp from single windowed query | VERIFIED | `sparklines/route.ts` uses `ROW_NUMBER() OVER (PARTITION BY associateId)`. `RosterTable` receives `sparklineData` prop and renders `RosterSparkline`, trend word, top-gap tag per row. `SortField` union extended with `'trend'` and `'topGap'`. |
| 3 | Gap Analysis aggregates by skill AND topic; sorts by associates-affected desc; row click drills through to affected associates | VERIFIED | `gap-analysis/route.ts` uses `$queryRaw` with `COUNT(DISTINCT associateId)` grouped by `(skill, topic)` ordered `associates_affected DESC`. Drill-through page at `[skill]/page.tsx` exists. Page fetches with `skill+topic` params. Back link present. |
| 4 | Markdown parser reads optional `topic:` frontmatter; `Session.questions` JSON stores `topic` per question (fallback to `keywords[0]`) | VERIFIED | `types.ts` has `topic?: string` on `ParsedQuestion`. `markdownParser.ts` extracts `**Topic:** ` with `keywords[0]` fallback. `interviewStore.ts` stores `selectedQuestions` (ParsedQuestion[]) directly into `session.questions`, which is persisted as JSON. |
| 5 | Calibration page shows trainer-override frequency + delta distribution from denormalized `Session.aiTrainerVariance` | VERIFIED | `computeAiTrainerVariance()` exported from `sessionPersistence.ts` and written to both `create` and `update` blocks of `prisma.session.upsert`. `calibration/route.ts` iterates `Session.assessments` JSON for override counting and delta buckets. Page renders `BarChart` with 7 buckets and override frequency card. |
| 6 | Cohort Trends card on Dashboard > Roster shows 12-week weekly average readiness line chart for selected cohort | VERIFIED | `cohort-trends/route.ts` uses `DATE_TRUNC('week', s."createdAt")` over last 12 weeks, returns `CohortTrendPoint[]`. `CohortTrends` component renders `LineChart` via `ResponsiveContainer`. `page.tsx` fetches `/api/trainer/cohort-trends` and passes data to `<CohortTrends>`. Returns empty array when no cohort param. |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/types.ts` | ParsedQuestion.topic field | VERIFIED | Line 11: `topic?: string` |
| `src/lib/markdownParser.ts` | topic: frontmatter extraction | VERIFIED | Lines 46-48: `topicMatch` extraction + fallback |
| `src/lib/sessionPersistence.ts` | aiTrainerVariance computation and write | VERIFIED | Lines 11, 70, 94, 113: function + both create/update blocks |
| `src/lib/trainer-types.ts` | Analytics response types (KpiData, RosterSparklineData, GapAnalysisRow, CalibrationData, CohortTrendPoint) | VERIFIED | All 6 types present at lines 65, 77, 86, 100, 107 |
| `src/app/api/trainer/kpis/route.ts` | KPI data endpoint | VERIFIED | Exists, uses `$queryRaw`, auth-guarded, exports `GET` |
| `src/app/api/trainer/sparklines/route.ts` | Sparkline + trend + gap data endpoint | VERIFIED | Exists, ROW_NUMBER windowed query, trendWord computed |
| `src/app/api/trainer/cohort-trends/route.ts` | Weekly cohort trend data endpoint | VERIFIED | Exists, DATE_TRUNC weekly buckets |
| `src/components/trainer/KpiStrip.tsx` | 4-card KPI grid component | VERIFIED | 2-col/4-col responsive grid, loading skeleton, null state |
| `src/components/trainer/RosterSparkline.tsx` | 56x20 inline sparkline component | VERIFIED | `ResponsiveContainer width={56} height={20}`, no axes/grid/tooltip |
| `src/components/trainer/CohortTrends.tsx` | 12-week line chart component | VERIFIED | `ResponsiveContainer width="100%" height={120}`, `LineChart` |
| `src/components/trainer/RosterTable.tsx` | Enriched with sparkline, trend, top-gap columns | VERIFIED | `sparklineData` prop, `RosterSparkline` imported, `trendWord`/`topGap` columns |
| `src/app/api/trainer/gap-analysis/route.ts` | Gap aggregation and drill-through endpoint | VERIFIED | `$queryRaw`, `associates_affected`, both modes |
| `src/app/trainer/(dashboard)/gap-analysis/page.tsx` | Gap analysis aggregation table page | VERIFIED | Replaces placeholder, `useSearchParams`, `Gap Analysis` heading |
| `src/app/trainer/(dashboard)/gap-analysis/[skill]/page.tsx` | Drill-through page | VERIFIED | Exists, back link, fetches with skill+topic params |
| `src/app/api/trainer/calibration/route.ts` | Calibration data endpoint | VERIFIED | `overrideRate`, `deltaBuckets`, `CalibrationData`, auth-guarded |
| `src/app/trainer/(dashboard)/calibration/page.tsx` | Calibration page with override frequency + delta histogram | VERIFIED | `BarChart`, `overrideRate`, `deltaBuckets`, `useSearchParams` |
| `src/app/trainer/(dashboard)/page.tsx` | Roster page with all analytics wired | VERIFIED | `useSearchParams`, KpiStrip + CohortTrends + RosterTable with sparklineData, 3 fetch effects |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `page.tsx` (trainer) | `/api/trainer/kpis` | fetch in useEffect | WIRED | Line 78 fetches URL with cohort query param |
| `page.tsx` (trainer) | `/api/trainer/sparklines` | fetch in useEffect | WIRED | Line 100 fetches URL with cohort query param |
| `page.tsx` (trainer) | `/api/trainer/cohort-trends` | fetch in useEffect | WIRED | Line 126 fetches URL with cohort query param |
| `gap-analysis/page.tsx` | `/api/trainer/gap-analysis` | fetch call | WIRED | Line 80 fetches with cohort param |
| `gap-analysis/[skill]/page.tsx` | `/api/trainer/gap-analysis?skill=` | fetch with skill+topic | WIRED | Line 88 fetches with skill+topic+cohort params |
| `calibration/page.tsx` | `/api/trainer/calibration` | fetch call | WIRED | Lines 63-64 fetch with optional cohort param |
| `markdownParser.ts` | `types.ts` | ParsedQuestion import | WIRED | ParsedQuestion used, topic field flows through |
| `sessionPersistence.ts` | `prisma.session.upsert` | aiTrainerVariance field | WIRED | Lines 94/113 both create and update blocks |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `KpiStrip.tsx` | `data: KpiData` | `/api/trainer/kpis` → `prisma.$queryRaw` against Associate + Session + GapScore tables | Yes — SQL aggregates from real tables | FLOWING |
| `RosterSparkline.tsx` (via RosterTable) | `sparkline: SparklinePoint[]` | `/api/trainer/sparklines` → ROW_NUMBER windowed query on Session table | Yes — windowed query returns real session scores | FLOWING |
| `CohortTrends.tsx` | `data: CohortTrendPoint[]` | `/api/trainer/cohort-trends` → DATE_TRUNC weekly query on Session+Associate | Yes — real time-series aggregation | FLOWING |
| `gap-analysis/page.tsx` | `rows: GapAnalysisRow[]` | `/api/trainer/gap-analysis` → `$queryRaw` on GapScore+Associate | Yes — real group-by query | FLOWING |
| `gap-analysis/[skill]/page.tsx` | `rows: GapDrillThroughRow[]` | `/api/trainer/gap-analysis?skill=&topic=` → drill-through `$queryRaw` | Yes — real filtered query | FLOWING |
| `calibration/page.tsx` | `data: CalibrationData` | `/api/trainer/calibration` → `findMany` on Session.assessments JSON | Yes — application-layer delta computation from real session data | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED — analytics pages require a running server with a populated DB; no static entry points to check.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ANALYTICS-01 | 22-02 | KPI strip with 4 fixed cards scoped by cohort switcher | SATISFIED | `kpis/route.ts` single `$queryRaw`, `KpiStrip` renders 4 cards, page wired via `useSearchParams` |
| ANALYTICS-02 | 22-02 | Roster rows with sparkline + trend word + top-gap tag + last-mock timestamp, no N+1 | SATISFIED | `sparklines/route.ts` windowed query, `RosterTable` enriched with 3 new columns |
| ANALYTICS-03 | 22-03 | Gap Analysis aggregates by skill AND topic; drill-through to affected associates | SATISFIED | `gap-analysis/route.ts` groups by `(skill, topic)`, drill-through page exists |
| ANALYTICS-04 | 22-01 | Parser reads optional `topic:` frontmatter; `Session.questions` stores topic per question | SATISFIED | `ParsedQuestion.topic` added, `markdownParser.ts` extracts with fallback, questions stored as JSON in session |
| ANALYTICS-05 | 22-01 + 22-04 | Calibration page with override frequency + delta distribution; `aiTrainerVariance` denormalized at save | SATISFIED | `computeAiTrainerVariance` in `sessionPersistence.ts`, calibration page with `BarChart` |
| ANALYTICS-06 | 22-02 | Cohort Trends card with 12-week weekly average readiness line chart | SATISFIED | `cohort-trends/route.ts` DATE_TRUNC query, `CohortTrends` LineChart component wired in page |

All 6 ANALYTICS requirements (ANALYTICS-01 through ANALYTICS-06) claimed by this phase are satisfied. REQUIREMENTS.md traceability table marks all 6 as complete at Phase 22.

### Anti-Patterns Found

No blocker anti-patterns detected. No placeholder/TODO/stub text found in any analytics API route or page file. No empty `return null` / `return []` static returns in route handlers.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | — |

### Human Verification Required

#### 1. KPI Cards with Real Data and Cohort Switching

**Test:** Open `/trainer` with a cohort selected via the topbar cohort switcher. Inspect the 4 KPI cards.
**Expected:** Cards show Avg Readiness (%), Mocks This Week (count), At-Risk Count with top-gap skill sublabel, AI-Trainer Variance (+/-). Switch cohort and confirm all 4 values update.
**Why human:** KPI values require live DB data. Cohort-switching behavior and correct value updates require a running server with data.

#### 2. Roster Sparklines and Enriched Rows

**Test:** On `/trainer` roster, inspect each associate row for the sparkline graphic, trend word, top-gap tag, and relative last-mock timestamp.
**Expected:** 56px inline sparkline chart visible per row. Trend word colored (green=improving, red=declining, muted=new). Top-gap skill tag present. Relative timestamp ("2d ago").
**Why human:** Recharts `ResponsiveContainer` sparkline rendering and per-row data hydration require browser rendering — not testable with grep.

#### 3. Gap Analysis Table, Sort, and Drill-Through

**Test:** Navigate to `/trainer/gap-analysis` with a cohort selected. Verify table rows, default sort order, column sorting, and row click navigation.
**Expected:** Table shows skill+topic+associates-affected+avg-score. Default sort is Associates Affected DESC. Clicking a header re-sorts. Clicking a row navigates to `/trainer/gap-analysis/[skill]?topic=...` showing affected associates with Back link.
**Why human:** Table interactivity, sort toggles, navigation, and drill-through data correctness require interactive browser testing.

#### 4. Calibration Override Frequency and Delta Histogram

**Test:** Navigate to `/trainer/calibration` with a cohort selected.
**Expected:** Override Frequency card shows a percentage with override/total sublabel. Delta Distribution BarChart shows 7 bars with negative deltas in red (`--danger`), zero in muted surface, positive in green (`--success`). Custom tooltip on hover.
**Why human:** Recharts BarChart rendering and per-bucket color-coding require browser rendering.

#### 5. Cohort Trends Line Chart

**Test:** On `/trainer` roster, select a cohort with historical sessions. Check the Cohort Trends card above the KPI strip.
**Expected:** Line chart visible with week labels ("W1", "W2", etc.) on X-axis and average score on Y-axis, up to 12 weekly data points. When no cohort is selected, the card shows empty state.
**Why human:** Chart rendering and conditional display (with vs without cohort) require browser rendering.

### Gaps Summary

No automated gaps found. All 6 success criteria are verified against the actual codebase:
- Artifacts exist and are substantive (not stubs)
- All key links are wired (components consume API routes, API routes query real DB tables)
- Data flows from real DB queries through API routes to components
- No placeholder text or empty implementations found

Five human verification items remain to confirm correct visual rendering, cohort-switching reactivity, and interactive behavior (sort, navigation, chart rendering) that cannot be verified programmatically.

---

_Verified: 2026-04-16T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
