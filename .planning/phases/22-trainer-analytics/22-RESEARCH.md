# Phase 22: Trainer Analytics — Research

**Researched:** 2026-04-16
**Domain:** Next.js data-heavy dashboard — Prisma $queryRaw aggregations, Recharts sparklines + charts, cohort-scoped analytics
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 4 fixed KPI cards in responsive CSS Grid (2x2 mobile, 4x1 desktop) above roster table on Dashboard > Roster.
- **D-02:** Cards: Avg Readiness (percentage), Mocks This Week (count), At-Risk Count + Top Gap label, AI-Trainer Variance (average delta).
- **D-03:** Single `prisma.$queryRaw` for all 4 KPI values. Scoped by cohort via `WHERE "cohortId" = $1` (or no filter for "All Cohorts").
- **D-04:** KPI cards use DESIGN.md surface tokens. Numbers 28px Clash Display, labels 12px DM Sans.
- **D-05:** Recharts `<LineChart>` sparkline — no axes, no grid, no tooltip — 56x20px inline in roster row.
- **D-06:** Single windowed query with `ROW_NUMBER() OVER (PARTITION BY "associateId")` limited to last 6 sessions for all sparklines. No N+1.
- **D-07:** Each roster row shows: trend word, top-gap tag, last-mock timestamp (relative).
- **D-08:** Trend word from linear regression slope of last 3 overall scores (same as readinessService).
- **D-09:** Replace placeholder `/trainer/gap-analysis` with table aggregating GapScores by skill AND topic.
- **D-10:** Columns: Skill, Topic, Associates Affected (count), Avg Gap Score. Default sort by Associates Affected desc.
- **D-11:** Clicking a row navigates to `/trainer/gap-analysis/[skill]?cohort=<id>` — new page listing affected associates.
- **D-12:** Topic sourced from `GapScore.topic` (already populated).
- **D-13:** Markdown parser reads optional `topic:` frontmatter field per question.
- **D-14:** `Session.questions` JSON stores `topic` per question. Fallback: `keywords[0]` when absent.
- **D-15:** No migration needed — `Session.questions` is JSON.
- **D-16:** Replace placeholder `/trainer/calibration` with override frequency card + delta distribution chart.
- **D-17:** Override frequency = count(overridden) / count(total) from sessions in selected cohort.
- **D-18:** Delta distribution: Recharts `<BarChart>` histogram of (AI score - trainer final) buckets (-3 to +3).
- **D-19:** Delta data sourced from `Session.aiTrainerVariance` (denormalized, P17 schema) + `Session.questions` JSON for per-question deltas.
- **D-20:** Cohort Trends card on Dashboard > Roster: Recharts `<LineChart>`, weekly buckets, last 12 weeks.
- **D-21:** X-axis week labels ("W1"–"W12"), Y-axis 0–100%. Line = cohort average.
- **D-22:** Data from `Session` table: `DATE_TRUNC('week', "completedAt")`, avg `overallScore` per week.

### Claude's Discretion
- Exact SQL for `$queryRaw` queries
- KPI card component styling details beyond DESIGN.md tokens
- Sparkline color (suggest `--accent` for line)
- Gap Analysis filter/search within table
- Whether Cohort Trends card is above or below roster table
- Loading states for each analytics component

### Deferred Ideas (OUT OF SCOPE)
- Per-question-bank analytics
- Real-time dashboard updates (Supabase Realtime)
- Materialized views (deferred until >2000 associates)
- CSV export of Gap Analysis table
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ANALYTICS-01 | KPI strip (4 cards) scoped by cohort switcher. Single `$queryRaw`. | D-01–D-04 locked; Prisma `$queryRaw` pattern documented below. Session.date is the date field (string ISO). `completedAt` does not exist — use `createdAt` or date comparison via `date` column. |
| ANALYTICS-02 | Roster rows: sparkline + trend word + top-gap tag + last-mock timestamp. Windowed query, no N+1. | D-05–D-08 locked; `ROW_NUMBER() OVER PARTITION BY` pattern documented; trend word logic reuses `computeTrend()` shape from `readinessService.ts`. |
| ANALYTICS-03 | Gap Analysis page: aggregate GapScore by skill+topic, drill-through to associate list. | D-09–D-12 locked; GapScore.topic already populated. New route `/trainer/gap-analysis/[skill]/page.tsx` required. |
| ANALYTICS-04 | Markdown parser reads `topic:` frontmatter; stored in Session.questions JSON. | D-13–D-15 locked; `markdownParser.ts` needs `topic` extraction added to `ParsedQuestion` type and push call. |
| ANALYTICS-05 | Calibration page: override frequency + delta histogram. | D-16–D-19 locked; **CRITICAL GAP**: `aiTrainerVariance` is in schema but NOT written by `sessionPersistence.ts`. Must write it at session save. |
| ANALYTICS-06 | Cohort Trends line chart on Roster page: weekly buckets, last 12 weeks. | D-20–D-22 locked; Session.date is a String column — need `TO_DATE("date", 'YYYY-MM-DD')` or `DATE_TRUNC` on `createdAt`. |
</phase_requirements>

