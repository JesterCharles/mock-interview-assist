# Phase 26: Design Tokens (Data-Viz) - Research

**Researched:** 2026-04-16
**Domain:** CSS design tokens + DESIGN.md documentation for data visualization
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 6 distinct series colors — map from existing semantic colors (success, warning, accent, danger) plus 2 additional earth tones that fit the warm editorial palette.
- **D-02:** Each color gets a `--chart-{n}` token in globals.css with light + dark pairs. Dark mode variants desaturate 10-15% per existing DESIGN.md pattern.
- **D-03:** Primary series line uses `--accent` (existing). Secondary+ use `--chart-1` through `--chart-5`.
- **D-04:** Follow the athletic stat-line pattern already in DESIGN.md readiness signals. Vocabulary: ascending, climbing, holding, dipping, stalling.
- **D-05:** Format: "[score] [trajectory word]" compact; "Improving +Npts over M sessions" narrative.
- **D-06:** Chart tooltips use `--surface` background, `--ink` text, `--border-subtle` border, `border-radius: var(--radius-lg)`.
- **D-07:** Tooltip shadow: `0 2px 8px rgba(0,0,0,0.08)` light, `0 2px 8px rgba(0,0,0,0.3)` dark.
- **D-08:** Axis labels: `--muted` color, 12px DM Sans.
- **D-09:** Grid lines: `--border-subtle` with strokeDasharray "3 3" for cartesian grids.
- **D-10:** No axis lines on clean charts (bar charts, radar) — grid only where it aids reading.

### Claude's Discretion
- Exact hex values for the 2 additional earth-tone chart colors (within warm palette constraints)
- Whether to include a `--chart-highlight` token for hover/active states on data points
- Organization of the Data Visualization section within DESIGN.md

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DESIGN-01 | DESIGN.md data-viz section documenting chart palette, typography, axis conventions, tooltip patterns, trajectory language | Existing DESIGN.md structure identified; section placement and content defined below |
| DESIGN-02 | Chart color tokens added to globals.css with light+dark pairs | Existing globals.css `:root` / `[data-theme="dark"]` pattern identified; token names and hex values determined |
</phase_requirements>

## Summary

Phase 26 is a pure documentation + CSS token phase — no component code changes. The deliverables are a new "Data Visualization" section appended to DESIGN.md and a new `/* Chart Tokens */` block added to globals.css. Both files are the established single source of truth (confirmed by CONTEXT.md canonical refs).

The existing codebase shows two patterns: `GapTrendChart.tsx` uses hardcoded hex values (the problem) while `RosterSparkline.tsx` and `CohortTrends.tsx` already use `var(--accent)` and other CSS vars (the correct pattern to generalize). The token definitions produced here become the target pattern that Phase 29 and Phase 31 will migrate all charts to.

Locked decisions fully specify the token structure, color mapping, axis conventions, tooltip styling, and trajectory language. The only discretion areas are the two additional earth-tone hex values and whether to add a `--chart-highlight` token.

**Primary recommendation:** Add 5 `--chart-*` tokens mapped from existing semantic colors + 2 new earth tones, document all conventions in DESIGN.md, and include `--chart-highlight` for hover states since Phase 29 will need it for interactive data points.

## Standard Stack

### Core (no new installs — documentation-only phase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.8.1 | Already installed; chart tokens are consumed by recharts `stroke`, `fill` props | Project standard, confirmed in CLAUDE.md |

No packages to install. This phase writes CSS and Markdown only.

## Architecture Patterns

### Existing Token Structure (globals.css)

Two blocks define the full color system: [VERIFIED: read globals.css]

```css
:root {
  /* light mode — all tokens here */
  --bg: #F5F0E8;
  --surface: #FFFFFF;
  /* ... */
}

[data-theme="dark"] {
  /* dark mode overrides — same token names */
  --bg: #1C1917;
  /* ... */
}
```

