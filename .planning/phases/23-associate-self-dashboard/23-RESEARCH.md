# Phase 23: Associate Self-Dashboard — Research

**Researched:** 2026-04-16
**Domain:** Next.js App Router — associate-scoped dashboard, recharts, Supabase auth identity guard
**Confidence:** HIGH

## Summary

Phase 23 replaces a one-line redirect stub at `/associate/[slug]/dashboard` with a real self-service dashboard. All infrastructure is already in place: recharts 3.8.1 is installed, gap-scores API exists, readiness fields are on the Associate model, settings API returns the threshold, and `getCallerIdentity()` resolves Supabase-backed associate identity. The main work is (1) adding a `layout.tsx` with `AssociateNav` tabs, (2) building the dashboard page from existing data sources, and (3) gating the page with a slug ownership check.

The critical constraint is the `/api/associates/[slug]/gap-scores` route — it currently requires trainer or admin auth and returns 401 for associates. The dashboard page is server-rendered and can query Prisma directly by `associateId` instead of calling this API, bypassing the trainer-only gate cleanly. Alternatively, the route can be extended to allow `caller.kind === 'associate' && caller.associateSlug === slug`. Both are valid; direct Prisma is simpler for a server component.

The existing `GapTrendChart` component from the trainer detail page is client-rendered and imports recharts. It can be reused directly for the associate dashboard — the data shape (`GapScoreEntry[]` + `SessionSummary[]`) is standard and will be available from a direct Prisma query.

**Primary recommendation:** Build the dashboard as a server component that queries Prisma directly (bypassing the trainer-gated gap-scores API), reuses `GapTrendChart` for the chart, and adds `AssociateNav` as a layout-level component.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `AssociateNav` component with 3 tabs: Dashboard, Profile, Book a Mock. Rendered in `src/app/associate/[slug]/layout.tsx`.
- **D-02:** Dashboard tab is default landing (replaces P19 redirect stub).
- **D-03:** Profile tab links to existing `/associate/[slug]` page.
- **D-04:** Book a Mock tab renders the CTA inline (not a separate page).
- **D-05:** Recharts `<LineChart>` for gap trend. Same visual pattern as trainer gap trend charts.
- **D-06:** Data from `/api/associates/[slug]/gap-scores` (may need enrichment). Or Prisma direct.
- **D-07:** One line per skill, color-coded. Legend shows skill names. Time axis shows session dates.
- **D-08:** Single card showing `Associate.recommendedArea` with one-line "why" (e.g. "Your lowest gap score is in JavaScript — 62%").
- **D-09:** "Not now" dismiss button hides the card for 7 days via `localStorage` key `nlm_dismiss_recommended_{slug}` with timestamp.
- **D-10:** Card reappears after 7 days or when `recommendedArea` changes.
- **D-11:** Horizontal progress bar. Fill = current weighted readiness percentage. Threshold line marker at cohort threshold value.
- **D-12:** Threshold fetched from `/api/settings` (GET). No cohort-mate names shown.
- **D-13:** Label: "Your Readiness: X% (Target: Y%)". Color: green >= threshold, amber within 10%, red below.
- **D-14:** `mailto:` link to trainer email with pre-filled subject "Book a Mock Interview — {associateName}".
- **D-15:** Minimum viable — no in-app scheduling.
- **D-16:** Dashboard page verifies `caller.associateSlug === params.slug` — returns 403 if mismatch.

### Claude's Discretion
- Exact chart configuration (axis labels, colors per skill)
- Card component styling details
- Whether gap-scores API needs enrichment for time-series or if existing data shape suffices
- AssociateNav tab icons (lucide-react)
- Progress bar animation

### Deferred Ideas (OUT OF SCOPE)
- Full mock scheduling (calendar integration, availability picker)
- Streaks / badges / gamification
- Cohort-mate comparison
- Push notifications
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ASELF-01 | New route `/associate/[slug]/dashboard` with `AssociateNav` tabs (Dashboard / Profile / Book a Mock) and personal gap trend chart | AssociateNav is a new layout component. Dashboard page fetches GapScores via Prisma direct. GapTrendChart is reusable from `src/components/trainer/GapTrendChart.tsx`. |
| ASELF-02 | "Recommended Next Practice Area" card with `recommendedArea`, one-line why, 7-day localStorage dismiss | `Associate.recommendedArea` is pre-computed and stored on the Associate row. The why string is derived from the GapScore weighted value. Dismiss requires client component for localStorage access. |
| ASELF-03 | Readiness-goal progress bar (current vs threshold, no cohort-mate names) | `Associate.readinessStatus` + computed weighted avg from GapScores. Threshold from `/api/settings`. Progress bar color logic is pure computation. |
| ASELF-04 | "Book a Mock" CTA — mailto link with pre-filled subject | Trainer email sourced from associate's cohort or a Settings fallback. Minimal: `<a href="mailto:...">`. |
</phase_requirements>