---

## Summary

Phase 22 builds the real analytics surfaces behind the P21 placeholder pages. All locked decisions are clear. The codebase is well-prepared: Recharts 3.8.1 is installed, `GapScore.topic` is populated, `aiTrainerVariance` is migrated in the schema, and the shell cohort switcher already writes `?cohort=<id>` to the URL. The dashboard pages (`/trainer`, gap-analysis, calibration) are all client components reading auth via `useAuth()` — this pattern continues.

The one critical gap requiring a Wave 0 fix: `aiTrainerVariance` is defined in `Session` schema and migration `0002`, but `sessionPersistence.ts` never writes it. The calibration page needs it, so the session save pipeline must be extended to compute and persist it before the analytics page can read the column. Per-question delta computation can also fall back to `Session.assessments` JSON but the denormalized field is the stated source.

A second gap: `Session.date` is a `String` field (ISO date stored as text), NOT a `DateTime`. Raw SQL for weekly bucketing must use `TO_DATE("date", 'YYYY-MM-DD')` or cast to date, not `DATE_TRUNC` on a typed timestamp. The `createdAt` column IS a proper `DateTime` and is an acceptable alternative for weekly bucketing.

**Primary recommendation:** Implement all analytics as client components fetching from new/extended API route handlers. KPI + sparkline data from two new endpoints (`/api/trainer/kpis` and `/api/trainer/sparklines`). Gap Analysis and Calibration from two new endpoints. Cohort Trends co-located with roster or a new endpoint. All scoped by `?cohort=<id>` query param.

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^3.8.1 | Sparklines, cohort trend LineChart, calibration BarChart | Already installed, used in `GapTrendChart.tsx`. React 19 compatible. [VERIFIED: package.json] |
| prisma | 7.7.0 | `$queryRaw` for KPI + windowed sparkline query | Already installed, service-role client in `src/lib/prisma.ts`. [VERIFIED: schema.prisma] |
| next.js | ^16.2.3 | Route handlers for new API endpoints | Already the framework. [VERIFIED: package.json] |

### No new dependencies required
All analytics can be built with the existing stack. No additional npm installs needed.

## Architecture Patterns

### Recommended File Structure (new/modified files)
```
src/
├── app/
│   ├── api/
│   │   ├── trainer/
│   │   │   ├── kpis/route.ts              # NEW — KPI strip data (ANALYTICS-01)
│   │   │   ├── sparklines/route.ts        # NEW — roster sparkline data (ANALYTICS-02)
│   │   │   ├── gap-analysis/route.ts      # NEW — gap aggregation (ANALYTICS-03)
│   │   │   └── cohort-trends/route.ts     # NEW — weekly trend data (ANALYTICS-06)
│   │   └── calibration/route.ts           # NEW — override freq + deltas (ANALYTICS-05)
│   └── trainer/
│       └── (dashboard)/
│           ├── page.tsx                   # MODIFY — add KPI strip + cohort trends + cohort param
│           ├── gap-analysis/
│           │   ├── page.tsx               # REPLACE placeholder
│           │   └── [skill]/page.tsx       # NEW — drill-through associate list
│           └── calibration/
│               └── page.tsx               # REPLACE placeholder
├── components/
│   └── trainer/
│       ├── KpiStrip.tsx                   # NEW — 4-card grid
│       ├── RosterSparkline.tsx            # NEW — 56x20 inline chart
│       └── CohortTrends.tsx               # NEW — weekly line chart
└── lib/
    ├── markdownParser.ts                  # MODIFY — add topic: frontmatter
    ├── sessionPersistence.ts              # MODIFY — write aiTrainerVariance
    └── types.ts                           # MODIFY — add topic to ParsedQuestion
```

