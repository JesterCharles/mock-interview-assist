# Phase 6: Trainer Dashboard - Research

**Researched:** 2026-04-13
**Domain:** Next.js 16 App Router RSC + recharts 3.8.1 + Prisma 7 data layer + Design System migration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 (Route Structure):** `/trainer` — roster view (all associates). `/trainer/[slug]` — associate detail. No separate layout — uses existing app layout with nav back to dashboard.
- **D-02 (Roster View):** Table/list of all associates showing: name, slug, readiness badge (color-coded), session count, last session date, recommended area. Sortable by readiness status. Click navigates to detail view.
- **D-03 (Associate Detail View):** Three sections: (1) Session history — last 5+ sessions with date, overall scores, status. (2) Gap trend chart — recharts LineChart with skill filter dropdown, topic-level breakdown on click. (3) Calibration view — AI score vs trainer override side-by-side per dimension for selected session.
- **D-04 (Charts Library):** recharts 3.8.1 (React 19 compatible, per CLAUDE.md stack decision). LineChart for gap trends, BarChart or RadarChart for skill comparison. All SVG-based, Tailwind-themed.
- **D-05 (Empty States):** Associates with < 3 sessions show a meaningful placeholder: "N more sessions needed for gap analysis" with completed session count. No broken charts or blank panels (DASH-07).
- **D-06 (Auth Protection):** `/trainer` route protected by existing single-password auth middleware. Same pattern as `/dashboard`, `/interview`, `/review` routes. No new auth logic needed.
- **D-07 (Data Fetching):** Server Components for initial data load. No client-side cache library (per CLAUDE.md stack decisions). Recharts components are client components (`"use client"`), data passed as props from server component.

### Claude's Discretion
- Exact chart configurations (colors, axes, tooltips)
- Responsive layout breakpoints
- Session detail expand/collapse behavior
- Loading states for chart data

### Deferred Ideas (OUT OF SCOPE)
- Real-time score updates via Supabase Realtime — post-MVP
- Export/download of associate reports — future feature
- Batch readiness assessment view — future enhancement
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | Roster view at /trainer showing all associates with readiness status badges | RSC page queries all associates via Prisma; `readinessStatus` field pre-computed by Phase 5 |
| DASH-02 | Per-associate detail with session history (last 5+ sessions with scores) | `/trainer/[slug]` page queries sessions via Prisma `findMany` with `orderBy: { date: 'desc' }, take: 10`; display overall scores from session record |
| DASH-03 | Gap trend charts with skill/topic selector using recharts | recharts 3.8.1 LineChart; client component receives GapScore data as props from RSC; skill filter drives `topic` query param or client-side filter |
| DASH-04 | AI vs trainer score calibration view (side-by-side per dimension) | Per-session calibration table: iterates `assessments` JSON, shows `llmScore` vs `finalScore` for each question dimension |
| DASH-05 | Readiness badges pre-computed on session save (not recalculated on dashboard load) | Reads `associate.readinessStatus` — written by Phase 5 on session save; dashboard page never runs gap computation |
| DASH-06 | Dashboard protected by existing single-password auth | `isAuthenticatedSession()` guard in RSC + add `/trainer` to auth-check redirect in client pages |
| DASH-07 | Graceful empty states for associates with < 3 sessions | 3-session gate: check `associate._count.sessions` or Phase 4 `sessionCount` on GapScore; render placeholder instead of chart |
</phase_requirements>

---

## Summary

Phase 6 is a read-heavy display layer that consumes data produced by Phases 3–5. The architectural work is minimal: two new App Router pages (`/trainer` and `/trainer/[slug]`), one new Prisma API route for trainer data, and recharts for visualization. The primary implementation challenges are:

1. **recharts is not yet installed** — it must be added as a dependency. Version 3.8.1 is confirmed React 19-compatible. [VERIFIED: npm registry]
2. **Design system migration** — the existing codebase uses a dark indigo/glass theme that contradicts the new DESIGN.md (warm parchment, burnt orange, editorial typography). Phase 6 pages must implement the new design system from scratch, not inherit existing globals.css patterns. This is the largest design-time decision.
3. **Auth pattern ambiguity** — the current app uses a client-side `useAuth()` hook backed by localStorage (not a server-side cookie/middleware). There is no `middleware.ts` in the project. Auth protection on `/trainer` must follow the same client-redirect pattern already used in `/dashboard` and `/history`.
4. **Data shape dependency** — this phase depends on Prisma models from Phases 1–5 (Associate, Session, GapScore, readinessStatus fields). Plans must treat those as upstream prerequisites.

