# Phase 24: PDF Analytics Export — Research

**Researched:** 2026-04-16
**Domain:** @react-pdf/renderer server-side PDF generation, SVG sparklines, Next.js API route binary responses
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Pure function `generateSparklineSvg(data: number[], width: number, height: number): string` returns SVG `<polyline>` path string. No recharts dependency.
- **D-02:** SVG helper used inside `@react-pdf/renderer` `<Svg>` / `<Path>` components for inline sparklines.
- **D-03:** Edge cases handled: single data point (horizontal line), empty data (dash placeholder), all-same values (flat line).
- **D-04:** Cohort PDF exported from Dashboard > Reports via "Export Cohort PDF" button.
- **D-05:** Template sections: NLM branded header → KPI snapshot (4 values) → Gap-by-topic table → Roster summary.
- **D-06:** API route `/api/trainer/reports/cohort-pdf` returns PDF binary (Content-Type: application/pdf). Client triggers download via blob URL.
- **D-07:** Per-associate PDF exported from `/trainer/[slug]` via "Export PDF" button.
- **D-08:** Template sections: NLM branded header → Associate info → Gap trend SVG sparkline per skill → Session list table → Recommended areas.
- **D-09:** API route `/api/trainer/reports/associate-pdf?slug=<slug>`.
- **D-10:** Download buttons only — no email delivery.
- **D-11:** Filename format: `nlm-cohort-{cohortName}-{date}.pdf` and `nlm-{associateSlug}-{date}.pdf`.
- **D-12:** No recharts components inside `@react-pdf/renderer`. All charts hand-rolled SVG.
- **D-13:** PDF generation is synchronous in the API route handler — buffered, not streamed.

### Claude's Discretion
- Exact SVG path computation algorithm (linear interpolation is fine)
- PDF page layout dimensions, margins, fonts
- Whether to use `Font.register` for Clash Display or fallback to system fonts
- Table styling in PDF (borders, padding, alternating rows)
- Logo rendering (text "NLM" or embedded image)

### Deferred Ideas (OUT OF SCOPE)
- Email delivery of PDFs
- Scheduled/automated report generation
- Dark-mode PDF variants
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PDF-01 | Trainer exports cohort analytics PDF from Dashboard > Reports. Template: KPI strip snapshot + gap-by-topic table + roster summary. | Route pattern: `renderToBuffer` server-side. Data from existing `/api/trainer/kpis` + `/api/trainer/gap-analysis` + `/api/trainer` queries, replicated inline. |
| PDF-02 | Trainer exports per-associate PDF from associate detail page. Template: gap trend sparkline + session list + recommended areas. Sparkline uses hand-rolled SVG helper (no recharts in renderer). | SVG components confirmed available: `Svg`, `Polyline`, `Path`, `Line`. `renderToBuffer` returns `Buffer` directly usable in `NextResponse`. |
</phase_requirements>

---

## Summary

`@react-pdf/renderer` v4.3.1 is installed and working. The existing codebase uses it client-side via `pdf().toBlob()` (in `/pdf/page.tsx` and `src/app/page.tsx`). The new analytics PDF routes need server-side generation via `renderToBuffer()` — a function already exported from the package, confirmed available in Node.js context.

SVG support in `@react-pdf/renderer` is native — `Svg`, `Polyline`, `Path`, `Line`, `Rect`, `Circle`, `G`, `Defs`, `LinearGradient` are all exported and work as React components inside `Document`/`Page`. The sparkline helper will compute pixel coordinates from normalized data and emit a `<polyline points="...">` string, used directly via the `<Polyline>` component.

All data sources for both PDF templates already exist as P22 API routes. The PDF API routes can replicate the same Prisma queries inline (no need to fan out HTTP calls to other routes from within a server route handler).