### Pattern 1: Cohort Param Propagation
All dashboard pages are client components that read `?cohort` from `useSearchParams()`. The `CohortSwitcher` in the topbar writes this param via `router.push(...)`. Dashboard child pages must import `useSearchParams` and pass the cohort ID to their API fetch.

```typescript
// Source: src/components/shell/CohortSwitcher.tsx (verified pattern)
'use client'
import { useSearchParams } from 'next/navigation'

export default function SomeDashboardPage() {
  const searchParams = useSearchParams()
  const cohortId = searchParams.get('cohort') // null = all cohorts

  useEffect(() => {
    const url = cohortId
      ? `/api/trainer/kpis?cohort=${cohortId}`
      : '/api/trainer/kpis'
    fetch(url).then(...)
  }, [cohortId])
}
```

### Pattern 2: Prisma $queryRaw for KPI Strip
All 4 KPIs in one round-trip. Scoped by cohortId via tagged template literal (parameterized — no SQL injection risk). [ASSUMED — exact SQL verified structurally but not executed against live DB]

```typescript
// Source: Prisma docs pattern for $queryRaw
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma'

type KpiRow = {
  avg_readiness: number | null
  mocks_this_week: bigint
  at_risk_count: bigint
  top_gap_skill: string | null
  avg_variance: number | null
}

async function fetchKpis(cohortId: number | null): Promise<KpiRow> {
  const cohortFilter = cohortId
    ? Prisma.sql`AND s."cohortId" = ${cohortId}`
    : Prisma.sql``

  // Note: Session.date is a String, not DateTime.
  // Use createdAt (DateTime) for date range filtering.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const rows = await prisma.$queryRaw<KpiRow[]>`
    SELECT
      AVG(a."readinessScore") as avg_readiness,
      COUNT(CASE WHEN s."createdAt" >= ${weekAgo} THEN 1 END) as mocks_this_week,
      COUNT(CASE WHEN a."readinessStatus" = 'not_ready' THEN 1 END) as at_risk_count,
      MIN(gs.skill) FILTER (WHERE gs."weightedScore" = (
        SELECT MIN(gs2."weightedScore") FROM "GapScore" gs2 
        WHERE gs2."associateId" = a.id AND gs2.topic = ''
      )) as top_gap_skill,
      AVG(s."aiTrainerVariance") as avg_variance
    FROM "Associate" a
    LEFT JOIN "Session" s ON s."associateId" = a.id
    LEFT JOIN "GapScore" gs ON gs."associateId" = a.id AND gs.topic = ''
    WHERE 1=1
    ${cohortFilter}
  `
  return rows[0]
}
```

**Note:** `bigint` results from COUNT — convert with `Number(row.mocks_this_week)` before sending JSON (bigint is not JSON serializable). [VERIFIED: Prisma $queryRaw docs behavior — ASSUMED exact type mapping]

### Pattern 3: Windowed Sparkline Query (No N+1)
```typescript
// Windowed query: last 6 sessions per associate, single DB round-trip
type SparklineRow = {
  associate_id: number
  overall_score: number | null
  rn: bigint
}

async function fetchSparklines(cohortId: number | null) {
  const cohortFilter = cohortId
    ? Prisma.sql`WHERE a."cohortId" = ${cohortId}`
    : Prisma.sql`WHERE 1=1`

  const rows = await prisma.$queryRaw<SparklineRow[]>`
    SELECT
      s."associateId" as associate_id,
      (COALESCE(s."overallTechnicalScore", 0) + COALESCE(s."overallSoftSkillScore", 0)) / 2 as overall_score,
      ROW_NUMBER() OVER (
        PARTITION BY s."associateId"
        ORDER BY s."createdAt" DESC
      ) as rn
    FROM "Session" s
    JOIN "Associate" a ON a.id = s."associateId"
    ${cohortFilter}
    AND s.status = 'completed'
  `
  // Filter to last 6 per associate in application layer
  return rows.filter((r) => Number(r.rn) <= 6)
}
```

