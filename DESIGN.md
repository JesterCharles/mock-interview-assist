# Design System — Next Level Mock

## Product Context
- **What this is:** A readiness engine for technical talent. AI-scored mock interviews with gap tracking and trainer dashboard.
- **Who it's for:** Trainers managing associate cohorts (primary), associates taking mock interviews (secondary)
- **Space/industry:** Technical training / talent assessment / EdTech
- **Project type:** Web app — data-dense trainer dashboard + conversational interview experience

## Aesthetic Direction
- **Direction:** Editorial/Utilitarian — "assessment dossier" energy
- **Decoration level:** Intentional — no glass morphism, no glow effects, no gradient text. Subtle warm borders, matte card surfaces, crisp horizontal rules for visual rhythm. Decoration earns its place by aiding comprehension.
- **Mood:** Warm authority. This product makes readiness judgments with career consequences. The design should feel like it takes that seriously, not like an AI startup demo. Credible in daylight, in an office, in a review meeting.
- **Visual thesis:** Three independent AI voices (Claude, Codex/GPT-5.4, Claude subagent) converged on this direction: warm paper surfaces, charcoal typography, surgically restrained accent color. Text and data dominate. Decoration disappears.

## Typography
- **Display/Hero:** Clash Display (Indian Type Foundry, free) — geometric, assertive. Used for readiness scores, page titles, KPI values. "82% Ready" needs to hit hard.
- **Body:** DM Sans (Google Fonts, free) — clean, excellent readability, tabular-nums support for data tables. Used for body text, UI labels, table content.
- **UI/Labels:** DM Sans (same as body)
- **Data/Tables:** DM Sans with `font-variant-numeric: tabular-nums`
- **Code:** JetBrains Mono
- **Loading:** Google Fonts CDN for DM Sans + JetBrains Mono, jsDelivr CDN for Clash Display variable font
- **Scale:**
  - 64px — Hero display (Clash Display 600)
  - 48px — Page title (Clash Display 600)
  - 28px — Section title (Clash Display 600)
  - 22px — Card title / question text (Clash Display 600)
  - 18px — Large body (DM Sans 400)
  - 16px — Body (DM Sans 400)
  - 14px — Secondary body / table content (DM Sans 400)
  - 13px — UI labels, nav items (DM Sans 500)
  - 12px — Metadata, badges (DM Sans 500-600)
  - 11px — Mono labels, section labels (JetBrains Mono 500, uppercase, 0.06-0.08em tracking)

## Color
- **Approach:** Restrained — one accent (burnt orange) + one growth color (eucalyptus). Everything else is warm neutrals.

### Light Mode
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#F5F0E8` | Page background (warm parchment) |
| `--surface` | `#FFFFFF` | Cards, panels, elevated surfaces |
| `--surface-muted` | `#F0EBE2` | Subtle backgrounds, sidebar, KPI cards |
| `--ink` | `#1A1A1A` | Primary text, headings |
| `--muted` | `#7A7267` | Secondary text, metadata, placeholders |
| `--accent` | `#C85A2E` | Primary action, readiness signals, CTAs |
| `--accent-hover` | `#B04E27` | Accent hover state |
| `--success` | `#2D6A4F` | Ready state, positive trends, growth |
| `--warning` | `#B7791F` | Progressing state, attention needed |
| `--danger` | `#B83B2E` | At-risk state, errors, destructive actions |
| `--border` | `#DDD5C8` | Primary borders, table rules |
| `--border-subtle` | `#E8E2D9` | Subtle dividers, card internal borders |
| `--highlight` | `#FFF8F0` | Hover rows, active nav background |

### Dark Mode
| Token | Hex | Notes |
|-------|-----|-------|
| `--bg` | `#1C1917` | Deep warm charcoal (NOT navy) |
| `--surface` | `#262220` | Elevated surfaces |
| `--surface-muted` | `#2E2A27` | Subtle backgrounds |
| `--ink` | `#E8E2D9` | Primary text |
| `--muted` | `#9C9488` | Secondary text |
| `--accent` | `#D4743F` | Desaturated 10-15% for eye strain |
| `--accent-hover` | `#E0854F` | |
| `--success` | `#3D8B6A` | |
| `--warning` | `#D4952A` | |
| `--danger` | `#D45040` | |
| `--border` | `#3D3733` | |
| `--border-subtle` | `#332F2B` | |
| `--highlight` | `#2E2520` | |