**Primary recommendation:** Build `/trainer` and `/trainer/[slug]` as hybrid pages — RSC shell for data fetching, client component islands for recharts and interactive controls (filter dropdown, calibration session selector). Follow the exact auth pattern from `dashboard/page.tsx`: `useAuth()` + redirect in `useEffect`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.8.1 | LineChart (gap trends), BarChart/RadarChart (skill comparison) | React 19 compatible (`^19.0.0` in peer deps); decided in CLAUDE.md; largest React chart ecosystem |
| next (App Router RSC) | 16.1.1 | Server Component data fetching, routing | Already in project; RSC pattern for read-heavy dashboard |
| @prisma/client | 7.7.0 | Prisma queries for Associate, Session, GapScore | Already decided; type-safe Postgres queries |
| lucide-react | 0.562.0 | Icons (already in project) | Already installed |
| tailwindcss | 4.x | Styling | Already in project |

**Version verification:**
- recharts 3.8.1: confirmed current via `npm view recharts version` — returned `3.8.1` [VERIFIED: npm registry]
- recharts peerDependencies: `react: '^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0'` — compatible with project's React 19.2.3 [VERIFIED: npm registry]
- recharts is NOT currently installed in the project. [VERIFIED: package.json]

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-is | ^19.0.0 | Required recharts peer | Auto-installed as recharts peer dep; do not specify separately |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| recharts 3.8.1 | @tremor/react | Tremor v3 requires React ^18 only — INCOMPATIBLE with React 19.2.3 [VERIFIED: CLAUDE.md] |
| recharts 3.8.1 | @nivo | Full D3 dependency (~200KB extra); overkill for 3-4 chart types |
| RSC + fetch | TanStack Query | Unnecessary complexity for read-heavy dashboard with no optimistic updates in MVP |

**Installation:**
```bash
npm install recharts@3.8.1
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/app/trainer/
├── page.tsx              # RSC — roster view, queries all associates
├── loading.tsx           # Suspense fallback for roster
└── [slug]/
    ├── page.tsx          # RSC — associate detail, queries sessions + gap scores
    └── loading.tsx       # Suspense fallback for detail

src/components/trainer/
├── RosterTable.tsx       # Client component — sortable table, readiness badges
├── GapTrendChart.tsx     # Client component ("use client") — recharts LineChart
├── SkillRadarChart.tsx   # Client component ("use client") — recharts RadarChart (optional)
├── CalibrationView.tsx   # Client component — AI vs trainer score table
├── SessionHistoryList.tsx # Client component — expandable session list
└── EmptyGapState.tsx     # Pure display — "N more sessions needed" placeholder
```

### Pattern 1: RSC Shell + Client Islands
**What:** Server Component fetches all data from Prisma, passes serialized plain objects as props to client components. Client components own interactivity (sort, filter, chart hover).

**When to use:** Whenever the page is read-heavy and data comes from the database. Eliminates loading spinners for primary content; charts still hydrate client-side.

**Example:**
```typescript
// src/app/trainer/[slug]/page.tsx  (Server Component — no "use client")
import { prisma } from '@/lib/prisma'
import { isAuthenticatedSession } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import GapTrendChart from '@/components/trainer/GapTrendChart'

export default async function AssociateDetailPage({
  params
}: {
  params: { slug: string }
}) {
  if (!(await isAuthenticatedSession())) {
    redirect('/login')
  }

  const associate = await prisma.associate.findUnique({
    where: { slug: params.slug },
    include: {
      sessions: {
        orderBy: { date: 'desc' },
        take: 10,
      },
      gapScores: true,
    },
  })

  if (!associate) redirect('/trainer')

  return (
    <main>
      <GapTrendChart gapScores={associate.gapScores} />
    </main>
  )
}
```

### Pattern 2: Auth Guard (Client Pages)
**What:** The current project has NO `middleware.ts`. Auth is handled client-side via `useAuth()` + `useEffect` redirect. All existing protected pages (`/dashboard`, `/history`) follow this pattern.