### Pattern 4: Recharts Sparkline (56x20, no chrome)
```typescript
// Source: Recharts docs — LineChart composable API
// [VERIFIED: src/components/trainer/GapTrendChart.tsx for existing pattern]
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface SparkProps { data: Array<{ score: number }> }

export function RosterSparkline({ data }: SparkProps) {
  return (
    <ResponsiveContainer width={56} height={20}>
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="score"
          stroke="var(--accent)"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```
`isAnimationActive={false}` prevents layout shift in table rows. [ASSUMED — standard practice, not verified in recharts 3.x changelog]

### Pattern 5: Relative Timestamp
No library needed. Simple helper:
```typescript
function relativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const days = Math.floor(diffMs / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  return `${days}d ago`
}
```

### Pattern 6: Weekly Bucket for Cohort Trends
Session.date is a `String` (ISO "YYYY-MM-DD" format). For weekly grouping, cast to DATE in SQL.

```sql
-- Use DATE() cast since Session.date is a String column, not TIMESTAMPTZ
SELECT
  DATE_TRUNC('week', TO_DATE(s.date, 'YYYY-MM-DD')) as week_start,
  AVG((COALESCE(s."overallTechnicalScore", 0) + COALESCE(s."overallSoftSkillScore", 0)) / 2) as avg_score,
  COUNT(*) as session_count
FROM "Session" s
JOIN "Associate" a ON a.id = s."associateId"
WHERE s."cohortId" = $1
  AND TO_DATE(s.date, 'YYYY-MM-DD') >= (CURRENT_DATE - INTERVAL '12 weeks')
  AND s.status = 'completed'
GROUP BY DATE_TRUNC('week', TO_DATE(s.date, 'YYYY-MM-DD'))
ORDER BY week_start ASC
```

### Pattern 7: markdownParser topic: Frontmatter
The current parser uses block-level splits (no YAML frontmatter block per question). The `topic:` field is a per-question inline metadata key, similar to how `**Keywords:**` is parsed. Add extraction:

```typescript
// Add to parseInterviewQuestions() in markdownParser.ts after keywordsMatch extraction
const topicMatch = block.match(/\*\*Topic:\*\*\s*(.+?)(?=\n|$)/)
const topic = topicMatch ? topicMatch[1].trim() : (keywords[0] ?? '')

// In the questions.push() call, add:
topic, // new field
```

Also add `topic?: string` to `ParsedQuestion` in `src/lib/types.ts`.

### Pattern 8: aiTrainerVariance Write in sessionPersistence.ts
Currently NOT written. Must compute at session save time:

```typescript
// Compute average delta (AI score - trainer final score) across all questions
function computeAiTrainerVariance(
  assessments: Record<string, { llmScore?: number; finalScore?: number }>
): number | null {
  const deltas: number[] = []
  for (const a of Object.values(assessments)) {
    if (a.llmScore !== undefined && a.finalScore !== undefined) {
      deltas.push(a.finalScore - a.llmScore)
    }
  }
  if (deltas.length === 0) return null
  return deltas.reduce((sum, d) => sum + d, 0) / deltas.length
}
```

Add this call + field to the `prisma.session.upsert` create/update blocks in `sessionPersistence.ts`.

### Pattern 9: Gap Analysis Aggregation Query
```sql
SELECT
  gs.skill,
  gs.topic,
  COUNT(DISTINCT gs."associateId") as associates_affected,
  AVG(gs."weightedScore") as avg_gap_score
FROM "GapScore" gs
JOIN "Associate" a ON a.id = gs."associateId"
WHERE gs.topic != ''  -- topic-level only
  AND a."cohortId" = $1  -- or omit for All Cohorts
GROUP BY gs.skill, gs.topic
ORDER BY associates_affected DESC, avg_gap_score ASC
```

Drill-through query for `/trainer/gap-analysis/[skill]`:
```sql
SELECT a.slug, a."displayName", gs."weightedScore", gs.topic
FROM "GapScore" gs
JOIN "Associate" a ON a.id = gs."associateId"
WHERE gs.skill = $1
  AND gs.topic = $2
  AND a."cohortId" = $3  -- optional
ORDER BY gs."weightedScore" ASC
```

### Pattern 10: Calibration Delta Distribution
Per-question delta buckets from `Session.assessments` JSON (fallback when `aiTrainerVariance` is null for old sessions):