**Primary recommendation:** `renderToBuffer(element)` → `Buffer` → `NextResponse` with `Content-Type: application/pdf` and `Content-Disposition: attachment`. SVG sparkline via `<Svg><Polyline points={computePoints(data, w, h)} /></Svg>`. No new packages needed.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-pdf/renderer | 4.3.1 (installed) / 4.5.1 (latest) | PDF generation server-side | Already installed; `renderToBuffer` confirmed exported; React 19 peer satisfied |

[VERIFIED: node_modules inspection + npm registry]

**No new packages required.** All PDF generation uses the already-installed `@react-pdf/renderer`.

### API: `renderToBuffer` (server-side)
```typescript
// Source: @react-pdf/renderer exports (verified in node_modules)
import { renderToBuffer, Document, Page, View, Text, Svg, Polyline, StyleSheet } from '@react-pdf/renderer'

// In Next.js Route Handler:
const buffer = await renderToBuffer(<MyDocument {...props} />)
return new NextResponse(buffer, {
  headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
  },
})
```
[VERIFIED: node_modules inspection — `renderToBuffer` is `typeof function`]

### Client-side download (existing pattern in codebase)
The `/pdf/page.tsx` uses `PDFDownloadLink` and `pdf().toBlob()` for client rendering. The new routes use the **server-side** `renderToBuffer` path instead — this is correct for API routes.

---

## Architecture Patterns

### Recommended File Layout
```
src/
├── lib/
│   └── pdf/
│       ├── sparklineHelper.ts           # generateSparklineSvg() pure function
│       ├── CohortAnalyticsPdf.tsx       # React component: Document/Page/View tree
│       └── AssociateAnalyticsPdf.tsx    # React component: Document/Page/View tree
├── app/api/trainer/reports/
│   ├── cohort-pdf/
│   │   └── route.ts                     # GET → query DB → renderToBuffer → binary response
│   └── associate-pdf/
│       └── route.ts                     # GET ?slug=<slug> → query DB → renderToBuffer
└── app/trainer/(dashboard)/
    └── reports/
        └── page.tsx                     # Replace stub with "Export Cohort PDF" button
```

The `[slug]/page.tsx` associate detail page already exists as `'use client'` — add "Export PDF" button there that hits `/api/trainer/reports/associate-pdf?slug={slug}` and triggers a blob download.

### Pattern 1: Server-Side PDF Route Handler
```typescript
// Source: @react-pdf/renderer docs pattern (verified: renderToBuffer confirmed exported)
import { renderToBuffer } from '@react-pdf/renderer'
import { getCallerIdentity } from '@/lib/identity'

export async function GET(request: Request) {
  const caller = await getCallerIdentity()
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ... fetch data via Prisma directly (NOT via fetch to other routes)

  const buffer = await renderToBuffer(<CohortAnalyticsPdf data={data} />)
  const date = new Date().toISOString().split('T')[0]
  const filename = `nlm-cohort-${cohortName}-${date}.pdf`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```
[VERIFIED: codebase pattern — existing routes follow same auth guard shape]

### Pattern 2: Client-Side Blob Download Trigger
```typescript
// In 'use client' component — triggers download from API route
async function handleExportPdf() {
  const res = await fetch(`/api/trainer/reports/associate-pdf?slug=${slug}`)
  if (!res.ok) return
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nlm-${slug}-${new Date().toISOString().split('T')[0]}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
```
[ASSUMED: standard browser blob-download pattern — no project-specific variant needed]

### Pattern 3: SVG Sparkline in @react-pdf/renderer
```typescript
// Source: verified — Svg + Polyline exported from @react-pdf/renderer
import { Svg, Polyline, Line } from '@react-pdf/renderer'

// Sparkline helper returns normalized points string "x1,y1 x2,y2 ..."
function generateSparklinePoints(data: number[], width: number, height: number): string {
  if (data.length === 0) return `0,${height / 2} ${width},${height / 2}`  // dash
  if (data.length === 1) return `0,${height / 2} ${width},${height / 2}`  // horizontal
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max === min ? 1 : max - min  // avoid div-by-zero (all-same = flat line)
  return data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((v - min) / range) * height  // invert: higher score = higher on chart
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

// Usage in PDF template:
<Svg width={60} height={20}>
  <Polyline
    points={generateSparklinePoints(scores, 60, 20)}
    stroke="#C85A2E"
    strokeWidth={1.5}
    fill="none"
  />
</Svg>
```
[VERIFIED: Polyline, Svg confirmed exported from @react-pdf/renderer in node_modules]

