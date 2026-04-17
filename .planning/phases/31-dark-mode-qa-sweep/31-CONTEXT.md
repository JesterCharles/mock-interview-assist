# Phase 31: Dark Mode QA Sweep - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Systematic scan of all component files to replace hardcoded hex colors with CSS variable tokens, fix light-only Tailwind classes, and ensure all recharts components use Phase 26 chart tokens. No new features — pure polish and consistency pass.

</domain>

<decisions>
## Implementation Decisions

### Sweep Approach
- **D-01:** Automated grep scan for hardcoded hex values (#XXX, #XXXXXX, rgb(), rgba() with literal values) across all .tsx/.ts/.css files. Replace each with the appropriate design token.
- **D-02:** Scan for light-only Tailwind classes (e.g., `bg-white`, `text-black`, `border-gray-*`) that bypass the token system. Replace with token-based equivalents.
- **D-03:** All recharts components must use `var(--chart-*)` tokens for stroke/fill and Phase 26 tooltip/axis conventions. No hardcoded hex in any chart component.
- **D-04:** Known offender: `GapTrendChart.tsx` `TOPIC_COLORS` array with hardcoded hex values. Replace with `--chart-*` token references.

### Verification
- **D-05:** Toggle dark mode on every page/route after fixes. Visual verification that no parchment-white backgrounds, dark-on-dark text, or invisible borders appear.
- **D-06:** `npm run build` must pass after all changes (no broken Tailwind classes or missing tokens).

### Claude's Discretion
- Exact token mapping for each hardcoded hex found (match to closest semantic token)
- Whether to create additional tokens if gaps are found, or use existing tokens creatively
- Ordering of file fixes (by route, by component type, etc.)
- Whether rgba() values with opacity should become tokens or stay as computed values from token base

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System (source of truth for replacements)
- `DESIGN.md` — Full color system, anti-patterns section (lists forbidden patterns)
- `src/app/globals.css` — All CSS custom properties. Every hardcoded hex should map to one of these.

### Known Issues
- `src/components/trainer/GapTrendChart.tsx` — `TOPIC_COLORS` array with hardcoded hex
- STATE.md notes: "Dark mode has inconsistencies — some pages stuck on parchment-light; GapTrendChart.tsx has hardcoded hex"

### Chart Token Reference (Phase 26)
- `DESIGN.md` §Data Visualization — Chart palette, tooltip, axis conventions
- `src/app/globals.css` — `--chart-1` through `--chart-5`, `--chart-highlight` tokens

### Requirements
- `.planning/REQUIREMENTS.md` §Dark Mode — DARK-01, DARK-02

</canonical_refs>

<code_context>
## Existing Code Insights

### Established Patterns
- Correct: `var(--ink)`, `var(--surface)`, `var(--accent)` — most components already use tokens
- Incorrect: hardcoded hex like `#DDD5C8`, `#2D6A4F`, inline `rgb()` values
- `[data-theme="dark"]` in globals.css handles all token overrides automatically

### Integration Points
- Every .tsx file with inline styles is a candidate
- globals.css @theme inline block — may need new Tailwind utility mappings if new tokens added
- PDF components (`@react-pdf/renderer`) — may have hardcoded colors that can't use CSS vars (acceptable exception)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard systematic sweep. Follow DESIGN.md anti-patterns section as the checklist for what to find and fix.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 31-dark-mode-qa-sweep*
*Context gathered: 2026-04-16*