**When to use:** Required for this phase — must match existing pattern or introduce inconsistency.

**Critical finding:** `isAuthenticatedSession()` in `src/lib/auth-server.ts` checks for an `nlm_session` cookie. But `src/lib/auth-context.tsx` stores auth in localStorage only — it does NOT set the `nlm_session` cookie on login. This means `isAuthenticatedSession()` would return false even for authenticated users unless the login API sets the cookie. The safe path is to use the `useAuth()` client-side pattern matching `/dashboard/page.tsx` exactly. [VERIFIED: codebase read of auth-context.tsx and auth-server.ts]

```typescript
// Client component auth guard (matching existing dashboard pattern)
'use client'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function TrainerPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // ... rest of page
}
```

**Implication:** `/trainer` and `/trainer/[slug]` must be client components for auth, OR the RSC pattern can be used only if the auth cookie issue is resolved upstream (Phase 1 or 2). The simplest safe approach: make the page itself a client component for auth (matching existing pattern), and use separate async data-fetching via a route handler `/api/trainer` + `/api/trainer/[slug]`. Alternatively, if Phase 1 login route sets the `nlm_session` HttpOnly cookie, RSC auth with `isAuthenticatedSession()` would work.

### Pattern 3: recharts in Client Components
**What:** recharts components require the DOM (SVG rendering) and must be wrapped in `"use client"`. Data passed from RSC or fetched via route handler.

**Example:**
```typescript
// Source: recharts 3.8.1 official API / CLAUDE.md decisions
'use client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

interface GapDataPoint {
  session: string   // session date label
  score: number     // weighted gap score
}

interface GapTrendChartProps {
  data: GapDataPoint[]
  skill: string
}

export default function GapTrendChart({ data, skill }: GapTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#DDD5C8" />
        <XAxis dataKey="session" tick={{ fill: '#7A7267', fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fill: '#7A7267', fontSize: 12 }} />
        <Tooltip
          contentStyle={{ background: '#FFFFFF', border: '1px solid #DDD5C8' }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#C85A2E"
          strokeWidth={2}
          dot={{ r: 4, fill: '#C85A2E' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

### Pattern 4: Readiness Badge (Typography Pattern from DESIGN.md)
**What:** DESIGN.md specifies readiness displayed as bold typography, not traffic-light badges: "**91** ascending" (success), "**68** climbing" (accent), "**42** stalling" (danger). Score in Clash Display 700, trend word in 11px DM Sans 600 lowercase.

**Example:**
```typescript
// Source: DESIGN.md §Readiness Signal Pattern
const READINESS_STYLES = {
  ready:      { score: 'text-[#2D6A4F]', trend: 'ascending' },
  improving:  { score: 'text-[#C85A2E]', trend: 'climbing' },
  not_ready:  { score: 'text-[#B83B2E]', trend: 'stalling' },
}

function ReadinessDisplay({
  score, status
}: {
  score: number, status: 'ready' | 'improving' | 'not_ready'
}) {
  const style = READINESS_STYLES[status]
  return (
    <span className="flex items-baseline gap-1">
      <span className={`font-bold text-2xl ${style.score}`} style={{ fontFamily: 'Clash Display' }}>
        {score}
      </span>
      <span className="text-[11px] font-semibold lowercase tracking-wide text-[#7A7267]">
        {style.trend}
      </span>
    </span>
  )
}
```

### Anti-Patterns to Avoid
- **Inheriting existing globals.css dark theme**: The existing `globals.css` defines dark navy backgrounds (`#0f1525`), indigo/cyan accents, and glass morphism classes. New `/trainer` pages must NOT use `nlm-bg`, `glass-card`, or indigo-colored classes. Use DESIGN.md tokens directly.
- **Putting recharts in a Server Component**: Will fail — recharts uses browser APIs. Always `"use client"`.
- **Re-computing gap scores on dashboard load**: Read from pre-computed `GapScore` table only (DASH-05).
- **Sorting associates in a Server Component with useState**: Sort must happen client-side (client component) OR via URL search params + server re-render.
- **Centering everything with uniform spacing**: DESIGN.md anti-pattern. Use asymmetric layout; let the roster table own the viewport.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Line chart with axes, tooltips, legend | Custom SVG chart | recharts LineChart + ResponsiveContainer | Axis math, tooltip positioning, responsive scaling are all non-trivial; recharts handles all of it |
| Responsive container that resizes with window | ResizeObserver + manual SVG viewBox | recharts ResponsiveContainer | Width/height recalculation on resize is handled internally |
| Color-coordinated legend | Manual legend HTML | recharts Legend component | Automatic key-color mapping |
| Tabular number formatting | Custom CSS | DM Sans with `fontVariantNumeric: 'tabular-nums'` | Alignment in score tables |