### Pattern 4: PDF Fonts
The existing `PDFReport.tsx` uses `fontFamily: 'Helvetica'` (built-in PDF font — no registration needed). This is the recommended approach for analytics PDFs to avoid network requests during server-side generation.

`Font.register` is available (`typeof function` confirmed) if Clash Display is needed, but it requires a resolvable font URL at render time. **Recommendation (Claude's discretion):** Use `Helvetica` (built-in) + `Helvetica-Bold` for headers. This removes font-fetch latency from the server render path. The PDF is a data export, not a brand showcase.

[VERIFIED: Helvetica is a built-in PDF font — always available in @react-pdf/renderer]

### Pattern 5: Data Queries in PDF Routes
**Do NOT fan-out HTTP fetch calls** from one route handler to another (e.g., hitting `/api/trainer/kpis` from within `/api/trainer/reports/cohort-pdf`). Instead, replicate the Prisma query directly in the PDF route, or extract the query into a shared service function that both routes import.

The P22 queries in `kpis/route.ts`, `gap-analysis/route.ts`, and `sparklines/route.ts` are self-contained `$queryRaw` calls. They can be extracted to `src/lib/analyticsQueries.ts` and imported by both the existing routes and the new PDF routes.

[ASSUMED: "shared query extraction" pattern — consistent with existing lib/ service pattern in codebase]

### Anti-Patterns to Avoid
- **Recharts inside @react-pdf/renderer:** OOM risk confirmed in CONTEXT.md. Enforced by D-12.
- **Streaming PDF response:** D-13 requires synchronous buffer. `renderToStream` would complicate the download trigger and error handling.
- **`pdf().toBlob()` server-side:** `.toBlob()` is a browser API — `renderToBuffer()` is the Node.js equivalent.
- **HTTP fan-out between route handlers:** Unnecessary latency + adds auth header complexity.
- **Font.register pointing to local filesystem:** In Next.js standalone Docker build, `public/` filesystem paths are unreliable post-build. Use CDN URLs or built-in fonts.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | Custom HTML→PDF converter, Puppeteer | @react-pdf/renderer (already installed) | Already in codebase; zero new deps |
| SVG polyline math | A charting library in the PDF renderer | Plain coordinate normalization function (~15 lines) | Recharts requires DOM; custom math is trivial here |
| Binary HTTP response | Base64 encoding + JSON wrapper | `NextResponse(buffer, { headers })` | `Buffer` works natively in Next.js route handlers |

---

## Common Pitfalls

### Pitfall 1: `pdf().toBlob()` vs `renderToBuffer()`
**What goes wrong:** Developer copies existing client-side pattern (`pdf().toBlob()`) into a server route. `.toBlob()` calls the Blob constructor which does not exist in Node.js.
**Why it happens:** Two distinct APIs exist — one browser, one Node.
**How to avoid:** In route handlers always use `await renderToBuffer(<Document>...)`.
**Warning signs:** `ReferenceError: Blob is not defined` at runtime.

### Pitfall 2: SVG `points` attribute — coordinate inversion
**What goes wrong:** Y-axis not inverted. Score 5 (best) renders at bottom of sparkline instead of top.
**Why it happens:** SVG coordinate space has Y=0 at top; higher scores should appear higher visually.
**How to avoid:** `y = height - normalizedValue * height`.

### Pitfall 3: `all-same values` causes NaN in sparkline
**What goes wrong:** `range = max - min = 0` → division by zero → NaN coordinates → broken SVG.
**Why it happens:** Associate who scored 3/5 on every session.
**How to avoid:** Guard: `const range = max === min ? 1 : max - min`. Produces a flat horizontal line (correct behavior, per D-03).

### Pitfall 4: BigInt serialization in PDF data queries
**What goes wrong:** `$queryRaw` COUNT returns `BigInt`; passing it as a prop to a React PDF component throws `TypeError: Do not know how to serialize a BigInt`.
**Why it happens:** P22 routes already handle this (explicit `Number()` cast). PDF routes must do the same.
**How to avoid:** `Number(row.associates_affected)` before passing to template. Already established pattern in existing analytics routes.

### Pitfall 5: @react-pdf/renderer `<Text>` does not accept numbers
**What goes wrong:** `<Text>{score}</Text>` where `score` is `number | null` throws or renders `null` as empty.
**Why it happens:** React PDF's `Text` requires string children.
**How to avoid:** Always coerce: `<Text>{score != null ? score.toFixed(1) : '—'}</Text>`.

### Pitfall 6: Font.register with local file paths in Docker
**What goes wrong:** `Font.register({ src: '/fonts/ClashDisplay.woff2' })` fails in the Docker standalone build because the file path resolves differently post-build.
**Why it happens:** Next.js standalone output copies only traced files; `public/` fonts may not be included.
**How to avoid:** Use built-in PDF fonts (`Helvetica`, `Helvetica-Bold`) or register from a CDN URL. Given discretion on font choice, Helvetica is the safe default.

---

## Code Examples

### Sparkline helper (complete)
```typescript
// src/lib/pdf/sparklineHelper.ts
export function generateSparklinePoints(
  data: number[],
  width: number,
  height: number,
): string {
  const padding = 2
  const innerH = height - padding * 2
  const innerW = width - padding * 2

  if (data.length === 0) {
    return `${padding},${height / 2} ${width - padding},${height / 2}`
  }
  if (data.length === 1) {
    return `${padding},${height / 2} ${width - padding},${height / 2}`
  }
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max === min ? 1 : max - min

  return data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * innerW
      const y = padding + innerH - ((v - min) / range) * innerH
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
```

### Using Polyline in PDF template
```tsx
// Source: @react-pdf/renderer — Svg + Polyline confirmed exported
import { Svg, Polyline } from '@react-pdf/renderer'
import { generateSparklinePoints } from '@/lib/pdf/sparklineHelper'

function SparklineCell({ scores }: { scores: number[] }) {
  return (
    <Svg width={60} height={20}>
      <Polyline
        points={generateSparklinePoints(scores, 60, 20)}
        stroke="#C85A2E"
        strokeWidth={1.5}
        fill="none"
      />
    </Svg>
  )
}
```

### Cohort PDF route skeleton
```typescript
// src/app/api/trainer/reports/cohort-pdf/route.ts
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { getCallerIdentity } from '@/lib/identity'
import { prisma } from '@/lib/prisma'
import { CohortAnalyticsPdf } from '@/lib/pdf/CohortAnalyticsPdf'

export async function GET(request: Request) {
  const caller = await getCallerIdentity()
  if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const cohortId = url.searchParams.get('cohort')
    ? Number.parseInt(url.searchParams.get('cohort')!, 10)
    : null

  // Fetch KPI, gap, roster data via Prisma directly
  const [kpiRows, gapRows, rosterRows] = await Promise.all([
    // ... same $queryRaw patterns as existing P22 routes
  ])

  const cohortName = 'cohort' // derive from data
  const date = new Date().toISOString().split('T')[0]

  const buffer = await renderToBuffer(
    <CohortAnalyticsPdf kpi={kpiRows[0]} gaps={gapRows} roster={rosterRows} />
  )

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="nlm-cohort-${cohortName}-${date}.pdf"`,
    },
  })
}
```

---

## Existing Code Reference

### PDFReport.tsx — established patterns
- `PDFStyleSheet.create()` for styles
- Built-in fonts only: `fontFamily: 'Helvetica'`
- `<PDFView>`, `<PDFText>`, `<PDFDocument>`, `<PDFPage>` — aliased imports
- No SVG usage in existing template (this phase adds it)
- `size="A4"` page, `padding: 40` margin standard
- `borderLeft` accent lines use `'3 solid #4F46E5'` (indigo from old design — **update to `#C85A2E` per DESIGN.md**)