```typescript
// Bucket deltas into [-3, -2, -1, 0, +1, +2, +3]
function buildDeltaBuckets(sessions: Array<{ assessments: unknown }>): Record<number, number> {
  const buckets: Record<number, number> = {'-3': 0, '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0, '3': 0}
  for (const s of sessions) {
    const assessments = s.assessments as Record<string, { llmScore?: number; finalScore?: number }>
    for (const a of Object.values(assessments)) {
      if (a.llmScore !== undefined && a.finalScore !== undefined) {
        const delta = Math.round(a.finalScore - a.llmScore)
        const clamped = Math.max(-3, Math.min(3, delta))
        buckets[clamped] = (buckets[clamped] ?? 0) + 1
      }
    }
  }
  return buckets
}
```

### Anti-Patterns to Avoid
- **N+1 sparkline queries:** Never fetch session history per-associate in a loop. The windowed query is required.
- **DATE_TRUNC on Session.date:** `Session.date` is a `String`, not a `DateTime`. Use `TO_DATE("date", 'YYYY-MM-DD')` or switch to `createdAt` (which IS a DateTime). [VERIFIED: schema.prisma line 45 — `date String`]
- **Serializing bigint to JSON:** `prisma.$queryRaw` COUNT returns `bigint`. Must convert with `Number()` before `NextResponse.json()` or the response will throw.
- **Re-computing aiTrainerVariance per page view:** The column is designed to be denormalized at session save. Compute it once in `sessionPersistence.ts`, not in the route handler.
- **Using `useAuth()` for data fetching gating (existing pattern):** Roster page is a client component — continue the existing `useAuth()` pattern. Do not attempt to convert to server components without broader refactor.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG line paths | Manual path math | Recharts `<LineChart>` with `dot={false}` | Recharts already installed, handles edge cases (single point, nulls) |
| Relative timestamps | date-fns | Simple inline helper (see Pattern 5) | No dep needed for "Nd ago" logic |
| Histogram chart | Canvas drawing | Recharts `<BarChart>` | Already installed; 7-bucket histogram is trivial with it |
| SQL windowing | Multiple queries | Single `ROW_NUMBER() OVER PARTITION BY` | N+1 is the classic dashboard perf killer |

---

## Common Pitfalls

### Pitfall 1: Session.date is a String, Not DateTime
**What goes wrong:** `DATE_TRUNC('week', "date")` fails with Postgres type error.
**Why it happens:** Schema line 45: `date String` — stored as ISO text, not `TIMESTAMPTZ`.
**How to avoid:** Either use `TO_DATE(s.date, 'YYYY-MM-DD')` in SQL or use `createdAt` (which IS `DateTime @default(now())`).
**Warning signs:** Postgres error "function date_trunc(unknown, character varying) does not exist".

### Pitfall 2: bigint from $queryRaw Not JSON-Serializable
**What goes wrong:** `JSON.stringify()` throws "BigInt not serializable"; route handler 500s.
**Why it happens:** Postgres `COUNT(*)` → Prisma `$queryRaw` returns `bigint` in JS.
**How to avoid:** Convert every COUNT result: `Number(row.mocks_this_week)`.
**Warning signs:** `TypeError: Do not know how to serialize a BigInt`.

### Pitfall 3: aiTrainerVariance Null for All Existing Sessions
**What goes wrong:** Calibration page shows empty/zero data despite existing sessions.
**Why it happens:** `sessionPersistence.ts` never writes this field — it's null for every session currently in DB.
**How to avoid:** The session save pipeline (Wave 0 or Wave 1 task) must add variance computation + write before the calibration page can use the denormalized column. Per-question fallback from `Session.assessments` JSON handles historical sessions.
**Warning signs:** `aiTrainerVariance` is null on all `Session` rows when you query DB.

### Pitfall 4: Cohort Param Not Propagated to API Calls
**What goes wrong:** Analytics show all-cohort data regardless of switcher selection.
**Why it happens:** Existing roster page uses state + `selectedCohortId` — but new analytics components need to read `useSearchParams()` since P21 moved the selection to the URL.
**How to avoid:** All new analytics API calls must read `searchParams.get('cohort')` and pass it as a query param.
**Warning signs:** Changing the cohort switcher has no effect on KPI numbers.