New chart tokens follow this exact same two-block pattern. No new mechanism needed.

### Chart Token Block to Add

Place after the existing semantic tokens in both `:root` and `[data-theme="dark"]`:

```css
/* Chart palette — DESIGN.md §Data Visualization */
/* Primary series: --accent (existing) */
--chart-1: /* warm sage — maps from --success family */;
--chart-2: /* amber — maps from --warning family */;
--chart-3: /* clay — maps from --danger family */;
--chart-4: /* warm taupe earth tone */;
--chart-5: /* deep umber earth tone */;
--chart-highlight: /* active dot / hover state */;
```

### Hex Value Determination (Claude's Discretion)

Existing semantic palette anchors: [VERIFIED: read globals.css and DESIGN.md]

| Token Source | Light Hex | Dark Hex |
|-------------|-----------|----------|
| `--success` | `#2D6A4F` | `#3D8B6A` |
| `--warning` | `#B7791F` | `#D4952A` |
| `--danger` | `#B83B2E` | `#D45040` |
| `--accent` | `#C85A2E` | `#D4743F` |

The 4 semantic-mapped chart colors derive from these. [ASSUMED] The two additional earth tones should be:
- `--chart-4`: warm taupe `#8C7B6E` light / `#A89080` dark (mid-brown, warmer than `--muted`)
- `--chart-5`: deep umber `#5C4A3A` light / `#7A6555` dark (dark earth, readable as a line)

The `--chart-highlight` token should be `--accent` at reduced opacity for light, same pattern for dark: `rgba(200, 90, 46, 0.15)` light / `rgba(212, 116, 63, 0.2)` dark.

### Recharts Token Consumption Pattern

`RosterSparkline.tsx` and `CohortTrends.tsx` demonstrate the correct pattern: [VERIFIED: read source files]

```tsx
// Correct — uses CSS var
stroke="var(--accent)"

// Incorrect — hardcoded hex (GapTrendChart.tsx, to be fixed in Phase 29)
stroke="#C85A2E"
const TOPIC_COLORS = ['#2D6A4F', '#B7791F', '#7A7267', '#C85A2E']
```

Recharts resolves CSS custom properties correctly when passed as string values to `stroke` and `fill` props.

### DESIGN.md Section Organization

DESIGN.md already has these top-level sections (in order): Product Context → Aesthetic Direction → Typography → Color → Spacing → Layout → Motion → Readiness Signal Pattern → Anti-Patterns → Decisions Log.

The new Data Visualization section should be inserted between **Readiness Signal Pattern** and **Anti-Patterns** — logical position since it expands on readiness signal display.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-theme color values | JS color objects or conditional logic in components | CSS custom properties | Auto-resolves on theme switch; zero JS overhead |
| Dark mode chart colors | `useTheme()` in every chart component | `var(--chart-n)` via `[data-theme="dark"]` | Same mechanism as all other tokens |

## Common Pitfalls

### Pitfall 1: `--radius-lg` Referenced but Not Defined
**What goes wrong:** CONTEXT.md D-06 specifies `border-radius: var(--radius-lg)` for tooltips but `--radius-lg` does not currently exist in globals.css — the file uses hardcoded `6px` and `8px` values in components, not a token.
**Why it happens:** DESIGN.md defines border radius as a scale (sm:4px, md:6px, lg:8px) but these are documented values, not CSS custom properties.
**How to avoid:** Either define `--radius-lg: 8px` in `:root` as part of this phase, or use the literal `8px` for tooltip `border-radius` in the DESIGN.md spec and note the discrepancy.
**Recommendation:** Define `--radius-sm`, `--radius-md`, `--radius-lg` in `:root` as part of this phase since DESIGN.md already documents the scale — makes tooltip and other component specs precise.