### Data shapes available from existing types
- `KpiData` — `avgReadiness`, `mocksThisWeek`, `atRiskCount`, `topGapSkill`, `avgVariance`
- `GapAnalysisRow` — `skill`, `topic`, `associatesAffected`, `avgGapScore`
- `RosterAssociate` — `slug`, `displayName`, `readinessStatus`, `readinessScore`, `recommendedArea`, `sessionCount`
- `AssociateDetail` — extends RosterAssociate + `sessions: SessionSummary[]`, `gapScores: GapScoreEntry[]`, `cohortName`
- `RosterSparklineData` — `sparkline: SparklinePoint[]`, `trendWord`, `topGap`

### Reports page stub
`src/app/trainer/(dashboard)/reports/page.tsx` — 40 lines, pure server component, placeholder text only. Replace with client component containing "Export Cohort PDF" button + cohort selector.

### Associate detail page
`src/app/trainer/(dashboard)/[slug]/page.tsx` — `'use client'` component, already has `detail` state loaded. Add "Export PDF" button alongside existing actions.

---

## Environment Availability

Step 2.6: SKIPPED — No new external dependencies. `@react-pdf/renderer` already installed. All data sources exist as Prisma queries. No new CLIs, services, or runtimes needed.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 |
| Config file | `vitest.config.mts` |
| Quick run command | `npm run test -- --reporter=verbose` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PDF-01 | `GET /api/trainer/reports/cohort-pdf` returns 401 for anonymous | unit | `npm run test -- cohort-pdf` | ❌ Wave 0 |
| PDF-01 | `GET /api/trainer/reports/cohort-pdf` returns `Content-Type: application/pdf` for trainer | unit | `npm run test -- cohort-pdf` | ❌ Wave 0 |
| PDF-01 | `GET /api/trainer/reports/cohort-pdf` response body starts with `%PDF` magic bytes | unit | `npm run test -- cohort-pdf` | ❌ Wave 0 |
| PDF-02 | `GET /api/trainer/reports/associate-pdf?slug=x` returns 401 for anonymous | unit | `npm run test -- associate-pdf` | ❌ Wave 0 |
| PDF-02 | `GET /api/trainer/reports/associate-pdf?slug=x` returns 200 with PDF binary for trainer | unit | `npm run test -- associate-pdf` | ❌ Wave 0 |
| PDF-02 | `generateSparklinePoints` handles empty, single, all-same, and normal data | unit | `npm run test -- sparklineHelper` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- [test-file-pattern]`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/app/api/trainer/reports/cohort-pdf/route.test.ts` — covers PDF-01
- [ ] `src/app/api/trainer/reports/associate-pdf/route.test.ts` — covers PDF-02
- [ ] `src/lib/pdf/sparklineHelper.test.ts` — covers D-01, D-03 edge cases

