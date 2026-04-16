# Phase 26: Design Tokens (Data-Viz) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 26-design-tokens-data-viz
**Areas discussed:** Chart palette, Trajectory language, Tooltip styling, Axis/grid conventions
**Mode:** --auto (all decisions auto-selected)

---

## Chart Palette

| Option | Description | Selected |
|--------|-------------|----------|
| 4 colors | Match existing TOPIC_COLORS array | |
| 6 colors | Existing semantics + 2 earth tones | ✓ |
| 8 colors | Full extended palette | |

**User's choice:** [auto] 6 colors (recommended default)
**Notes:** Covers current skill count with room for growth. Maps to success/warning/accent/danger + 2 new earth tones.

---

## Trajectory Language

| Option | Description | Selected |
|--------|-------------|----------|
| Athletic stat line | ascending/climbing/holding/dipping/stalling | ✓ |
| Numeric only | +8pts, -3pts, flat | |
| Descriptive | "Getting stronger", "Needs work" | |

**User's choice:** [auto] Athletic stat line (recommended — matches existing readiness signal pattern)
**Notes:** Consistent with DESIGN.md readiness display pattern already established.

---

## Tooltip Styling

| Option | Description | Selected |
|--------|-------------|----------|
| Surface + ink tokens | --surface bg, --ink text, --border-subtle border | ✓ |
| Custom tooltip tokens | Dedicated --tooltip-* token set | |

**User's choice:** [auto] Surface + ink tokens (recommended — reuses existing tokens, auto dark mode)
**Notes:** No new token namespace needed. Consistent with card styling.

---

## Axis/Grid Conventions

| Option | Description | Selected |
|--------|-------------|----------|
| Muted + border-subtle | --muted labels, --border-subtle grid | ✓ |
| Dedicated axis tokens | --axis-label, --grid-line | |

**User's choice:** [auto] Muted + border-subtle (recommended — leverages existing design tokens)
**Notes:** Matches pattern already used in GapTrendChart but tokenized via CSS vars.

## Claude's Discretion

- Exact hex values for 2 additional earth-tone chart colors
- Whether to include --chart-highlight token
- DESIGN.md Data Visualization section organization

## Deferred Ideas

None