### Semantic Badge Colors
- Success badge: bg `#E8F5EE`, text `--success` (dark: bg `#1A2E24`)
- Warning badge: bg `#FEF3E0`, text `--warning` (dark: bg `#2E2518`)
- Danger badge: bg `#FDECEB`, text `--danger` (dark: bg `#2E1C1A`)

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable for dashboard views, tighter for data tables
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)

## Layout
- **Approach:** Grid-disciplined
- **Grid:** 12-column on desktop (1120px max), stack on mobile
- **Max content width:** 1120px
- **Sidebar:** 200px for trainer dashboard navigation
- **KPI strip:** 4-column grid at top of dashboard
- **Border radius:** sm:4px (tags), md:6px (nav items), lg:8px (inputs, buttons, cards-inner), xl:12px (cards, modals), full:9999px (badges, pills)
- **Composition:** Asymmetric. Let one chart or roster table own the viewport. Don't stack equal-weight cards.

## Motion
- **Approach:** Minimal-functional
- **Kill list (REMOVED in Phase 15):** gradient-shift, float, pulse-glow, shimmer, recording-pulse, border-glow-pulse, progress-glow — all keyframes deleted from `globals.css`. Do not reintroduce.
- **Keep:** slide-up (200ms ease-out) for page transitions, fade-in (150ms ease-out) for async content loading
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) for hover states, short(150-200ms) for transitions, medium(250-350ms) for layout shifts
- **Rule:** No decorative motion. Every animation must aid comprehension or provide feedback.

## Readiness Signal Pattern
Display readiness as bold typography, not traffic-light badges:
- "**91** ascending" (success color)
- "**68** climbing" (accent color)
- "**42** stalling" (danger color)
- Score in Clash Display 700, trend word in 11px DM Sans 600 lowercase
- Treats associates like athletes with stat lines, not students with grades

## Data Visualization

### Chart Palette

Six-color series system. Primary series uses `--accent`; secondary series use `--chart-1` through `--chart-5`. Dark mode variants desaturate 10-15% per the existing color pattern. Neon/electric chart colors are forbidden (see Anti-Patterns).

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--accent` | `#C85A2E` | `#D4743F` | Primary data line in single-series charts |
| `--chart-1` | `#2D6A4F` | `#3D8B6A` | Warm sage — maps from `--success` |
| `--chart-2` | `#B7791F` | `#D4952A` | Amber — maps from `--warning` |
| `--chart-3` | `#B83B2E` | `#D45040` | Clay — maps from `--danger` |
| `--chart-4` | `#8C7B6E` | `#A89080` | Warm taupe (earth tone) |
| `--chart-5` | `#5C4A3A` | `#7A6555` | Deep umber (earth tone) |
| `--chart-highlight` | `rgba(200,90,46,0.15)` | `rgba(212,116,63,0.2)` | Hover/active dot fill, bar hover background |

### Recharts Usage Pattern

Canonical code for consuming tokens in recharts:

```tsx
// Primary series
<Line stroke="var(--accent)" strokeWidth={2} />

// Secondary series
<Line stroke="var(--chart-1)" strokeWidth={1.5} />
<Line stroke="var(--chart-2)" strokeWidth={1.5} />

// Area fill
<Area fill="var(--chart-highlight)" stroke="var(--accent)" />
```

Recharts resolves CSS custom properties in SVG `stroke` and `fill` attributes on modern browsers. No JS color resolution needed.

Tailwind utilities (`bg-chart-1`, `text-chart-1`, etc.) are available via `@theme inline` mappings in `globals.css` — use for non-SVG chart elements (legends, skill bars, badges).

### Axis & Grid Conventions

Axis tick labels use `--muted` color, 12px DM Sans:
```tsx
tick={{ fill: 'var(--muted)', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}
```