---

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `getCallerIdentity()` — trainer-only guard on both PDF routes |
| V3 Session Management | no | Route handlers are stateless |
| V4 Access Control | yes | PDF routes must reject `associate` and `anonymous` callers — same guard as all `/api/trainer/*` routes |
| V5 Input Validation | yes | `cohort` query param: validate as integer before Prisma query. `slug` query param: validate non-empty string, passed to Prisma parameterized query (no injection risk). |
| V6 Cryptography | no | No crypto operations |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized PDF access (data exfiltration) | Information Disclosure | `getCallerIdentity()` trainer guard — same as all P22 routes |
| Cohort ID / slug injection | Tampering | `Number.parseInt()` guard on cohortId; Prisma parameterized `$queryRaw` for slug |
| PDF generation DoS (large dataset) | Denial of Service | [ASSUMED] Not explicitly guarded; low risk in single-trainer deploy. Acceptable for MVP. |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Client blob-download pattern (fetch → createObjectURL → anchor click) works in existing `'use client'` pages without special handling | Code Examples | Browser API change unlikely; low risk |
| A2 | Shared query extraction to `src/lib/analyticsQueries.ts` is the right pattern for DRY reuse between existing P22 routes and new PDF routes | Architecture Patterns | If P22 routes are simple enough, inline queries in PDF routes are also fine — discretionary |
| A3 | Built-in Helvetica/Helvetica-Bold is sufficient for PDF; Font.register for Clash Display not needed for analytics exports | Architecture Patterns — fonts | If brand consistency is required in PDF, would need Font.register with CDN URL |
| A4 | PDF generation for cohort-level data (up to ~50 associates per cohort) stays within default Next.js 30s timeout | Common Pitfalls | For large cohorts could be slow; acceptable for MVP single-trainer deploy |