### Pitfall 5: Recharts ResponsiveContainer Width in Table Cells
**What goes wrong:** Sparklines render at 0 width or don't paint.
**Why it happens:** `ResponsiveContainer width="100%"` requires a parent with explicit width. Table cells with `auto` width give 0.
**How to avoid:** Use explicit pixel dimensions: `<ResponsiveContainer width={56} height={20}>` for sparklines.
**Warning signs:** Blank sparkline cells in the roster table.

### Pitfall 6: markdownParser topic: Not Stored in Session.questions
**What goes wrong:** Gap Analysis shows topics from `keywords[0]` fallback only, no `topic:` frontmatter data.
**Why it happens:** `markdownParser.ts` doesn't extract `topic:`. The `ParsedQuestion` type doesn't have a `topic` field. The interview setup doesn't pass it through to `Session.questions`.
**How to avoid:** Three files must be updated together: `types.ts` (add field), `markdownParser.ts` (extract field), interview store/setup (preserve field in stored questions).
**Warning signs:** All GapScore.topic values are keywords, never frontmatter topic values.

---

## Critical Gap: aiTrainerVariance Write Pipeline

**Status:** Schema column exists and is migrated. `sessionPersistence.ts` does NOT write it.

**Required fix (must be Wave 0 or Wave 1 Task 1):**

In `src/lib/sessionPersistence.ts`:
1. Add `computeAiTrainerVariance(session.assessments)` helper
2. Pass result to both `create` and `update` blocks of `prisma.session.upsert`

This is blocking for ANALYTICS-05 (calibration page). The per-question `Session.assessments` JSON fallback can serve historical data, but the route handler for calibration needs to read it.

**Decision for planner:** Option A — write `aiTrainerVariance` at save time (denormalized, matches D-19 intent). Option B — compute from `Session.assessments` JSON per-view in the calibration route handler (simpler, no sessionPersistence change, covers all sessions). Given D-19 says "denormalized at session save — not computed per page view," go with Option A AND add JSON fallback for historical sessions.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANALYTICS-01 | KPI route returns 4 values scoped by cohort | unit | `npm run test -- src/app/api/trainer/kpis/route.test.ts` | ❌ Wave 0 |
| ANALYTICS-02 | Sparkline route returns max 6 sessions per associate, no N+1 | unit | `npm run test -- src/app/api/trainer/sparklines/route.test.ts` | ❌ Wave 0 |
| ANALYTICS-03 | Gap analysis route returns aggregated skill+topic rows | unit | `npm run test -- src/app/api/trainer/gap-analysis/route.test.ts` | ❌ Wave 0 |
| ANALYTICS-04 | markdownParser extracts `topic:` field; fallback to keywords[0] | unit | `npm run test -- src/lib/__tests__/markdownParser.test.ts` | ❌ Wave 0 |
| ANALYTICS-05 | sessionPersistence writes aiTrainerVariance; calibration route computes delta distribution | unit | `npm run test -- src/lib/__tests__/calibration.test.ts` | ❌ Wave 0 |
| ANALYTICS-06 | Cohort trends route returns 12 weekly buckets in asc order | unit | `npm run test -- src/app/api/trainer/cohort-trends/route.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/app/api/trainer/kpis/route.test.ts` — covers ANALYTICS-01
- [ ] `src/app/api/trainer/sparklines/route.test.ts` — covers ANALYTICS-02
- [ ] `src/app/api/trainer/gap-analysis/route.test.ts` — covers ANALYTICS-03
- [ ] `src/lib/__tests__/markdownParser.test.ts` — covers ANALYTICS-04
- [ ] `src/lib/__tests__/calibration.test.ts` — covers ANALYTICS-05 (aiTrainerVariance compute + delta distribution)
- [ ] `src/app/api/trainer/cohort-trends/route.test.ts` — covers ANALYTICS-06

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `getCallerIdentity()` on all new route handlers — trainer-only (pattern from existing `/api/trainer/route.ts`) |
| V3 Session Management | no | No new session state |
| V4 Access Control | yes | All analytics routes return 401 for non-trainer callers. Gap drill-through route must also gate. |
| V5 Input Validation | yes | Zod for `cohortId` (parse Int, reject NaN/"all") — pattern from existing `/api/trainer/route.ts` lines 30-36 |
| V6 Cryptography | no | No crypto operations |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via cohortId | Tampering | Prisma tagged template literals (`Prisma.sql`) — parameterized automatically |
| Unauthenticated analytics access | Disclosure | `getCallerIdentity()` + 401 guard on every route handler |
| Gap drill-through skill param injection | Tampering | Use `Prisma.sql` parameterized query for skill/topic params |

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this phase uses existing DB, existing Recharts, no new tools).

