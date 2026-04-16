# Phase 24: PDF Analytics Export — Context

**Gathered:** 2026-04-16
**Status:** Ready for planning
**Source:** /gsd-discuss-phase --auto

<domain>
## Phase Boundary

Add PDF export for cohort analytics (Dashboard > Reports) and per-associate analytics (associate detail page). Uses `@react-pdf/renderer` with hand-rolled SVG sparkline helper — no recharts inside PDF renderer (OOM risk on constrained Docker host).

**Out of scope:** Email delivery of PDFs (download only), scheduled/automated report generation, dark-mode PDF variants.

</domain>

<decisions>
## Implementation Decisions

### SVG Sparkline Helper (PDF-02 partial)
- **D-01:** Pure function `generateSparklineSvg(data: number[], width: number, height: number): string` that returns an SVG `<polyline>` path. No recharts dependency.
- **D-02:** Used inside `@react-pdf/renderer` `<Svg>` / `<Path>` components for inline sparklines in PDF tables.
- **D-03:** Handles edge cases: single data point (horizontal line), empty data (dash placeholder), all-same values (flat line).

### Cohort Analytics PDF (PDF-01)
- **D-04:** Exported from Dashboard > Reports page via "Export Cohort PDF" button.
- **D-05:** Template sections: NLM branded header (logo text, date, cohort name) → KPI snapshot (4 values matching KPI strip) → Gap-by-topic table (skill, topic, associates affected, avg score) → Roster summary (associate name, readiness status, trend word, top gap).
- **D-06:** Data fetched server-side via API route `/api/trainer/reports/cohort-pdf`. Returns PDF binary (Content-Type: application/pdf). Client triggers download via blob URL.

### Per-Associate PDF (PDF-02)
- **D-07:** Exported from trainer associate detail page (`/trainer/[slug]`) via "Export PDF" button.
- **D-08:** Template sections: NLM branded header → Associate info (name, readiness, cohort) → Gap trend SVG sparkline per skill → Session list table (date, overall score, mode) → Recommended areas.
- **D-09:** API route `/api/trainer/reports/associate-pdf?slug=<slug>`. Returns PDF binary.

### Export Trigger
- **D-10:** Download buttons — no email delivery. Button click hits the PDF API route, browser downloads the response.
- **D-11:** Filename format: `nlm-cohort-{cohortName}-{date}.pdf` and `nlm-{associateSlug}-{date}.pdf`.

### Memory Safety (SC 4)
- **D-12:** No recharts components inside `@react-pdf/renderer`. All charts rendered as hand-rolled SVG.
- **D-13:** PDF generation is synchronous in the API route handler. No streaming — the response is buffered and sent as a complete PDF.

### Claude's Discretion
- Exact SVG path computation algorithm (linear interpolation is fine)
- PDF page layout dimensions, margins, fonts
- Whether to use @react-pdf `Font.register` for Clash Display or fallback to system fonts
- Table styling in PDF (borders, padding, alternating rows)
- Logo rendering (text "NLM" or embedded image)

</decisions>

<canonical_refs>
## Canonical References

### Roadmap + Requirements
- `.planning/ROADMAP.md` — Phase 24, SC 1-4
- `.planning/REQUIREMENTS.md` — PDF-01, PDF-02

### Existing Code
- `src/lib/pdfTemplate.tsx` or similar — Existing PDF template from interview reports (pattern reference)
- `src/app/api/send-email/route.ts` — Existing PDF generation for interview reports
- `src/app/api/trainer/kpis/route.ts` — KPI data source (P22)
- `src/app/api/trainer/sparklines/route.ts` — Sparkline data source (P22)
- `src/app/api/trainer/gap-analysis/route.ts` — Gap analysis data (P22)
- `src/app/trainer/(dashboard)/reports/page.tsx` — Reports placeholder page (P21)

### Design System
- `DESIGN.md` — Brand colors for PDF header

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **@react-pdf/renderer** — Already installed, used for interview report PDFs.
- **KPI/sparkline/gap APIs** — All data sources exist from P22.
- **Reports placeholder page** — P21 created the stub, ready to replace.

### Integration Points
- New API routes: `/api/trainer/reports/cohort-pdf`, `/api/trainer/reports/associate-pdf`
- Download buttons on Reports page and associate detail page
- SVG helper is a standalone utility (no UI dependency)

</code_context>

<specifics>
## Specific Ideas

- SVG sparkline helper is the critical innovation — keeps recharts out of the PDF renderer context entirely.
- Cohort PDF reuses the same data queries as the KPI strip and gap analysis page — no new database queries needed.
- Per-associate PDF reuses gap score data already available on the detail page.

</specifics>

<deferred>
## Deferred Ideas

- **Email delivery of PDFs** — Could reuse Resend, but not in scope for v1.2.
- **Scheduled reports** — Auto-generate weekly cohort PDFs. Deferred to v1.3.
- **Custom PDF branding** — Upload logo, custom colors. Deferred.

</deferred>

---

*Phase: 24-pdf-analytics-export*
*Context gathered: 2026-04-16 via /gsd-discuss-phase --auto*