---

## Standard Stack

### Core (all already installed) [VERIFIED: package.json]

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^3.8.1 | Gap trend LineChart | Already installed, used by trainer detail page |
| lucide-react | ^0.562.0 | Tab icons in AssociateNav | Already installed throughout app |
| Next.js App Router | 16 | Server components, layout.tsx | Project framework |
| Prisma | 7.7.0 | Direct DB queries in server components | Project ORM |
| Zod | 4.3.6 | API input validation | Project standard |

### No new dependencies required.

```bash
# Nothing to install — all packages already present
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/app/associate/[slug]/
├── layout.tsx                    # NEW — renders AssociateNav + slot for children
├── dashboard/
│   └── page.tsx                  # REPLACE stub — real server-rendered dashboard
├── page.tsx                      # EXISTS — profile page (Profile tab target)
└── interview/
    └── page.tsx                  # EXISTS — unchanged

src/components/associate/
├── AssociateNav.tsx              # NEW — tab nav component (client, for active state)
├── RecommendedAreaCard.tsx       # NEW — client component (localStorage dismiss)
└── ReadinessProgressBar.tsx      # NEW — presentational, can be server or client
```

### Pattern 1: Associate-Scoped Layout

`src/app/associate/[slug]/layout.tsx` is a **new file** — no existing layout exists at this path. It wraps all child pages with `AssociateNav`. The layout receives `params` as a Promise (Next.js 16 async params pattern).

```typescript
// Source: [ASSUMED] — consistent with Next.js App Router layout pattern used throughout codebase
// (e.g., src/app/trainer/layout.tsx)
interface AssociateLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function AssociateLayout({ children, params }: AssociateLayoutProps) {
  const { slug } = await params;
  return (
    <>
      <AssociateNav slug={slug} />
      {children}
    </>
  );
}
```

### Pattern 2: Dashboard Page — Server Component with Direct Prisma

The dashboard page is a server component. It does NOT call `/api/associates/[slug]/gap-scores` (trainer-gated) — instead it queries Prisma directly after identity verification.

```typescript
// Source: pattern consistent with /associate/[slug]/page.tsx [VERIFIED: codebase read]
export default async function AssociateDashboardPage({ params }: Props) {
  const { slug } = await params;
  const caller = await getCallerIdentity();

  // D-16: slug ownership check
  if (caller.kind === 'associate' && caller.associateSlug !== slug) {
    return renderForbidden(); // 403 equivalent — same pattern as profile page
  }
  if (caller.kind === 'anonymous') {
    redirect('/signin?as=associate&next=/associate/' + slug + '/dashboard');
  }

  const associate = await prisma.associate.findUnique({
    where: { slug },
    include: {
      gapScores: true, // all gap scores (skill-level + topic-level)
      sessions: {
        where: { status: 'completed' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, date: true, overallTechnicalScore: true, overallSoftSkillScore: true, status: true, assessments: true },
      },
    },
  });
  // ...
}
```

### Pattern 3: Recommended Area Card — Client Component (localStorage)

`RecommendedAreaCard` must be a `'use client'` component because it reads/writes `localStorage`. The server passes `recommendedArea`, `lowestScore`, and `slug` as props.

```typescript
'use client'
// Dismiss logic:
const key = `nlm_dismiss_recommended_${slug}`;
const stored = localStorage.getItem(key);
// stored format: JSON { dismissedAt: ISO, recommendedArea: string }
// Reshow if: no entry, or dismissedAt > 7 days ago, or recommendedArea changed
```

[ASSUMED] — D-09/D-10 from CONTEXT.md specifies the localStorage key and 7-day logic. Implementation detail.

### Pattern 4: Readiness Progress Bar

The weighted readiness percentage for display is derived from the associate's skill-level GapScores (same data the server already queries). The progress bar threshold comes from `/api/settings` GET — but since the dashboard is server-rendered, call `getSettings()` directly (imported service function, not HTTP fetch).

```typescript
// Source: src/lib/settingsService.ts [VERIFIED: codebase read]
import { getSettings } from '@/lib/settingsService';
const settings = await getSettings(); // { readinessThreshold: number }
```