**Key insight:** recharts' `ResponsiveContainer` is the critical wrapper — without it, charts will not resize. Every chart must be wrapped in `<ResponsiveContainer width="100%" height={N}>`.

---

## Common Pitfalls

### Pitfall 1: recharts SSR Error
**What goes wrong:** `ReferenceError: window is not defined` or `TypeError: Cannot read properties of undefined (reading 'createElementNS')` when recharts component renders in a Server Component or during SSR.
**Why it happens:** recharts reads `window` and `document` during module initialization.
**How to avoid:** Always add `"use client"` to any component that imports recharts. For dynamic import, use `next/dynamic` with `{ ssr: false }` as a belt-and-suspenders if needed.
**Warning signs:** Build succeeds but page throws on first render.

### Pitfall 2: Auth Mismatch (isAuthenticatedSession vs useAuth)
**What goes wrong:** RSC that calls `isAuthenticatedSession()` redirects even for authenticated users.
**Why it happens:** `auth-context.tsx` stores auth in localStorage and does NOT set the `nlm_session` HttpOnly cookie. `isAuthenticatedSession()` checks for `nlm_session` cookie. The two systems are decoupled.
**How to avoid:** Use `useAuth()` + redirect in `useEffect` (client-side) matching the `/dashboard/page.tsx` pattern exactly — until auth is unified. [VERIFIED: codebase read]
**Warning signs:** Infinite redirect loop on `/trainer` even when logged in.

### Pitfall 3: Serialization of Prisma Objects to Client
**What goes wrong:** `Error: Only plain objects can be passed to Client Components from Server Components.`
**Why it happens:** Prisma returns objects with Date instances and other non-serializable types. Next.js RSC-to-client boundary requires plain JSON.
**How to avoid:** Map Prisma results to plain objects before passing as props. Convert `Date` to ISO string: `date: session.date.toISOString()`.
**Warning signs:** Runtime error on page load; often only appears in production build, not dev.

### Pitfall 4: GapScore Table Depends on Phase 4 + 5
**What goes wrong:** `/trainer/[slug]` gap trend chart shows no data.
**Why it happens:** GapScore records and `readinessStatus` are written by Phases 4 and 5. If those phases haven't executed yet, the table is empty.
**How to avoid:** Implement proper empty state: check `associate.gapScores.length === 0` and render placeholder. Do NOT assume data exists.
**Warning signs:** Chart renders but shows empty state even for associates with multiple sessions.

### Pitfall 5: Design System Conflict
**What goes wrong:** `/trainer` page looks mismatched with intended design — dark navy background from inherited globals.
**Why it happens:** `globals.css` sets `body { background: var(--nlm-bg-primary) }` which is `#0f1525`. DESIGN.md specifies `#F5F0E8` (warm parchment).
**How to avoid:** Either (a) scope the new design tokens in a per-route CSS class, or (b) introduce the DESIGN.md tokens into `globals.css` as a parallel token set alongside existing ones. Do NOT apply new background globally without verifying existing pages still look correct.
**Warning signs:** Existing `/dashboard` or `/interview` pages break visually after adding parchment background.

### Pitfall 6: recharts ResponsiveContainer Height of 0
**What goes wrong:** Chart renders but has zero height and is invisible.
**Why it happens:** `ResponsiveContainer` with `height="100%"` inside a parent with no defined height.
**How to avoid:** Always give `ResponsiveContainer` a fixed pixel height: `<ResponsiveContainer width="100%" height={240}>`. Never use `height="100%"` unless the parent container has an explicit height set.
**Warning signs:** Chart area is blank; no errors in console.

---

## Code Examples