---

## Open Questions

1. **Should the PDF routes reuse P22 `$queryRaw` inline or extract to shared query functions?**
   - What we know: P22 routes have identical query logic; copy-paste works but creates duplication
   - What's unclear: Whether the planner wants DRY extraction (adds a task) vs inline copies (simpler)
   - Recommendation: Extract to `src/lib/analyticsQueries.ts` — consistent with existing `src/lib/*` service pattern in the codebase

2. **Cohort selector on Reports page**
   - What we know: The topbar cohort switcher (SHELL-04) propagates `?cohort=<id>` as a URL param
   - What's unclear: Whether the Reports page should read the cohort param from the URL automatically or have its own explicit selector
   - Recommendation: Read `?cohort=<id>` URL param in the Reports page (consistent with gap-analysis and KPI strip behavior in P22)

---

## Sources

### Primary (HIGH confidence)
- `node_modules/@react-pdf/renderer/package.json` — version 4.3.1 confirmed installed, React 19 peer satisfied
- `node_modules/@react-pdf/renderer` exports inspection — `renderToBuffer`, `Svg`, `Polyline`, `Path`, `Line`, `Rect`, `Circle`, `Font` all confirmed `typeof function`/`string`
- `src/components/PDFReport.tsx` — existing PDF template (font choices, StyleSheet patterns, component aliases)
- `src/app/pdf/page.tsx` — client-side `pdf().toBlob()` pattern (contrast with server-side approach)
- `src/app/api/trainer/kpis/route.ts` — KPI query shape and `KpiData` type
- `src/app/api/trainer/sparklines/route.ts` — sparkline query + `computeSlope`/`computeTrendWord` utilities
- `src/app/api/trainer/gap-analysis/route.ts` — gap query shape and `GapAnalysisRow` type
- `src/lib/trainer-types.ts` — all data shape interfaces
- `src/app/trainer/(dashboard)/reports/page.tsx` — placeholder stub confirmed: 40-line server component, ready to replace
- `src/app/trainer/(dashboard)/[slug]/page.tsx` — `'use client'` detail page, `detail: AssociateDetail` state available

### Secondary (MEDIUM confidence)
- `npm view @react-pdf/renderer version` → 4.5.1 latest (installed 4.3.1 is two minors behind; no breaking changes expected for this use case)

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package installed, exports verified in node_modules
- Architecture: HIGH — server-side renderToBuffer + Prisma queries follows exact same pattern as all P22 routes
- SVG sparkline: HIGH — Svg/Polyline components confirmed exported; coordinate math is elementary
- Pitfalls: HIGH — sourced from reading existing codebase patterns and P22 BigInt handling

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (stable library, no fast-moving dependencies)