Color logic per D-13:
- `readinessPercent >= threshold` → `var(--success)` (green)
- `readinessPercent >= threshold - 10` → `var(--warning)` (amber)
- else → `var(--danger)` (red)

### Pattern 5: GapTrendChart Reuse

`GapTrendChart` at `src/components/trainer/GapTrendChart.tsx` accepts `gapScores: GapScoreEntry[]` and `sessions: SessionSummary[]`. Both types are in `src/lib/trainer-types.ts`. The chart will work for associate view as-is. [VERIFIED: codebase read]

The existing chart shows a **skill selector dropdown** and renders one skill at a time (skill-level + topic breakdown lines). For the associate self-dashboard this is appropriate — same UX.

**Limitation:** The existing GapScore model stores an aggregate `weightedScore` per (associateId, skill, topic) — not per-session snapshots. There is no time-series of gap scores across sessions. The chart's `buildGapChartData` function handles this by falling back to showing the aggregate as a point anchored to `sessionCount`. This means the chart will show a KPI-style single-value display when fewer than 2 data points exist, not a trend line. This is the existing behavior in the trainer view and is correct.

### Anti-Patterns to Avoid

- **Calling `/api/associates/[slug]/gap-scores` from the dashboard server component:** This endpoint requires trainer auth (returns 401 for associates). Use direct Prisma instead.
- **Calling `/api/settings` via HTTP fetch from a server component:** Import `getSettings()` directly — no HTTP round-trip needed.
- **Making `AssociateNav` a server component:** It needs to know the active tab (current pathname). Use `usePathname()` from `next/navigation` — requires `'use client'`.
- **Storing dismiss state in server DB:** CONTEXT.md explicitly specifies localStorage — do not add a DB field.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Gap trend chart | Custom SVG chart | `GapTrendChart` (recharts) | Already built, tested, matches design system |
| Readiness classification | Re-implement cascade | Read `Associate.readinessStatus` from DB | Pre-computed on every session save by readinessPipeline |
| Settings threshold | Custom config fetch | `getSettings()` from settingsService | Singleton already managed, no HTTP needed |
| Identity check | Custom cookie parse | `getCallerIdentity()` | Supabase-backed, verified, already audited (P20) |

---

## Common Pitfalls

### Pitfall 1: Gap Scores API Requires Trainer Auth

**What goes wrong:** Dashboard server component calls `/api/associates/[slug]/gap-scores` — gets 401 because the route guards require `caller.kind === 'trainer' || 'admin'`. [VERIFIED: codebase read — route.ts line 26-28]

**How to avoid:** Query Prisma directly in the server component using the `associateId` from `getCallerIdentity()`. No API call needed.

### Pitfall 2: Settings API Also Requires Trainer Auth

**What goes wrong:** Fetching threshold via `fetch('/api/settings')` from server component returns 401 for associate callers.

**How to avoid:** Import and call `getSettings()` from `src/lib/settingsService.ts` directly. [VERIFIED: settingsService.ts is a plain async function, no auth check inside it]

### Pitfall 3: No layout.tsx Exists at associate/[slug]

**What goes wrong:** Planner assumes layout file exists and tasks modify it — it doesn't exist yet.

**How to avoid:** Wave 0 task creates `src/app/associate/[slug]/layout.tsx`. This is a new file. [VERIFIED: filesystem scan]

### Pitfall 4: AssociateNav Active Tab Needs usePathname

**What goes wrong:** Building `AssociateNav` as a server component — `usePathname()` is a client-only hook.

**How to avoid:** Mark `AssociateNav.tsx` as `'use client'` and use `usePathname()` for active tab detection. [ASSUMED — Next.js App Router requirement]

### Pitfall 5: GapTrendChart Hardcodes Hex Colors

**What goes wrong:** `GapTrendChart` currently uses literal hex values (`#7A7267`, `#1A1A1A`, etc.) instead of CSS vars, violating DESIGN.md. CONTEXT.md says reuse the same visual pattern.

