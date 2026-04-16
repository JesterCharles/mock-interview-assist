# Phase 29: Associate Data Visualization - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a rich associate dashboard with expandable skill cards (topic breakdown), a focus area hero with trajectory narrative, a radar plot, a per-skill trend chart, and a dashboard-wide skill filter. All visualizations use Phase 26 chart tokens and trajectory language. Replaces the existing RecommendedAreaCard and basic GapTrendChart with richer components. Dashboard gets a 2-column layout.

</domain>

<decisions>
## Implementation Decisions

### Skill Bars (VIZ-01)
- **D-01:** Expandable skill cards. Collapsed: skill name + horizontal fill bar + score % + trend arrow. Click to expand and see per-topic breakdown with same color-coded bars.
- **D-02:** Sort order: strongest first (highest score at top).
- **D-03:** Clicking a skill card selects it as the active dashboard filter AND expands/collapses it. Expand/collapse toggle via chevron icon; clicking the card row itself = select + expand.
- **D-04:** Trend arrows: lucide icons — TrendingUp (green/`--success`), TrendingDown (red/`--danger`), Minus or ArrowRight (`--muted`) for flat. Colored to match direction.

### Focus Area Hero (VIZ-02)
- **D-05:** Replaces existing RecommendedAreaCard entirely. Delete the old component.
- **D-06:** Always visible — no dismiss behavior. Content updates as skills change.
- **D-07:** Shows: skill name, trajectory narrative ("Improving +8pts over 3 sessions"), current score, and score color.
- **D-08:** Per Phase 26 D-05 trajectory language: compact "[score] [trajectory word]" and narrative "Improving +Npts over M sessions" formats.

### Dashboard Skill Filter (VIZ-06)
- **D-09:** Client-side React state (useState at dashboard level, passed down to all child components). No URL params, no Zustand.
- **D-10:** Highlight-only mode — all elements stay visible. Selected skill gets visual emphasis (accent border, subtle glow or background change). Nothing hides or filters out.
- **D-11:** Deselect: click selected skill card again (toggle) OR explicit "All skills" chip that appears when a filter is active. Both mechanisms available.

### Radar Plot (VIZ-05)
- **D-12:** Skills with <3 sessions: dashed line segments + muted label text. Assessment-ready skills (3+ sessions): solid line segments + `--ink` labels.
- **D-13:** Placement: right column in a 2-column dashboard layout. Radar + some context in right column; skill bars + trend chart in left column.
- **D-14:** When dashboard skill filter is active, the selected skill's vertex on the radar gets highlight treatment (accent color, larger dot).

### Score Coloring
- **D-15:** 5-band color scale for bar fills: Red (`--danger`) 0-40%, Orange (`--warning`) 41-60%, Yellow (`--accent`) 61-79%, Green (`--success`) 80-89%, Blue (new `--mastery` token) 90-100%.
- **D-16:** Applied to both skill-level bars and topic-level bars within expanded cards.
- **D-17:** Map to existing design tokens where possible: Red=`--danger`, Orange=`--warning`, Yellow=`--accent`, Green=`--success`. Add one new `--mastery` token (blue) to globals.css with light+dark pair.
- **D-18:** Score coloring also applies to the score text/badge next to bars (text uses same color as bar fill).

### Dashboard Layout
- **D-19:** 2-column layout on desktop. Left column (wider, ~60-65%): focus hero at top, expandable skill cards below, per-skill trend chart at bottom. Right column (~35-40%): radar plot, readiness progress bar.
- **D-20:** Mobile: single column, stacks in reading order (hero → skill bars → trend chart → radar → readiness).

### Per-Skill Trend Chart (VIZ-03)
- **D-21:** Recharts LineChart/AreaChart using Phase 26 chart tokens. Shows selected skill's score history over sessions.
- **D-22:** Skill filter dropdown integrated into chart header. When dashboard skill filter is active, chart auto-shows that skill. Dropdown still available for manual selection.
- **D-23:** Cap at 20 sessions per STATE.md decision. X-axis: session dates. Y-axis: score 0-100.

### Trajectory Language (VIZ-04)
- **D-24:** Per Phase 26 vocabulary: ascending, climbing, holding, dipping, stalling. Used in focus hero narrative and optionally as tooltip text on trend arrows.
- **D-25:** Narrative format on focus hero: "Improving +8pts over 3 sessions". Compact format on skill cards: score + trajectory word is optional (trend arrow may suffice).

### Claude's Discretion
- Exact 2-column layout proportions and responsive breakpoint
- Whether to use CSS grid or flexbox for 2-column layout
- Recharts RadarChart configuration (angle, domain, tick count)
- Exact hex value for `--mastery` blue token (within existing palette warmth)
- Animation on skill card expand/collapse
- Whether trend chart shows area fill or just line

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System (tokens for all visualizations)
- `DESIGN.md` §Data Visualization — Chart palette, axis conventions, tooltip styling, trajectory language (Phase 26 output)
- `src/app/globals.css` — `--chart-*` tokens, `--success`, `--warning`, `--danger`, `--accent` tokens. New `--mastery` token to add here.

### Existing Components (replace/modify)
- `src/app/associate/[slug]/dashboard/page.tsx` — Current dashboard page. Being restructured with 2-column layout.
- `src/components/associate/RecommendedAreaCard.tsx` — Being replaced by focus hero. Delete after.
- `src/components/associate/ReadinessProgressBar.tsx` — Moves to right column. Keep as-is.
- `src/components/trainer/GapTrendChart.tsx` — Existing trend chart with hardcoded hex. Replace with tokenized per-skill version.

### Data Services
- `src/lib/gapService.ts` — Gap scoring (0.8 decay factor). Source for skill/topic scores.
- `src/lib/readinessService.ts` — Readiness classification. Source for trajectory computation.
- `src/lib/trainer-types.ts` — GapScoreEntry, SessionSummary types.

### Shell (Phase 27 dependency)
- `src/components/shell/SectionSidebar.tsx` — Associate sidebar. Dashboard renders within this shell.

### Requirements
- `.planning/REQUIREMENTS.md` §Data Visualization — VIZ-01 through VIZ-06

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ReadinessProgressBar` — Keep, move to right column
- `GapTrendChart` — Pattern reference for recharts usage, but replace with tokenized version
- `RosterSparkline` / `CohortTrends` — Correct `var()` token usage patterns to follow
- Prisma query in dashboard page already fetches gapScores + sessions — extend for topic-level data

### Established Patterns
- Server component (page.tsx) fetches data, passes to client components as props
- Recharts components accept `stroke="var(--chart-n)"` for CSS variable colors
- `getCallerIdentity()` for auth guard on dashboard
- Inline styles with CSS custom properties throughout associate pages

### Integration Points
- Dashboard page.tsx — restructure layout, add new components
- globals.css — add `--mastery` token
- Delete RecommendedAreaCard and its tests
- New components: SkillCardList, FocusHero, SkillRadar, SkillTrendChart

</code_context>

<specifics>
## Specific Ideas

- Score color bands: Red 0-40%, Orange 41-60%, Yellow 61-79%, Green 80-89%, Blue 90-100%. Uses existing semantic tokens + new `--mastery` for blue.
- 2-column layout: responsive, collapses to single column on mobile.
- Radar uses recharts RadarChart — already available in recharts 3.8.1.
- Skill filter is client-side state (useState), highlight-only (no hiding), deselect via re-click or "All skills" chip.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 29-associate-data-visualization*
*Context gathered: 2026-04-16*
