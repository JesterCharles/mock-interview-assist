# Phase 14: Design Cohesion - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning
**Patched:** 2026-04-14 (Codex finding #8 — preserve legacy CSS utilities)

<domain>
## Phase Boundary

Restyle NEW v1.1 UIs and new public-facing surfaces to conform to DESIGN.md tokens (warm parchment bg `#F5F0E8`, Clash Display headings, DM Sans body, burnt orange `#C85A2E` accent). Scope covers: PIN entry (Phase 9), `/associate/[slug]/interview` authenticated entry (Phase 9 D-26), `/associate/[slug]` profile, cohort management UI (Phase 11), cohort filter + summary (Phase 12), curriculum schedule UI (Phase 13).

**CRITICAL — per Codex finding #8: LEGACY CSS UTILITIES ARE PRESERVED IN THIS MILESTONE.** The classes `.nlm-bg`, `.glass-card`, `.glass-card-strong`, `.gradient-text`, `.gradient-text-static`, `.glow-border`, `.glow-border-cyan`, `.progress-gradient`, and related keyframes (`gradient-shift`, `float`, `pulse-glow`, `shimmer`, `recording-pulse`, `progress-glow`, `border-glow-pulse`) remain intact. `/interview`, `/review`, and `/` (the anonymous automated-interview root) continue to use them. Deleting those utilities globally before all dependent pages are migrated would break live v1.0 styling immediately (`src/app/interview/page.tsx:110-145`, `src/app/page.tsx:649-760`). The token system is introduced on NEW routes only. Legacy utility deletion is DEFERRED to a later milestone when `/interview`, `/review`, and `/` are migrated off them.

</domain>

<decisions>
## Implementation Decisions

### Token source of truth (REVISED per Codex finding #8)
- **D-01 (REVISED):** ADD DESIGN.md light-mode tokens (`--bg`, `--surface`, `--ink`, `--accent`, etc.) to `src/app/globals.css` ALONGSIDE the existing `--nlm-*` tokens. Do NOT remove or rename `--nlm-*` tokens. Both coexist. New routes consume the new tokens; legacy routes continue consuming `--nlm-*`. Dark mode tokens added under `[data-theme="dark"]` selector but not wired.
- **D-02 (REVISED):** LEGACY CSS UTILITIES ARE PRESERVED. Do NOT delete `.glass-card`, `.glass-card-strong`, `.glow-border`, `.glow-border-cyan`, `.gradient-text`, `.gradient-text-static`, `.nlm-bg`, `.progress-gradient`, `.recording-ring`, or the motion keyframes (`gradient-shift`, `float`, `pulse-glow`, `shimmer`, `recording-pulse`, `progress-glow`, `border-glow-pulse`). They remain in `globals.css` as legacy aliases used by `/interview`, `/review`, and `/`. Deletion is deferred to a later milestone.
- **D-02a (NEW):** New DESIGN-compliant button classes are introduced WITHOUT overwriting existing ones. Create `.btn-accent-flat` (flat burnt orange), `.btn-secondary-flat` (outlined surface). Do NOT rewrite `.btn-primary` or `.btn-accent` — those remain legacy. New routes use the new classes.
- **D-03:** Add font loading: Clash Display variable font via jsDelivr CDN in `src/app/layout.tsx` `<head>`, DM Sans + JetBrains Mono via `next/font/google`. Add `--font-sans` and `--font-display` theme tokens. This is additive — do not remove existing font loading.

### Restyle scope (INCLUDE — new routes / v1.1 additions)
- **D-05:** PIN entry page `/associate/login` (Phase 9)
- **D-06a (NEW per Codex finding #2/#8):** Authenticated automated-interview entry `/associate/[slug]/interview` (Phase 9 D-26) — applies DESIGN.md tokens. The underlying interview UI component is the SAME component used by anonymous `/` root but the page shell is token-driven.
- **D-07:** `/associate/[slug]` (associate profile, server-rendered)
- **D-08:** Cohort management UI from Phase 11
- **D-09:** Cohort filter dropdown + readiness summary bar from Phase 12 — modifies `/trainer/page.tsx`
- **D-10:** Curriculum schedule UI from Phase 13
- **D-11:** Trainer login page (`src/app/login/page.tsx`) — part of auth surface cohesion

### Restyle scope (EXCLUDE — legacy unchanged)
- **D-04 (REVISED):** `/` (anonymous automated-interview root `src/app/page.tsx`) — KEEP on legacy utilities (uses `.nlm-bg`, `.glass-card`, `.gradient-text`, glow classes). Deferred until legacy-utility retirement milestone.
- **D-12:** `/interview` page — mid-session surface, high regression risk. UNCHANGED (uses `nlm-bg`, `gradient-text-static`).
- **D-13:** `/review` page — mid-session surface. UNCHANGED.
- **D-14:** `/dashboard` setup wizard — already styled; out of scope unless tokens need additive swap-in (passive token inheritance only).
- **D-15:** `/trainer` roster + `/trainer/[slug]` associate detail — already on design tokens from v1.0 Phase 6; verify but do not restructure.

### Shared layout component
- **D-16:** Extract `<PublicShell>` (`src/components/layout/PublicShell.tsx`) wrapping new associate + PIN + login pages: warm bg, max-width container (1120px), consistent header, muted footer. Used by D-05, D-06a, D-07, D-11.
- **D-17:** Trainer UIs (D-08, D-09, D-10) use existing trainer layout; Plan 02 adds cohort/curriculum components.

### Hard constraints (SCOPED per Codex finding #8)
- **D-18 (REVISED):** No ad-hoc hex colors in JSX/Tailwind arbitrary values FOR NEW ROUTES. Grep-check scoped to new paths only: `grep -rE "#[0-9A-Fa-f]{3,6}" src/app/associate src/app/login src/app/trainer/cohorts src/components/layout src/components/cohort src/components/curriculum src/components/readiness` returns zero. Legacy paths (`src/app/interview`, `src/app/review`, `src/app/page.tsx`) are NOT scanned.
- **D-19 (REVISED):** No gradient backgrounds, no `backdrop-filter: blur`, no glow box-shadows, no neon colors ON NEW ROUTES. Grep-check scoped as above. Legacy utilities remain defined in `globals.css` but must NOT be imported/used by new route files.

### Visual regression test scope
- **D-20:** Playwright screenshot tests for NEW routes: PIN entry, `/associate/[slug]`, `/associate/[slug]/interview`, trainer login, cohort management, curriculum. Advisory only.
- **D-21:** Manual checkpoint at end of each plan for human-verify on warm parchment + typography + accent color, AND regression-verify that `/`, `/interview`, `/review` still render correctly using their preserved legacy utilities.

### Claude's Discretion
- Exact PublicShell HTML structure
- Header height, padding scale within DESIGN.md spacing tokens
- New-route button variants (`.btn-accent-flat`, `.btn-secondary-flat`) exact styling within token constraints
- Skeleton/loading states for cohort + curriculum pages
- Empty states copy

</decisions>

<specifics>
## Specific Ideas

- Readiness display on `/associate/[slug]` uses DESIGN.md "Readiness Signal Pattern": `**82** ascending` in Clash Display 700 + 11px DM Sans 600 lowercase trend word, NOT a traffic-light badge
- PIN entry: single hero card, Clash Display "Enter your PIN" heading, 6-digit input with large tabular-nums, burnt orange submit
- Cohort cards: matte surface, subtle warm border, `0 1px 2px rgba(0,0,0,0.04)` shadow max
- Curriculum UI: week-by-week list with date-driven active/upcoming state (today marker via burnt orange rule)
- Legacy utility deletion: track as explicit deferred task — a future milestone creates a token-migration sweep that rewrites `/`, `/interview`, `/review` onto DESIGN tokens THEN deletes the utilities

</specifics>

<canonical_refs>
## Canonical References

### Design tokens
- `DESIGN.md` — full design system
- `DESIGN.md` §"Color", §"Typography", §"Anti-Patterns", §"Readiness Signal Pattern"

### Requirements
- `.planning/REQUIREMENTS.md` §Design — DESIGN-01, DESIGN-02
- `.planning/ROADMAP.md` §"Phase 14"
- `.planning/PIPELINE-PLAN-CODEX.md` §Finding 8

### Existing styling state
- `src/app/globals.css` — current `--nlm-*` tokens + legacy utilities (PRESERVED); new DESIGN tokens ADDED alongside
- `src/app/layout.tsx` — root layout; additive font loading

### Upstream phase outputs
- Phase 9 — PIN entry + /associate/[slug]/interview routes
- Phase 11 — Cohort management route
- Phase 12 — Cohort filter + summary bar in /trainer
- Phase 13 — Curriculum schedule UI

### Files to inspect
- `src/app/associate/[slug]/page.tsx` — current implementation
- `src/app/login/page.tsx` — current trainer login
- `src/app/trainer/*` — reference token usage
- `src/app/page.tsx`, `src/app/interview/page.tsx`, `src/app/review/page.tsx` — legacy-utility consumers (DO NOT MODIFY in v1.1)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Existing trainer dashboard components already reference DESIGN.md tokens (v1.0 Phase 6) — mirror, don't restyle
- `next/font/google` already in `src/app/layout.tsx` for Inter — swap for DM Sans ADDITIVELY (keep Inter if still referenced)

### Established Patterns
- CSS custom properties on `:root` in `globals.css`, mapped via `@theme inline` to Tailwind — ADD new tokens under same pattern
- Legacy tokens + utilities PRESERVED

### Integration Points
- `globals.css` token ADDITIONS cascade to new routes without affecting legacy ones
- Root `layout.tsx` owns font loading
- Middleware auth unchanged

</code_context>

<deferred>
## Deferred Ideas

- Dark mode toggle UI + persistence — tokens defined, toggle wiring deferred
- `/interview` + `/review` restyle — deferred indefinitely (mid-session regression risk)
- `/` (anonymous root automated-interview) restyle — DEFERRED per Codex finding #8
- **Legacy utility deletion** (`.glass-card`, `.gradient-text`, `.nlm-bg`, glow classes, motion keyframes) — deferred to a future milestone that migrates `/`, `/interview`, `/review` onto DESIGN tokens first
- Visual regression CI gate (blocking) — advisory only in Phase 14
- Motion refinements beyond slide-up/fade-in — out of scope
- Responsive mobile layouts beyond baseline stack — baseline only in v1.1

</deferred>

---

*Phase: 14-design-cohesion*
*Context gathered: 2026-04-14*
*Patched 2026-04-14 for Codex finding #8 — legacy utilities preserved*