### Pitfall 2: Recharts Cannot Read CSS Vars in SVG Attributes on Some Older Browsers
**What goes wrong:** Recharts renders SVG; SVG `stroke`/`fill` attributes on older browsers (pre-2021) may not resolve CSS custom properties.
**Why it happens:** CSS custom properties in SVG are only reliable in modern browsers; RosterSparkline already uses `var(--accent)` without issues, confirming this project's target browser supports it.
**How to avoid:** No action needed — project already uses this pattern successfully. Document in DESIGN.md that tokens are modern-browser only. [VERIFIED: RosterSparkline uses `var(--accent)` in stroke with no fallback]

### Pitfall 3: Tailwind @theme Block Not Updated
**What goes wrong:** New `--chart-*` CSS vars are added to `:root` but the `@theme inline` Tailwind block is not updated, so `text-chart-1` or `bg-chart-1` utilities don't exist.
**Why it happens:** globals.css has a separate `@theme inline` block that maps CSS vars to Tailwind utilities.
**How to avoid:** Add `--color-chart-1` through `--color-chart-5` and `--color-chart-highlight` to the `@theme inline` block. Recharts doesn't need Tailwind utilities (uses `stroke` prop directly), but other components (legend swatches, skill bars in VIZ-01) will want `bg-chart-1` utilities.

### Pitfall 4: GapTrendChart Grid Uses `--border` Not `--border-subtle`
**What goes wrong:** Current GapTrendChart.tsx uses `stroke="#DDD5C8"` (hardcoded `--border` value) for CartesianGrid. D-09 specifies `--border-subtle` for grid lines.
**Why it happens:** Component was written before tokens were standardized.
**How to avoid:** Document the correct spec (`--border-subtle`) clearly in DESIGN.md. Phase 29 migration task will fix the component.

## Code Examples

### globals.css — New Token Block (complete)
```css
/* ========================================
   Chart Tokens — DESIGN.md §Data Visualization
   Primary series uses --accent (existing).
   Secondary series use --chart-1 through --chart-5.
   ======================================== */

/* :root additions (light) */
--chart-1: #2D6A4F;          /* warm sage — maps --success */
--chart-2: #B7791F;          /* amber — maps --warning */
--chart-3: #B83B2E;          /* clay — maps --danger */
--chart-4: #8C7B6E;          /* warm taupe (new earth tone) */
--chart-5: #5C4A3A;          /* deep umber (new earth tone) */
--chart-highlight: rgba(200, 90, 46, 0.15);   /* accent at low opacity */
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;

/* [data-theme="dark"] additions */
--chart-1: #3D8B6A;          /* sage light +20% */
--chart-2: #D4952A;          /* amber dark */
--chart-3: #D45040;          /* clay dark */
--chart-4: #A89080;          /* taupe desaturated 10-15% */
--chart-5: #7A6555;          /* umber lightened */
--chart-highlight: rgba(212, 116, 63, 0.2);
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
```

### globals.css — @theme inline additions
```css
/* add inside existing @theme inline block */
--color-chart-1: var(--chart-1);
--color-chart-2: var(--chart-2);
--color-chart-3: var(--chart-3);
--color-chart-4: var(--chart-4);
--color-chart-5: var(--chart-5);
--color-chart-highlight: var(--chart-highlight);
```

### Recharts usage pattern (for DESIGN.md example)
```tsx
// Primary series
<Line stroke="var(--accent)" strokeWidth={2} />

// Secondary series (use index into chart tokens)
<Line stroke="var(--chart-1)" strokeWidth={1.5} strokeDasharray="4 2" />
<Line stroke="var(--chart-2)" strokeWidth={1.5} strokeDasharray="4 2" />

// Tooltip
contentStyle={{
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '13px',
  color: 'var(--ink)',
}}

// Axis ticks
tick={{ fill: 'var(--muted)', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}

// CartesianGrid
<CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded hex in chart components | CSS custom properties via `var()` | Phase 26 (this phase) | Dark mode works automatically; single source of truth |
| No chart documentation | DESIGN.md §Data Visualization section | Phase 26 (this phase) | Downstream phases (29, 31) have unambiguous spec |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `--chart-4: #8C7B6E` (warm taupe) fits warm editorial palette | Code Examples | Low — hex is easily adjusted before committing DESIGN.md |
| A2 | `--chart-5: #5C4A3A` (deep umber) fits warm editorial palette | Code Examples | Low — hex is easily adjusted |
| A3 | Adding `--radius-sm/md/lg` tokens is in scope given D-06 references `var(--radius-lg)` | Architecture Patterns | Low — worst case the spec uses literal `8px` instead |

