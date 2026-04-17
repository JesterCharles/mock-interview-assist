# Phase 29: Associate Data Visualization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 29-associate-data-visualization
**Areas discussed:** Skill bars layout, Focus area hero, Dashboard skill filter, Radar plot, Score coloring

---

## Skill Bars Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal bars in cards | Each skill = card with bar, score, arrow. Stacked vertically. | |
| Compact table rows | Dense table-like, no card borders. | |
| Expandable skill cards | Collapsed: name + bar + score + arrow. Click to expand topic breakdown. | ✓ |

**User's choice:** Expandable skill cards with per-topic breakdown

| Option | Description | Selected |
|--------|-------------|----------|
| Weakest first | Lowest score at top | |
| Strongest first | Highest score at top | ✓ |
| Alphabetical | Predictable position | |

**User's choice:** Strongest first

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, click-to-filter | Click card = select as dashboard filter + expand | ✓ |
| Expand only | Click just toggles expand/collapse | |

**User's choice:** Click-to-filter (dual behavior)

| Option | Description | Selected |
|--------|-------------|----------|
| Lucide arrows + color | TrendingUp green, TrendingDown red, Minus muted | ✓ |
| Trajectory word + arrow | Word + small arrow | |
| Arrow only, no color | Simple monochrome arrows | |

**User's choice:** Lucide arrows with direction-based coloring

---

## Focus Area Hero

| Option | Description | Selected |
|--------|-------------|----------|
| Replace RecommendedAreaCard | New hero replaces old card entirely | ✓ |
| Keep both | Hero + separate recommendation card | |

**User's choice:** Replace — delete old RecommendedAreaCard

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible | No dismiss. Content changes as skills improve. | ✓ |
| Dismissible | 7-day dismiss like current card | |

**User's choice:** Always visible

---

## Dashboard Skill Filter

| Option | Description | Selected |
|--------|-------------|----------|
| URL search param | ?skill=X, deep-linkable, server-refetch | |
| Client state (useState) | Instant filter, no page reload | ✓ |
| Zustand store | Persists across navigation | |

**User's choice:** Client state (useState)

| Option | Description | Selected |
|--------|-------------|----------|
| Filter + highlight | Selected auto-expands, others collapse. Charts filter. | |
| Highlight only | All visible. Selected gets visual emphasis. | ✓ |

**User's choice:** Highlight only — nothing hides

**Deselect:** User wanted both — click selected skill again (toggle) AND explicit "All skills" chip.

---

## Radar Plot

| Option | Description | Selected |
|--------|-------------|----------|
| Dashed line + muted label | <3 sessions = dashed + muted. 3+ = solid + ink. | ✓ |
| Excluded from radar | Only 3+ sessions shown | |
| Dotted fill area | Solid fill for ready, dotted overlay for insufficient | |

**User's choice:** Dashed line + muted label

| Option | Description | Selected |
|--------|-------------|----------|
| Below trend chart | Full-width below charts | |
| Sidebar / right column | 2-column layout: radar on right | ✓ |
| Above skill bars | First visual after hero | |

**User's choice:** Right column — triggers 2-column dashboard layout

**2-column layout:** User chose "You decide" for exact column arrangement.

---

## Score Coloring

User specified: RED > ORANGE > YELLOW > GREEN > BLUE ascending expertise order.

| Option | Description | Selected |
|--------|-------------|----------|
| Even 20% bands | Equal 20% segments | |
| Weighted toward middle | More granularity in 40-70% range | |
| Threshold-relative | User specified custom bands | ✓ |

**User's choice:** Red 0-40%, Orange 41-60%, Yellow 61-79%, Green 80-89%, Blue 90-100%

| Option | Description | Selected |
|--------|-------------|----------|
| Map to existing tokens | Reuse --danger, --warning, --accent, --success + new --mastery | ✓ |
| New score color scale | Dedicated --score-* tokens | |

**User's choice:** Map to existing tokens, add one new --mastery token

---

## Claude's Discretion

- 2-column layout proportions and responsive breakpoint
- CSS grid vs flexbox for layout
- RadarChart configuration
- --mastery hex value
- Skill card expand animation
- Trend chart area fill vs line only