**How to avoid:** Reuse the existing component as-is (it's an established pattern already shipping). DESIGN.md compliance cleanup is out of scope for this phase. Flag for QA phase.

### Pitfall 6: Readiness Percentage Derivation

**What goes wrong:** `Associate.readinessStatus` ('ready'/'improving'/'not_ready') is a string classification, not a percentage. The progress bar needs a numeric percentage.

**How to avoid:** Compute the weighted average from `gapScores` where `topic = ''` (skill-level rows) at render time — same calculation as `computeReadiness()` does. Formula: `avg = sum(weightedScore) / count`. Multiply by 100 for display. [VERIFIED: readinessService.ts lines 133-138]

---

## Code Examples

### AssociateNav Tab Structure

```typescript
// Source: [ASSUMED] — mirrors trainer layout tab pattern
'use client'
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const TABS = [
  { label: 'Dashboard', href: (slug: string) => `/associate/${slug}/dashboard` },
  { label: 'Profile',   href: (slug: string) => `/associate/${slug}` },
  { label: 'Book a Mock', href: null }, // renders inline CTA via D-04
];
```

### Readiness Percentage from GapScores

```typescript
// Source: derived from readinessService.ts computeReadiness [VERIFIED: codebase read]
const skillLevelScores = gapScores.filter(g => g.topic === '');
const readinessPercent = skillLevelScores.length > 0
  ? (skillLevelScores.reduce((sum, g) => sum + g.weightedScore, 0) / skillLevelScores.length) * 100
  : 0;
```

### Recommended Area "Why" String

```typescript
// Source: [ASSUMED] — D-08 specifies the pattern
const lowestSkill = gapScores
  .filter(g => g.topic === '')
  .sort((a, b) => a.weightedScore - b.weightedScore)[0];

const whyText = lowestSkill
  ? `Your lowest gap score is in ${lowestSkill.skill} — ${Math.round(lowestSkill.weightedScore * 100)}%`
  : null;
```

### Book a Mock mailto

```typescript
// Source: [ASSUMED] — D-14/D-15 from CONTEXT.md
const subject = encodeURIComponent(`Book a Mock Interview — ${associate.displayName ?? associate.slug}`);
const mailtoHref = `mailto:${trainerEmail}?subject=${subject}`;
```

**Trainer email sourcing:** `Associate.cohort` has no `trainerEmail` field in the current schema. The `Settings` model also has no trainer email field. This needs a new `Settings.trainerEmail` column OR a hardcoded env var `TRAINER_EMAIL`. This is an **open question** that the planner must address. See Open Questions below.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| P19 redirect stub at `/associate/[slug]/dashboard` | Real dashboard with gap trends + readiness bar | Replace the stub entirely |
| PIN-based associate auth (deprecated) | Supabase magic-link + `getCallerIdentity()` | Identity resolution is clean and consistent |
| Trainer-only gap-scores API | Server component with direct Prisma | No auth route needed for associate self-view |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `AssociateNav` needs `'use client'` for `usePathname()` active tab | Architecture Patterns | If wrong, could be server component with pathname from params — low risk, trivial fix |
| A2 | Trainer email for mailto sourced from new `Settings.trainerEmail` field or env var | Code Examples | If env var is preferred, no schema migration needed — simpler. If Settings field, Wave 0 needs migration. Needs planner decision. |
| A3 | Dismiss card logic uses `{ dismissedAt: ISO, recommendedArea: string }` JSON in localStorage | Architecture Patterns 3 | Shape doesn't matter as long as 7-day + change detection works — low risk |

---

## Open Questions

1. **Trainer email source for mailto CTA**
   - What we know: `Associate.cohort` has no `trainerEmail` field. `Settings` has no `trainerEmail` field.
   - What's unclear: Should this phase add `Settings.trainerEmail String?` via migration, use a new env var `TRAINER_EMAIL`, or leave the mailto href with an empty `to:` field until a later phase?
   - Recommendation: Add `TRAINER_EMAIL` env var (simplest, no migration). Planner adds Wave 0 task to document env var. If unset, `mailto:` renders without `to` (opens mail client, user fills in address). This keeps the phase scope tight.

2. **GapScores data shape for time-series vs aggregate**
   - What we know: `GapScore` stores aggregate `weightedScore`, not per-session snapshots. The chart will show KPI-style display for most associates (1 data point per skill), not a true trend line.
   - What's unclear: Is this acceptable for the MVP, or does the phase need to add per-session gap score snapshots?
   - Recommendation: Accept aggregate display for now (consistent with trainer detail page behavior). True time-series requires schema change — defer to a future phase.

---

## Environment Availability

Step 2.6: SKIPPED — phase is code/config changes only. No external tool dependencies beyond the existing stack (Prisma, Supabase, recharts all confirmed installed).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4 |
| Config file | vitest.config.ts (project root) |
| Quick run command | `npm run test -- --run src/app/associate` |
| Full suite command | `npm run test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ASELF-01 | Dashboard page renders for authenticated associate (own slug) | unit | `npm run test -- --run src/app/associate/\\[slug\\]/dashboard` | No — Wave 0 |
| ASELF-01 | 403 rendered when associate slug mismatch | unit | same | No — Wave 0 |
| ASELF-01 | Anonymous → redirect to /signin | unit | same | No — Wave 0 |
| ASELF-02 | RecommendedAreaCard dismiss writes localStorage | unit | `npm run test -- --run src/components/associate` | No — Wave 0 |
| ASELF-03 | Readiness percentage computed correctly from GapScores | unit | `npm run test -- --run src/app/associate/\\[slug\\]/dashboard` | No — Wave 0 |
| ASELF-04 | Book a Mock mailto href correct format | unit | same | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- --run src/app/associate`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/app/associate/[slug]/dashboard/page.test.tsx` — covers ASELF-01, ASELF-03, ASELF-04 guard matrix
- [ ] `src/components/associate/RecommendedAreaCard.test.tsx` — covers ASELF-02 localStorage dismiss logic

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `getCallerIdentity()` — Supabase-backed, verified P20 |
| V3 Session Management | no | Handled by Supabase + middleware |
| V4 Access Control | yes | slug ownership check: `caller.associateSlug === params.slug` (D-16) |
| V5 Input Validation | yes | slug validated via `validateSlug()` (existing utility) |
| V6 Cryptography | no | No new crypto |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Horizontal privilege escalation (associate A views associate B's dashboard) | Spoofing | D-16: server-side slug ownership check after `getCallerIdentity()` |
| Trainer viewing associate dashboard | Elevation of privilege | Allow — trainers can view any associate (consistent with existing profile page pattern) |
| Unauthenticated access to dashboard | Spoofing | Middleware guards `/associate/*` — redirects to `/signin` |

**Note:** The existing `/api/associates/[slug]/gap-scores` route is NOT called by this dashboard (trainer-gated). New Prisma queries in the server component filter by `associateId` from `getCallerIdentity()` — no slug injection risk.

---

## Project Constraints (from CLAUDE.md)

- **Design system:** DESIGN.md is mandatory — use CSS vars (`--ink`, `--muted`, `--accent`, `--success`, `--warning`, `--danger`, `--border-subtle`, `--surface`) not hex literals for new components.
- **TypeScript:** All new files in TypeScript. No `any` types.
- **Testing:** Vitest. Tests required for new routes and components.
- **Auth:** `getCallerIdentity()` is the only identity resolution path — no PIN cookie, no custom JWT.
- **Styling:** Tailwind CSS 4 + inline styles with DESIGN tokens. No new CSS frameworks.
- **State:** Zustand only if client state is persistent. For this phase: localStorage for dismiss (no Zustand needed), no interview store mutation.
- **No code review self-review:** Codex plugin handles code review — planner should not include self-review tasks.
- **GSD workflow:** All tasks go through GSD wave execution.

---

## Sources

### Primary (HIGH confidence)
- `src/components/trainer/GapTrendChart.tsx` — recharts LineChart pattern, GapScoreEntry/SessionSummary data shape [VERIFIED: codebase read]
- `src/app/api/associates/[slug]/gap-scores/route.ts` — trainer-only auth guard confirmed [VERIFIED: codebase read]
- `src/lib/readinessService.ts` — readiness percentage computation from GapScores [VERIFIED: codebase read]
- `src/lib/settingsService.ts` — `getSettings()` importable directly, no auth check inside [VERIFIED: codebase read]
- `src/lib/identity.ts` — `getCallerIdentity()` returns `associateSlug` on associate callers [VERIFIED: codebase read]
- `src/middleware.ts` — `/associate/*` guarded for any authenticated user [VERIFIED: codebase read]
- `prisma/schema.prisma` — Associate model fields (readinessStatus, recommendedArea, cohortId, authUserId) [VERIFIED: codebase read]
- `package.json` — recharts 3.8.1, lucide-react 0.562.0 confirmed installed [VERIFIED: npm view + package.json]

### Tertiary (LOW confidence — assumptions)
- AssociateNav `'use client'` requirement for `usePathname()` [ASSUMED — Next.js App Router docs]
- localStorage shape for dismiss tracking [ASSUMED — implementation detail]
- `TRAINER_EMAIL` env var as simplest path for mailto source [ASSUMED — no trainer email field in current schema]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified installed
- Architecture: HIGH — all data sources and patterns confirmed in codebase
- Pitfalls: HIGH — all auth/data issues verified directly in source code
- Open questions: MEDIUM — trainer email sourcing needs planner decision

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (stable — no fast-moving dependencies)