### Roster Page Data Query
```typescript
// Source: Prisma 7 docs / prior phase research (Phase 1 RESEARCH.md)
// src/app/trainer/page.tsx (client component matching existing auth pattern)
const associates = await prisma.associate.findMany({
  include: {
    _count: { select: { sessions: true } },
    sessions: {
      orderBy: { date: 'desc' },
      take: 1,
      select: { date: true, overallTechnicalScore: true }
    }
  },
  orderBy: { readinessStatus: 'asc' }
})
```

### Associate Detail Page Data Query
```typescript
// Source: Prisma 7 docs — include with nested filtering
const associate = await prisma.associate.findUnique({
  where: { slug: params.slug },
  include: {
    sessions: {
      orderBy: { date: 'desc' },
      take: 10,
    },
    gapScores: {
      orderBy: [{ skill: 'asc' }, { weightedScore: 'asc' }]
    }
  }
})
```

### Gap Trend Data Transformation
```typescript
// Transform flat GapScore records into recharts-compatible format
// Source: CLAUDE.md §Gap Tracking Algorithm
function buildGapChartData(sessions: Session[], skill: string): GapDataPoint[] {
  return sessions
    .filter(s => s.skillScores?.[skill] !== undefined)
    .reverse()  // chronological order for x-axis
    .map((s, i) => ({
      session: `S${i + 1}`,  // or format date
      score: Math.round(s.skillScores[skill] * 100),
    }))
}
```

