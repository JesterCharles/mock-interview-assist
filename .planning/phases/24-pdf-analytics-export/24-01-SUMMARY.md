---
phase: 24-pdf-analytics-export
plan: "01"
subsystem: pdf-templates
tags: [pdf, analytics, sparkline, react-pdf, svg]
dependency_graph:
  requires: []
  provides: [sparklineHelper, CohortAnalyticsPdf, AssociateAnalyticsPdf, pdfStyles]
  affects: [24-02-api-routes]
tech_stack:
  added: []
  patterns: [react-pdf-renderer, hand-rolled-svg-sparkline, shared-styleshee, tdd-red-green]
key_files:
  created:
    - src/lib/pdf/sparklineHelper.ts
    - src/lib/pdf/sparklineHelper.test.ts
    - src/lib/pdf/pdfStyles.ts
    - src/lib/pdf/CohortAnalyticsPdf.tsx
    - src/lib/pdf/AssociateAnalyticsPdf.tsx
  modified: []
decisions:
  - Built-in Helvetica fonts used (no Font.register) to avoid font-fetch latency in renderToBuffer
  - 2px internal padding on sparkline to prevent point clipping at SVG edges
  - Roster table uses fixed-width column overrides for Status/Trend/Gap/Sparkline to prevent overflow
metrics:
  duration: "~2 min"
  completed: "2026-04-16"
  tasks_completed: 3
  files_created: 5
---

# Phase 24 Plan 01: PDF Templates + Sparkline Helper Summary

SVG sparkline helper (pure function, no recharts) + shared PDF StyleSheet + CohortAnalyticsPdf + AssociateAnalyticsPdf using @react-pdf/renderer with Helvetica fonts, ember accent (#C85A2E), and 7 passing unit tests.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Sparkline helper + tests (TDD) | d8c1fdc | sparklineHelper.ts, sparklineHelper.test.ts |
| 2 | Shared styles + CohortAnalyticsPdf | a509980 | pdfStyles.ts, CohortAnalyticsPdf.tsx |
| 3 | AssociateAnalyticsPdf | 0b30381 | AssociateAnalyticsPdf.tsx |

## Decisions Made

1. **Helvetica fonts** — No `Font.register` call; built-in PDF fonts avoid network dependency during `renderToBuffer` on Docker (Pitfall 6 per research).
2. **2px padding in sparkline** — Prevents the first/last polyline points from being clipped at the SVG viewport edge.
3. **Fixed-width column overrides** — CohortAnalyticsPdf roster columns (Status/Trend/TopGap/Sparkline) use explicit width values to prevent overflow into the association name column.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All components accept real data props — no hardcoded placeholder values. Wave 2 (Plan 02) wires these templates to API routes that supply actual DB data.

## Threat Flags

None. This plan creates only library code (templates + helpers). No request handling, no data access. Trust boundaries are enforced in Plan 02.

## Self-Check: PASSED

Files confirmed:
- FOUND: src/lib/pdf/sparklineHelper.ts
- FOUND: src/lib/pdf/sparklineHelper.test.ts
- FOUND: src/lib/pdf/pdfStyles.ts
- FOUND: src/lib/pdf/CohortAnalyticsPdf.tsx
- FOUND: src/lib/pdf/AssociateAnalyticsPdf.tsx

Commits confirmed:
- d8c1fdc — feat(24-01): add SVG sparkline helper with edge-case tests
- a509980 — feat(24-01): add shared PDF styles and CohortAnalyticsPdf template
- 0b30381 — feat(24-01): add AssociateAnalyticsPdf template