## Open Questions (RESOLVED)

1. **`--chart-highlight` inclusion**
   - What we know: D-06/D-07 cover tooltip styling; `--chart-highlight` is discretionary
   - What's unclear: Phase 29 will need a hover state for active dots on LineChart — is this token used for dot fill or for a background fill (e.g., on bar hover)?
   - Recommendation: Include `--chart-highlight` — Phase 29 will use it for `activeDot` fill and bar hover background. Cost of adding now is zero; cost of retrofitting is a context switch.

2. **Radius tokens scope**
   - What we know: DESIGN.md documents sm:4px, md:6px, lg:8px but no CSS vars exist for these
   - What's unclear: Should this phase define `--radius-*` tokens for all consumers, or just document the value in the tooltip spec?
   - Recommendation: Define `--radius-sm`, `--radius-md`, `--radius-lg` in this phase — they're already used by value everywhere, and D-06 references `var(--radius-lg)` so the planner should include this as an explicit task.

## Environment Availability

Step 2.6: SKIPPED — no external dependencies. Phase is documentation + CSS only.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4 |
| Config file | vitest.config.ts |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DESIGN-01 | DESIGN.md contains Data Visualization section with all required subsections | manual-only | N/A — markdown content verification | N/A |
| DESIGN-02 | globals.css contains `--chart-1` through `--chart-5` and `--chart-highlight` tokens in both `:root` and `[data-theme="dark"]` | manual / snapshot | N/A — CSS file content check | N/A |

Both requirements are documentation deliverables. Automated test coverage is not applicable — the planner should include manual verification steps (file content inspection) as the phase gate, not automated test commands.

### Wave 0 Gaps
None — no test files needed for a documentation-only phase.

## Security Domain

Not applicable — phase produces CSS custom properties and Markdown documentation only. No API routes, no data handling, no authentication changes.

## Sources

### Primary (HIGH confidence)
- [VERIFIED: read globals.css] — existing token structure, `[data-theme="dark"]` pattern, `@theme inline` block
- [VERIFIED: read DESIGN.md] — existing color values, aesthetic direction, anti-patterns, readiness signal vocabulary
- [VERIFIED: read GapTrendChart.tsx] — hardcoded hex values that need tokenization (`TOPIC_COLORS` array, inline hex strings)
- [VERIFIED: read RosterSparkline.tsx] — correct `var(--accent)` pattern to generalize
- [VERIFIED: read CohortTrends.tsx] — correct `var(--surface)`, `var(--muted)` patterns in tooltip

### Secondary (MEDIUM confidence)
- [CITED: CONTEXT.md] — all locked decisions D-01 through D-10

### Tertiary (LOW confidence — discretion items)
- [ASSUMED] Earth-tone hex values (`#8C7B6E`, `#5C4A3A`) — selected to match warm editorial palette constraint

## Metadata

**Confidence breakdown:**
- Token structure and placement: HIGH — globals.css pattern directly observed
- Color values (semantic-mapped): HIGH — derived directly from existing DESIGN.md/globals.css hex values
- Color values (new earth tones): LOW — discretion area, assumed from aesthetic constraints
- DESIGN.md section organization: HIGH — existing section order confirmed by reading the file
- Recharts CSS var compatibility: HIGH — RosterSparkline already uses `var(--accent)` successfully

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (stable — CSS token structure doesn't change)