Cartesian grid lines use `--border-subtle` with dashed pattern:
```tsx
<CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
```

Clean charts (bar, radar) omit axis lines entirely. Grid lines only where they aid reading (line charts, area charts).

### Tooltip Styling

All chart tooltips use this `contentStyle`:
```tsx
contentStyle={{
  backgroundColor: 'var(--surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '13px',
  color: 'var(--ink)',
}}
```

Dark mode shadow: `0 2px 8px rgba(0,0,0,0.3)`. CSS custom properties handle the color switch automatically; the shadow is the only value that does not auto-switch (acceptable — the difference is subtle).

### Trajectory Language

Extends the athletic stat-line pattern from Readiness Signal Pattern.

**Vocabulary** (strongest to weakest):

| Word | Meaning | When to Use |
|------|---------|-------------|
| ascending | Strong upward trend | slope > +3pts/session over 3+ sessions |
| climbing | Moderate improvement | slope +1 to +3pts/session |
| holding | Flat / stable | slope -1 to +1pts/session |
| dipping | Moderate decline | slope -1 to -3pts/session |
| stalling | Sustained weakness or decline | slope < -3pts/session or avg below threshold with no improvement |

**Display formats:**

- **Compact:** "[score] [trajectory word]" — e.g., "82 ascending" (roster badges, sparkline labels)
- **Narrative:** "Improving +Npts over M sessions" — e.g., "Improving +8pts over 3 sessions" (focus area hero, trend chart captions)

**Narrative mapping:**

| Trajectory | Narrative Prefix |
|-----------|-----------------|
| ascending / climbing | "Improving" |
| holding | "Holding steady" |
| dipping | "Slipping" |
| stalling | "Needs focus" |

## Anti-Patterns (never use)
- Purple/violet gradients
- Glass morphism / backdrop-filter blur
- Glow effects / box-shadow glow animations
- Gradient text / animated gradient backgrounds
- Floating/bouncing decorative animations
- 3-column icon grids with colored circles
- Centered everything with uniform spacing
- Uniform bubbly border-radius on all elements
- Neon/electric accent colors for charts (use earth/ink tones)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-13 | Initial design system created | Three AI voices (Claude, Codex/GPT-5.4, Claude subagent) independently converged on warm editorial direction. Research confirmed category dominated by dark-mode AI demos and enterprise gray. Warm parchment + burnt orange = instant differentiation. |
| 2026-04-13 | Clash Display over Söhne | Both Codex and subagent recommended Söhne (Klim, $200+ license). Clash Display is free, geometric, assertive. 90% of the authority at $0. |
| 2026-04-13 | DM Sans over Söhne for body | Same licensing rationale. DM Sans has tabular-nums, clean at small sizes, free via Google Fonts. |
| 2026-04-13 | Light-first, warm paper default | Category risk: every competitor is dark-mode-first or corporate blue-gray. Warm parchment (#F5F0E8) stands out. "Credible in daylight." |
| 2026-04-13 | Burnt orange accent (#C85A2E) | No other assessment tool uses orange. Codex: #C65A2E, subagent: #D4440F. Split the difference. Memorable, warm, urgent without alarming. |
| 2026-04-13 | Readiness as typography not badges | From Claude subagent: "82 ascending" > green dot. More information density, more emotional impact. Treats associates like athletes. |
| 2026-04-15 | Legacy `--nlm-*` tokens + decorative utilities deleted | v1.1 Phase 15 unified every route on the DESIGN tokens. All `--nlm-*` custom properties, decorative utility classes, and kill-list keyframes removed from `globals.css`. Playwright regression + legacy-deletion specs guard against re-introduction. |
| 2026-04-15 | Dark mode wired app-wide | v1.1 Phase 15-02 added a boot-time theme script on `<html>` with `suppressHydrationWarning`. All tokens have dark-mode equivalents. Toggle is available in the unified Navbar. |
| 2026-04-16 | Data visualization tokens + conventions added | Phase 26: chart palette (6 series colors), axis/grid/tooltip conventions, trajectory language vocabulary. Tokens in globals.css, documentation in this section. |
