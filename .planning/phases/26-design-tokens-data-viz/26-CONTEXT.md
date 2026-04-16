# Phase 26: Design Tokens (Data-Viz) - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Define the data visualization design language in DESIGN.md and add corresponding CSS custom properties to globals.css. This phase produces documentation and tokens — no component changes. Downstream phases (29, 31) consume these tokens when building/fixing charts.

</domain>

<decisions>
## Implementation Decisions

### Chart Palette
- **D-01:** 6 distinct series colors — enough for multi-skill charts with room for growth. Map from existing semantic colors (success, warning, accent, danger) plus 2 additional earth tones that fit the warm editorial palette.
- **D-02:** Each color gets a `--chart-{n}` token in globals.css with light + dark pairs. Dark mode variants desaturate 10-15% per existing DESIGN.md pattern.
- **D-03:** Primary series line uses `--accent` (existing). Secondary+ use `--chart-1` through `--chart-5`.

### Trajectory Language
- **D-04:** Follow the athletic stat-line pattern already in DESIGN.md readiness signals. Vocabulary: ascending, climbing, holding, dipping, stalling. Applied to trend descriptions throughout the app.
- **D-05:** Format: "[score] [trajectory word]" for compact display, "Improving +Npts over M sessions" for narrative context (per VIZ-04 requirement).

### Tooltip Styling
- **D-06:** Chart tooltips use `--surface` background, `--ink` text, `--border-subtle` border, `border-radius: var(--radius-lg)`. Automatic dark mode via existing CSS variable system.
- **D-07:** Tooltip shadow: subtle `0 2px 8px rgba(0,0,0,0.08)` light, `0 2px 8px rgba(0,0,0,0.3)` dark.

### Axis & Grid Conventions
- **D-08:** Axis labels: `--muted` color, 12px DM Sans (matches existing GapTrendChart pattern but tokenized).
- **D-09:** Grid lines: `--border-subtle` with strokeDasharray "3 3" for cartesian grids.
- **D-10:** No axis lines on clean charts (bar charts, radar) — grid only where it aids reading.

### Claude's Discretion
- Exact hex values for the 2 additional earth-tone chart colors (within warm palette constraints)
- Whether to include a `--chart-highlight` token for hover/active states on data points
- Organization of the Data Visualization section within DESIGN.md

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `DESIGN.md` — Current design system (color, typography, spacing, motion, anti-patterns). New Data-Viz section goes here.
- `src/app/globals.css` — CSS custom properties for all design tokens. New `--chart-*` tokens added here.

### Existing Chart Implementations (reference for tokenization)
- `src/components/trainer/GapTrendChart.tsx` — Hardcoded hex colors that need tokenization
- `src/components/trainer/RosterSparkline.tsx` — Already uses `var(--accent)` — correct pattern to follow
- `src/components/trainer/CohortTrends.tsx` — Already uses CSS vars — correct pattern

### Requirements
- `.planning/REQUIREMENTS.md` §Design Tokens — DESIGN-01, DESIGN-02

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- DESIGN.md already has full color system, typography, spacing, motion — extend it, don't restructure
- globals.css has light/dark mode token pattern established — follow same structure for chart tokens

### Established Patterns
- CSS custom properties with light/dark mode via `[data-theme="dark"]` or media query
- Recharts used across trainer dashboard (LineChart, AreaChart, sparklines)
- `TOPIC_COLORS` array in GapTrendChart.tsx is the hardcoded pattern to replace with tokens

### Integration Points
- globals.css is the single source for all CSS tokens
- DESIGN.md is the single source for design documentation
- No component changes in this phase — components adopt tokens in Phase 29/31

</code_context>

<specifics>
## Specific Ideas

No specific requirements — extend existing warm editorial palette with earth-tone chart colors. Follow the athletic stat-line pattern already established for readiness signals.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 26-design-tokens-data-viz*
*Context gathered: 2026-04-16*
