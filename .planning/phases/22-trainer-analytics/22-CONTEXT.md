# Phase 22: Trainer Analytics — Context

**Gathered:** 2026-04-16
**Status:** Ready for planning
**Source:** /gsd-discuss-phase --auto (all decisions auto-selected)

<domain>
## Phase Boundary

Build trainer analytics: KPI strip (4 cards), roster sparklines + trend words, Gap Analysis page (skill + topic aggregation with drill-through), Calibration page (override frequency + delta distribution), Cohort Trends line chart, and topic frontmatter parsing in the question-bank parser.

All analytics are scoped by the global cohort switcher (`?cohort=<id>`) built in Phase 21. Dashboard placeholder pages from P21 are replaced with real implementations.

**Out of scope:** Associate self-dashboard (P23), PDF export (P24), per-question-bank analytics (deferred), streaks/leaderboards (out of scope per REQUIREMENTS.md).

</domain>

<decisions>
## Implementation Decisions

### KPI Strip (ANALYTICS-01)
- **D-01:** 4 fixed KPI cards in a responsive CSS Grid (2x2 on mobile, 4x1 on desktop) above the roster table on Dashboard > Roster page.
- **D-02:** Cards: Avg Readiness (percentage), Mocks This Week (count), At-Risk Count + Top Gap label, AI-Trainer Variance (average delta).
- **D-03:** Single `prisma.$queryRaw` returns all 4 KPI values in one query. Scoped by cohort via `WHERE "cohortId" = $1` (or no filter for "All Cohorts").
- **D-04:** KPI cards use DESIGN.md surface tokens. Numbers are large (28px Clash Display), labels are 12px DM Sans.

### Roster Sparklines (ANALYTICS-02)
- **D-05:** Recharts `<LineChart>` with no axes, no grid, no tooltip — just the line path. Rendered inline in roster table cell. Size: 56x20px.
- **D-06:** Data from a single windowed query: `ROW_NUMBER() OVER (PARTITION BY "associateId" ORDER BY "completedAt" DESC)` limited to last 6 sessions. No N+1 — one query returns all sparkline data for all visible associates.
- **D-07:** Each roster row also shows: trend word ("improving"/"declining"/"steady"), top-gap tag (skill name from lowest GapScore), last-mock timestamp (relative, e.g. "2d ago").
- **D-08:** Trend word derived from linear regression slope of last 3 session overall scores (same as readiness classification logic).

### Gap Analysis (ANALYTICS-03)
- **D-09:** Replace placeholder `/trainer/gap-analysis` page. Table aggregates GapScores by skill AND topic across selected cohort.
- **D-10:** Columns: Skill, Topic, Associates Affected (count), Avg Gap Score. Default sort by Associates Affected descending.
- **D-11:** Clicking a row navigates to `/trainer/gap-analysis/[skill]?cohort=<id>` (new page) showing the list of affected associates with their individual gap scores for that skill.
- **D-12:** Topic is sourced from `GapScore.topic` field (already populated by gapService from question-bank metadata).

### Topic Frontmatter (ANALYTICS-04)
- **D-13:** Markdown parser (`src/lib/markdownParser.ts`) reads optional `topic:` frontmatter field per question. Value stored in parsed question object.
- **D-14:** At interview start, `Session.questions` JSON stores `topic` per question object. Fallback: `keywords[0]` when `topic:` is absent from the bank.
- **D-15:** No migration needed — `Session.questions` is a JSON column that already stores per-question data.

### Calibration (ANALYTICS-05)
- **D-16:** Replace placeholder `/trainer/calibration` page. Two sections: override frequency card + delta distribution chart.
- **D-17:** Override frequency: percentage of questions where trainer changed the AI score. Simple count(overridden) / count(total) from sessions in selected cohort.
- **D-18:** Delta distribution: Recharts `<BarChart>` showing histogram of (AI score - trainer final score) bucketed into ranges (-3, -2, -1, 0, +1, +2, +3). Centered on 0.
- **D-19:** Data sourced from denormalized `Session.aiTrainerVariance` (added in P17 schema). For per-question deltas, compute from `Session.questions` JSON.

### Cohort Trends (ANALYTICS-06)
- **D-20:** Card on Dashboard > Roster showing cohort-wide average readiness over time. Recharts `<LineChart>` with weekly buckets, last 12 weeks.
- **D-21:** X-axis: week labels (e.g. "W1", "W2"). Y-axis: 0-100% readiness. Line shows cohort average.
- **D-22:** Data from `Session` table: group by week (`DATE_TRUNC('week', "completedAt")`), average `overallScore` across all sessions for associates in selected cohort.