---

## Open Questions

1. **Session.date format consistency**
   - What we know: `date` is a `String` field in the schema; sessions are written with `session.date` from the interview store.
   - What's unclear: Is the value always ISO "YYYY-MM-DD" or sometimes a full ISO timestamp? The store sets `date: new Date().toISOString()` which produces "2026-04-16T..." not "2026-04-16".
   - Recommendation: Use `createdAt` (proper DateTime column) for all date-based analytics queries instead of `date`. Avoids format ambiguity entirely. [ASSUMED — verify by checking `src/store/interviewStore.ts` if needed]

2. **Trend word for associates with < 3 sessions**
   - What we know: `computeTrend()` returns -1 when sessions < 3.
   - What's unclear: What trend word to show for new associates?
   - Recommendation: Show "new" or omit the trend word entirely. Claude's discretion per CONTEXT.md.

3. **Avg Readiness KPI — data source**
   - What we know: `Associate.readinessStatus` is a string classification, not a numeric score. `readinessScore` is always `null` in the current roster API response (line 64 of `/api/trainer/route.ts`).
   - What's unclear: Is "Avg Readiness (percentage)" computed from the ratio of `ready/total` or from a numeric weighted score stored somewhere?
   - Recommendation: Compute as `(count_ready / total_associates) * 100` — percentage of associates classified as ready. This is more meaningful than an unavailable numeric score. Planner should confirm.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Session.date` stores full ISO timestamp from `new Date().toISOString()` — use `createdAt` for date queries instead | Open Questions #1, Pattern 6 | Wrong date aggregation if date field format differs |
| A2 | Sparkline `isAnimationActive={false}` prevents table layout shift in Recharts 3 | Pattern 4 | Minor visual jank — low risk |
| A3 | `COUNT(*)` returns `bigint` from `prisma.$queryRaw` in all cases | Pitfall 2 | Route 500s in production if not handled |
| A4 | `topic:` frontmatter in question banks uses `**Topic:**` inline syntax matching existing `**Keywords:**` pattern | Pattern 7 | Parser misses topic field if syntax differs |
| A5 | "Avg Readiness" KPI means % of associates classified as "ready" | Open Questions #3 | Wrong KPI value shown if stakeholders expect numeric score average |

---

## Sources

### Primary (HIGH confidence — VERIFIED in this session)
- `prisma/schema.prisma` — Session model (date: String, createdAt: DateTime, aiTrainerVariance: Float?)
- `prisma/migrations/0002_v12_email_authuser_variance/migration.sql` — aiTrainerVariance column migration confirmed deployed
- `src/lib/sessionPersistence.ts` — Confirmed aiTrainerVariance NOT written
- `src/components/trainer/GapTrendChart.tsx` — Recharts LineChart pattern (ResponsiveContainer, Line props)
- `src/components/shell/CohortSwitcher.tsx` — ?cohort URL param write pattern
- `src/lib/readinessService.ts` — computeTrend() linear regression logic
- `src/lib/gapService.ts` — GapScore.topic field confirmed populated from keywords
- `src/app/api/trainer/route.ts` — Auth pattern (getCallerIdentity), cohortId parsing, bigint awareness
- `package.json` — recharts ^3.8.1, next ^16.2.3, react 19.2.3 confirmed

### Secondary (MEDIUM confidence)
- Prisma $queryRaw docs [ASSUMED — standard Prisma behavior for tagged template parameterization]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in package.json
- Architecture: HIGH — patterns derived directly from existing code
- Critical gap (aiTrainerVariance): HIGH — confirmed by reading sessionPersistence.ts
- Session.date type: HIGH — confirmed String in schema, ISO format ASSUMED
- Pitfalls: HIGH — derived from schema inspection and code reading

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (stable codebase, no fast-moving deps)
