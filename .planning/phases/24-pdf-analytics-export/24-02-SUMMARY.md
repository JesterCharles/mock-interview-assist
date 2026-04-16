---
phase: 24-pdf-analytics-export
plan: "02"
subsystem: pdf-api-routes
tags: [pdf, api-routes, trainer-ui, react-pdf, tdd]
dependency_graph:
  requires: [24-01-pdf-templates]
  provides: [cohort-pdf-route, associate-pdf-route, reports-page, associate-export-button]
  affects: [trainer-dashboard]
tech_stack:
  added: []
  patterns: [renderToBuffer-server-side, blob-download-trigger, prisma-queryRaw-inline, tdd-red-green]
key_files:
  created:
    - src/app/api/trainer/reports/cohort-pdf/route.ts
    - src/app/api/trainer/reports/cohort-pdf/route.test.ts
    - src/app/api/trainer/reports/associate-pdf/route.ts
    - src/app/api/trainer/reports/associate-pdf/route.test.ts
  modified:
    - src/app/trainer/(dashboard)/reports/page.tsx
    - src/app/trainer/(dashboard)/[slug]/page.tsx
decisions:
  - renderToBuffer element cast as unknown to bypass DocumentProps type mismatch (react-pdf internal type not exported)
  - new Response(buffer) instead of new NextResponse(buffer) — NextResponse BodyInit type is narrower
  - Associate.readinessScore field absent from schema — route uses NULL::float cast in raw SQL
  - Inline $queryRaw queries in PDF routes (not fan-out HTTP to existing route handlers)
metrics:
  duration: "~5 min"
  completed: "2026-04-16"
  tasks_completed: 3
  files_created: 4
  files_modified: 2
---

# Phase 24 Plan 02: PDF API Routes + UI Buttons Summary

Two authenticated PDF API routes (cohort + associate) wired to Plan 01 templates via `renderToBuffer`, with Export buttons in the trainer Reports page and associate detail page. 10 route tests covering auth, content-type, magic bytes, 400/404 guards.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | PDF API routes + TDD tests | b85e4e6 | cohort-pdf/route.ts, cohort-pdf/route.test.ts, associate-pdf/route.ts, associate-pdf/route.test.ts |
| 2 | Reports page + TS fixes | f78702f | reports/page.tsx, cohort-pdf/route.ts, associate-pdf/route.ts |
| 3 | Export PDF button on associate detail | 98de105 | [slug]/page.tsx |

## Decisions Made

1. **renderToBuffer type cast** — `React.createElement(...)  as unknown as Parameters<typeof renderToBuffer>[0]` because `@react-pdf/renderer`'s `renderToBuffer` expects `ReactElement<DocumentProps>` but our component props don't extend `DocumentProps` directly. The cast is safe — the renderer accepts any Document element at runtime.
2. **`new Response(buffer)` not `new NextResponse(buffer)`** — `NextResponse` narrows `BodyInit` in its constructor; `Response` accepts `Buffer` via the `BodyInit` cast.
3. **`Associate.readinessScore` absent from schema** — The Prisma schema only stores `readinessStatus` (string) not a numeric score. The raw SQL queries use `NULL::float as readiness_score` and the PDF template already handles `readinessScore: null` gracefully.
4. **Inline Prisma queries** — PDF routes replicate `$queryRaw` patterns from P22 routes inline, not via HTTP fan-out (per RESEARCH.md pattern 5 and anti-pattern note).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Associate.readinessScore field does not exist in Prisma schema**
- **Found during:** Task 2 TypeScript check
- **Issue:** Plan spec referenced `associate.readinessScore` but the Associate model only has `readinessStatus` (string) — no numeric score field
- **Fix:** Raw SQL uses `NULL::float as readiness_score`; `readinessScore: null` passed to template (template already handles null gracefully with `'—'` display)
- **Files modified:** cohort-pdf/route.ts, associate-pdf/route.ts

**2. [Rule 1 - Bug] renderToBuffer TypeScript type mismatch**
- **Found during:** Task 2 TypeScript check
- **Issue:** `renderToBuffer` expects `ReactElement<DocumentProps>` but component props don't structurally match `DocumentProps`
- **Fix:** `as unknown as Parameters<typeof renderToBuffer>[0]` cast; `new Response(buffer as unknown as BodyInit)` for binary response

## Known Stubs

None. Both routes fetch real DB data via Prisma and render actual PDF templates from Plan 01. Download buttons trigger real API calls.

## Threat Flags

None. Both routes implement T-24-02 (auth guard), T-24-03 (cohort ID integer validation), and T-24-04 (slug via Prisma parameterized query) as required by the plan's threat register.

## Self-Check: PASSED