### Calibration Table
```typescript
// Source: types.ts QuestionAssessment — llmScore vs finalScore
function CalibrationView({ session }: { session: Session }) {
  const assessments = Object.values(session.assessments as Record<string, QuestionAssessment>)
  const scored = assessments.filter(a => a.llmScore !== undefined)
  return (
    <table>
      <thead>
        <tr>
          <th>Question</th>
          <th>AI Score</th>
          <th>Trainer Score</th>
          <th>Delta</th>
        </tr>
      </thead>
      <tbody>
        {scored.map(a => (
          <tr key={a.questionId}>
            <td>{a.questionId}</td>
            <td>{a.llmScore}</td>
            <td>{a.finalScore ?? '—'}</td>
            <td>{a.finalScore != null ? a.finalScore - (a.llmScore ?? 0) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

### Empty State Component
```typescript
// DASH-07: < 3 sessions gate
function EmptyGapState({ sessionCount }: { sessionCount: number }) {
  const needed = Math.max(0, 3 - sessionCount)
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-[#1A1A1A] text-base font-medium">
        {needed} more session{needed !== 1 ? 's' : ''} needed for gap analysis
      </p>
      <p className="text-[#7A7267] text-sm mt-1">
        {sessionCount} of 3 minimum sessions completed
      </p>
    </div>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-rendered dashboards with loading spinners | RSC + Suspense for instant HTML | Next.js 13+ | Dashboard first paint is server-rendered HTML; no flash of empty content |
| Chart libraries requiring window polyfills in SSR | `"use client"` boundary | Next.js 13+ App Router | Clean separation; no SSR hacks needed |
| Prop drilling chart data | Pass serialized plain objects from RSC to client | Next.js 13+ | Type-safe data flow without API round-trip |

**Deprecated/outdated:**
- `getServerSideProps` / `getStaticProps`: App Router pages use async RSC directly. Not applicable here.
- React context for dashboard data: Overkill. RSC passes data as props.

---

## Design System Implementation Notes

> CRITICAL: Read DESIGN.md in full before implementing any UI. All visual decisions are locked there.

### Key Tokens for Dashboard Pages
| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#F5F0E8` | Page background (NOT inherited dark navy) |
| `--surface` | `#FFFFFF` | Roster table, session cards |
| `--surface-muted` | `#F0EBE2` | KPI cards, sidebar strip |
| `--ink` | `#1A1A1A` | Primary text |
| `--muted` | `#7A7267` | Secondary text, metadata |
| `--accent` | `#C85A2E` | Readiness signals, CTAs, active nav |
| `--success` | `#2D6A4F` | "Ready" state |
| `--warning` | `#B7791F` | "Improving" state |
| `--danger` | `#B83B2E` | "Not ready" state |
| `--border` | `#DDD5C8` | Table rules, card borders |

### Typography
- **Page title:** 48px Clash Display 600 (CDN loaded)
- **Section title:** 28px Clash Display 600
- **Body:** 16px DM Sans 400
- **Table content:** 14px DM Sans 400 with tabular-nums
- **Metadata/badges:** 12px DM Sans 500-600
- **Section labels:** 11px JetBrains Mono 500, uppercase, 0.06-0.08em tracking

### Font Loading
Existing `layout.tsx` loads Inter and Geist Mono via `next/font/google`. DESIGN.md specifies Clash Display (jsDelivr CDN) and DM Sans (Google Fonts). These must be added:
- DM Sans: Add to `next/font/google` in `layout.tsx`
- Clash Display: Load via `<link>` in layout head (jsDelivr CDN) — not available in `next/font`

### Chart Colors (from DESIGN.md)
- Line stroke: `#C85A2E` (accent) for primary skill line
- Secondary lines: `#2D6A4F` (success), `#B7791F` (warning)
- Grid: `#DDD5C8` (border)
- Axis text: `#7A7267` (muted)
- Background: none (transparent) — card background provides surface

### Anti-patterns Explicitly Forbidden by DESIGN.md
- Purple/violet gradients (current codebase uses these heavily — do NOT carry into new pages)
- Glass morphism / backdrop-filter blur (`glass-card` classes)
- Glow effects / box-shadow glow animations
- Gradient text (`gradient-text-static` class exists in project — do NOT use)
- Neon/electric accent colors for charts

### Layout Spec
- Max content width: 1120px
- Sidebar: 200px (if adding trainer nav sidebar)
- KPI strip: 4-column grid at top
- 12-column grid, stack on mobile
- Border radius: lg (8px) for cards, xl (12px) for larger cards, sm (4px) for tags/badges

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm install, build | ✓ | v24.2.0 | — |
| npm | Package install | ✓ | 11.3.0 | — |
| recharts | DASH-03 gap charts | ✗ | not installed | None — must install |
| Prisma client | All data queries | Planned (Phase 1) | 7.7.0 | None — Phase 1 prerequisite |
| Supabase DB | All data queries | Planned (Phase 1) | — | None — Phase 1 prerequisite |

**Missing dependencies with no fallback:**
- recharts 3.8.1 — must run `npm install recharts@3.8.1` in Wave 0
- Prisma DB schema (Associate, GapScore models) — Phase 4 and 5 must be complete

**Missing dependencies with fallback:**
- None

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config, vitest.config, or test files found in project |
| Config file | None — Wave 0 must decide on framework |
| Quick run command | TBD after Wave 0 setup |
| Full suite command | TBD after Wave 0 setup |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASH-01 | `/trainer` renders associate roster with readiness badges | smoke / manual | `npm run build` (build check) | ❌ Wave 0 |
| DASH-02 | Associate detail shows last 5+ sessions | unit | test `buildSessionList()` data transform | ❌ Wave 0 |
| DASH-03 | Gap trend chart renders with correct data shape | unit | test `buildGapChartData()` transform function | ❌ Wave 0 |
| DASH-04 | Calibration view shows AI vs trainer scores | unit | test `CalibrationView` rendering with mock assessment data | ❌ Wave 0 |
| DASH-05 | Readiness badge reads pre-computed field (no recompute) | unit | assert no gap computation calls in roster query | ❌ Wave 0 |
| DASH-06 | Unauthenticated access redirects to login | manual / e2e | Playwright: navigate to `/trainer`, assert redirect | ❌ Wave 0 |
| DASH-07 | Empty state renders for < 3 sessions | unit | test `EmptyGapState` with `sessionCount` 0, 1, 2 | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run build` (TypeScript compile check)
- **Per wave merge:** Full test suite (once framework is set up in Wave 0)
- **Phase gate:** Build green + manual smoke of all 3 sections before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `npm install recharts@3.8.1` — DASH-03 dependency
- [ ] Test framework decision: recommend vitest (works with Next.js, no extra config) or playwright for e2e
- [ ] `src/components/trainer/` directory

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing `useAuth()` / `nlm_session` cookie — same as existing protected routes |
| V3 Session Management | yes | 24hr HttpOnly cookie expiry — inherited from existing auth |
| V4 Access Control | yes | Only authenticated users reach trainer route; no associate data exposed unauthenticated |
| V5 Input Validation | yes | `slug` URL param used in Prisma query — must validate format before query (alphanumeric + hyphens only, per Phase 3 decision) |
| V6 Cryptography | no | No cryptographic operations in this phase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Insecure Direct Object Reference on `/trainer/[slug]` | Information Disclosure | Validate slug is alphanumeric+hyphens; ensure auth gate runs before Prisma query; `findUnique` returns null for non-existent slug (no 500) |
| XSS via unescaped associate names or session data | Tampering | React JSX escapes by default; avoid `dangerouslySetInnerHTML` |
| Missing auth redirect (localStorage vs server) | Elevation of Privilege | Use `useAuth()` client pattern; do not rely solely on `isAuthenticatedSession()` server check without verifying cookie is set |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Phase 4 (GapScore) and Phase 5 (readinessStatus) complete before Phase 6 executes | Phase Requirements, Data Queries | Charts show no data; badges show incorrect values |
| A2 | `nlm_session` HttpOnly cookie is set by `/api/auth` login endpoint (not verified by codebase read) | Auth Pattern | RSC auth with `isAuthenticatedSession()` would silently fail; client pattern is safe fallback |
| A3 | Prisma `Associate` model includes `readinessStatus`, `recommendedArea`, `lastComputedAt` fields (from Phase 5 design) | Data Queries | Roster badge would fail at query time |
| A4 | Prisma `GapScore` model includes `skill`, `topic`, `weightedScore`, `sessionCount` fields (from Phase 4 design) | Gap Chart | Chart data transformation would fail |

---

## Open Questions

1. **Auth cookie: is `nlm_session` actually set by the login route?**
   - What we know: `auth-server.ts` checks for `nlm_session` cookie; `auth-context.tsx` only uses localStorage
   - What's unclear: Whether `/api/auth` POST sets the cookie (route not read in this research)
   - Recommendation: Read `/api/auth/route.ts` before implementing. If cookie IS set, RSC auth is viable. If not, use client pattern.

2. **Design system migration scope: new pages only or global?**
   - What we know: DESIGN.md defines warm parchment design; existing pages use dark navy
   - What's unclear: Whether trainer pages should look different from existing pages (mixed design), or if this phase triggers a full site re-skin
   - Recommendation: Scope new design tokens to `/trainer` routes only via a route-level CSS class; do not change `body` background globally; defer global re-skin to post-MVP

3. **Prisma models from Phases 3–5: exact field names?**
   - What we know: Context files specify concepts (readinessStatus, GapScore) but not exact Prisma field names
   - What's unclear: Whether fields are camelCase, snake_case, or have different names in actual schema
   - Recommendation: Read `prisma/schema.prisma` at plan time (will exist after Phases 1–3 execute)

---

## Sources

### Primary (HIGH confidence)
- npm registry — `npm view recharts version` and `npm view recharts peerDependencies` confirmed 3.8.1 current, React 19 compatible [VERIFIED]
- Codebase reads: `src/lib/auth-context.tsx`, `src/lib/auth-server.ts`, `src/app/dashboard/page.tsx`, `src/components/Navbar.tsx`, `src/lib/types.ts`, `package.json` [VERIFIED: codebase]
- `DESIGN.md` — all visual/typography/color decisions [VERIFIED: codebase]
- `CLAUDE.md` §Technology Stack — recharts 3.8.1 decided; RSC + fetch pattern decided [VERIFIED: codebase]
- Phase 1 RESEARCH.md — Prisma 7 stack and patterns [VERIFIED: .planning/phases/01-db-foundation/01-RESEARCH.md]

### Secondary (MEDIUM confidence)
- Prior phase CONTEXT.md files (03, 04, 05) — Prisma model design intent [CITED: .planning/phases/]
- REQUIREMENTS.md DASH-01 through DASH-07 [CITED: .planning/REQUIREMENTS.md]

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — recharts version verified npm registry; all other deps already in project
- Architecture: HIGH — RSC + client component pattern documented in prior phases; auth pattern verified from codebase
- Pitfalls: HIGH — auth mismatch verified by reading both auth files; recharts SSR pitfall is documented standard knowledge
- Design system: HIGH — DESIGN.md is authoritative and was read directly

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable stack; recharts and Next.js versions unlikely to change)