### Claude's Discretion
- Exact SQL for `$queryRaw` queries (following Prisma raw query patterns)
- KPI card component styling details beyond DESIGN.md tokens
- Sparkline color (suggest `--accent` for line)
- Gap Analysis filter/search within the table
- Whether Cohort Trends card is above or below the roster table
- Loading states for each analytics component

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap + Requirements
- `.planning/ROADMAP.md` — Phase 22 section, SC 1-6
- `.planning/REQUIREMENTS.md` — ANALYTICS-01 through ANALYTICS-06

### Prior Phase Context
- `.planning/phases/21-app-shell-redesign/21-CONTEXT.md` — Shell layout, sidebar configs, cohort switcher (URL param pattern)
- `.planning/phases/18-supabase-auth-install/18-CONTEXT.md` — getCallerIdentity, auth pattern

### Existing Code
- `src/app/trainer/(dashboard)/page.tsx` — Current roster page (add KPI strip + sparklines + cohort trends here)
- `src/app/trainer/(dashboard)/gap-analysis/page.tsx` — Placeholder (replace with real implementation)
- `src/app/trainer/(dashboard)/calibration/page.tsx` — Placeholder (replace)
- `src/app/trainer/(dashboard)/layout.tsx` — Dashboard section layout
- `src/app/api/trainer/route.ts` — Roster API (may need enrichment for sparkline data)
- `src/app/api/trainer/[slug]/route.ts` — Associate detail API
- `src/lib/markdownParser.ts` — Question-bank parser (add `topic:` frontmatter reading)
- `src/lib/gapService.ts` — Gap scoring (already stores topic in GapScore)
- `src/lib/readinessService.ts` — Readiness classification (trend word logic)
- `src/lib/prisma.ts` — Prisma client for `$queryRaw`
- `prisma/schema.prisma` — Session.aiTrainerVariance, GapScore.topic
- `src/app/trainer/[slug]/page.tsx` — Existing gap trend charts using recharts (pattern reference)

### Design System
- `DESIGN.md` — Visual tokens
- `.planning/phases/21-app-shell-redesign/21-UI-SPEC.md` — Shell component specs (TopBar, sidebar dimensions)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **recharts** — Already installed, used in `/trainer/[slug]` for gap trend LineChart. Reuse for sparklines, cohort trends, calibration bar chart.
- **Roster API** (`/api/trainer`) — Returns associate list with readiness data. Extend for sparkline + trend data.
- **gapService.ts** — Gap scoring with topic field. Aggregation queries can join against GapScore table.
- **readinessService.ts** — Trend calculation logic (linear regression slope). Reuse for trend word derivation.
- **CohortSwitcher** — URL `?cohort=<id>` param pattern. All analytics pages read this param.

### Established Patterns
- Server components for data fetching, client components for interactive charts
- `getCallerIdentity()` for auth gating on all route handlers
- `prisma.$queryRaw` for complex aggregation queries (new pattern for this phase, but Prisma supports it)
- Recharts composable API (LineChart, BarChart, etc.)

### Integration Points
- KPI strip + sparklines + cohort trends integrate into existing roster page
- Gap Analysis + Calibration replace P21 placeholder pages
- Topic frontmatter parsed at question fetch time, stored in session JSON
- All analytics scoped by cohort switcher URL param

</code_context>

<specifics>
## Specific Ideas

- Single `$queryRaw` for KPI strip avoids 4 separate round trips — critical for <200ms page load.
- Windowed query for sparklines (`ROW_NUMBER() OVER PARTITION BY`) is the standard approach for "last N per group" without N+1.
- `aiTrainerVariance` is already denormalized on Session (P17) — calibration page reads it directly, no per-view computation.
- Gap Analysis drill-through uses URL navigation (not modal) to maintain cohort context in the URL.
- Cohort Trends weekly bucketing uses `DATE_TRUNC('week', ...)` — standard Postgres function.

</specifics>

<deferred>
## Deferred Ideas

- **Per-question-bank analytics** — "Associates struggle most with <bank>" requires bank provenance column on Session. Deferred per REQUIREMENTS.md.
- **Real-time dashboard updates** — Supabase Realtime subscriptions for live score updates during interviews. Deferred to post-v1.2.
- **Materialized views** — Not needed until >2000 associates per REQUIREMENTS.md out-of-scope note.
- **Export to CSV** — Gap Analysis table export. Not in requirements.

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 22-trainer-analytics*
*Context gathered: 2026-04-16 via /gsd-discuss-phase --auto*
