# Phase 14: Design Cohesion - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Restyle all public-facing and v1.1-added UIs to conform to DESIGN.md tokens (warm parchment bg `#F5F0E8`, Clash Display headings, DM Sans body, burnt orange `#C85A2E` accent). Scope covers: public interview landing, PIN entry (Phase 9), automated interview pages, `/associate/[slug]` profile, cohort management UI (Phase 11), cohort filter + summary (Phase 12), curriculum schedule UI (Phase 13). Explicitly preserves `/interview` and `/review` as visually untouched — trainer-led flow is mid-session surface, any visual change risks regression with known-working UX.

</domain>

<decisions>
## Implementation Decisions

### Token source of truth
- **D-01:** Replace `src/app/globals.css` `--nlm-*` dark/indigo/cyan tokens with DESIGN.md light-mode tokens (`--bg`, `--surface`, `--ink`, `--accent`, etc.). Keep CSS custom property names exactly as DESIGN.md specifies (no namespace prefix like `--nlm-`). Dark mode tokens added under `[data-theme="dark"]` selector but not wired to a toggle in this phase.
- **D-02:** Kill anti-pattern utilities: `.glass-card`, `.glass-card-strong`, `.glow-border`, `.glow-border-cyan`, `.gradient-text`, `.gradient-text-static`, `.nlm-bg`, `.progress-gradient`, `.btn-primary` (gradient version), `.btn-accent` (gradient version), keyframes `gradient-shift`, `float`, `pulse-glow`, `shimmer`, `recording-pulse`, `progress-glow`, `border-glow-pulse`. Retain only `slide-up` and `fade-in` keyframes per DESIGN.md motion kill list.
- **D-03:** Add font loading: Clash Display variable font via jsDelivr CDN in `src/app/layout.tsx` `<head>`, DM Sans + JetBrains Mono via `next/font/google`. Update `--font-sans` and `--font-display` theme tokens.

### Restyle scope (INCLUDE)
- **D-04:** Public interview landing page (`src/app/page.tsx` if marketing page exists, or public entry route)
- **D-05:** PIN entry page (Phase 9 output — path TBD by Phase 9, likely `src/app/associate/login/page.tsx` or `src/app/pin/page.tsx`)
- **D-06:** Automated interview pages — public interview UI served by `/api/public/interview/*`. Find actual route in codebase during planning.
- **D-07:** `/associate/[slug]` (`src/app/associate/[slug]/page.tsx`)
- **D-08:** Cohort management UI from Phase 11 (create/edit/delete cohorts, assign associates) — route added in Phase 11, likely under `/trainer/cohorts`
- **D-09:** Cohort filter dropdown + readiness summary bar from Phase 12 — modifies `/trainer/page.tsx`
- **D-10:** Curriculum schedule UI from Phase 13 — likely `/trainer/cohorts/[id]/curriculum`
- **D-11:** Trainer login page (`src/app/login/page.tsx`) — part of auth surface cohesion

### Restyle scope (EXCLUDE — leave visually unchanged)
- **D-12:** `/interview` page and all sub-components — mid-session surface, high regression risk
- **D-13:** `/review` page — mid-session surface, scoring UX is validated
- **D-14:** `/dashboard` setup wizard — already styled; out of scope unless tokens need swap-in (passive token inheritance only, no structural changes)
- **D-15:** `/trainer` roster + `/trainer/[slug]` associate detail — already on design tokens from v1.0 Phase 6; verify but do not restructure

### Shared layout component
- **D-16:** Extract a `<PublicShell>` component (`src/components/layout/PublicShell.tsx`) wrapping public + associate + PIN pages with: warm bg, max-width container (1120px), consistent header (logo wordmark in Clash Display, no nav for public), footer with muted metadata text. Used by D-04 through D-07, D-11.
- **D-17:** Trainer UIs (D-08, D-09, D-10) use existing trainer layout; Plan 02 extends it with consistent card + form patterns but does not introduce a new shell.

### Token-driven rule (hard constraint)
- **D-18:** No ad-hoc hex colors in JSX/Tailwind arbitrary values. All colors via CSS custom properties or Tailwind `@theme inline` mappings. Grep-check: `grep -rE "#[0-9A-Fa-f]{3,6}" src/app/{public,associate,login} src/components/layout` returns zero ad-hoc hex after restyle.
- **D-19:** No gradient backgrounds, no `backdrop-filter: blur`, no glow box-shadows, no neon colors. Grep-check: `grep -rE "gradient-to|backdrop-blur|glass-card|glow-border|gradient-text" src/app/{public,associate,login}` returns zero after restyle.

### Visual regression test scope
- **D-20:** Playwright screenshot tests for: public landing, PIN entry, `/associate/[slug]` (seeded), trainer login, cohort management page, curriculum page. Stored under `tests/visual/phase-14/*.spec.ts`. Baseline screenshots committed. Not blocking CI in Phase 14 (advisory only) — token stability gate for future phases.
- **D-21:** Manual checkpoint task at end of each plan for human-verify on warm parchment + typography + accent color presence.

### Claude's Discretion
- Exact PublicShell internal HTML structure
- Header height, padding scale choices within DESIGN.md spacing tokens
- Button component variants (primary, secondary, ghost) exact styling within token constraints
- Form input focus ring treatment (must use `--accent`, exact ring style is discretion)
- Skeleton/loading states for cohort + curriculum pages
- Empty states copy and illustrations (if any — illustrations are optional)

</decisions>

<specifics>
## Specific Ideas

- Readiness display on `/associate/[slug]` should use the DESIGN.md "Readiness Signal Pattern": `**82** ascending` in Clash Display 700 + 11px DM Sans 600 lowercase trend word, NOT a traffic-light badge
- PIN entry page: single hero card, Clash Display "Enter your PIN" heading, 6-digit input with large tabular-nums characters, burnt orange submit CTA
- Cohort cards in management UI: matte surface, subtle warm border, horizontal rule separator — no shadows beyond subtle `0 1px 2px rgba(0,0,0,0.04)`
- Curriculum UI: week-by-week list with date-driven active/upcoming state (today marker via burnt orange rule), not calendar grid

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design tokens (source of truth)
- `DESIGN.md` — Full design system: typography stack, color tokens (light + dark), spacing scale, motion rules, readiness signal pattern, anti-patterns
- `DESIGN.md` §"Color" — Token names + hex values (light + dark mode)
- `DESIGN.md` §"Typography" — Clash Display + DM Sans + JetBrains Mono loading + scale
- `DESIGN.md` §"Anti-Patterns" — Hard exclusion list (no purple gradients, no glass morphism, no glow)
- `DESIGN.md` §"Readiness Signal Pattern" — Typography-not-badges rule for `/associate/[slug]`

### Requirements
- `.planning/REQUIREMENTS.md` §Design — DESIGN-01 (public flow + associate page tokens), DESIGN-02 (cohort + curriculum UI tokens from initial build)
- `.planning/ROADMAP.md` §"Phase 14" — Phase goal + 4 success criteria

### Existing styling state (what to replace)
- `src/app/globals.css` — Current dark indigo/cyan token system to be REPLACED with DESIGN.md tokens
- `src/app/layout.tsx` — Root layout; font loading lives here

### Upstream phase outputs (routes introduced)
- Phase 9 summary (TBD when written) — PIN entry page route + associate login surface
- Phase 11 summary (TBD) — Cohort management route location
- Phase 12 summary (TBD) — Cohort filter + summary bar integration point in `/trainer/page.tsx`
- Phase 13 summary (TBD) — Curriculum schedule UI route

### Files to inspect during planning
- `src/app/associate/[slug]/page.tsx` — Current associate profile implementation
- `src/app/login/page.tsx` — Current trainer login
- `src/app/trainer/page.tsx` + `src/app/trainer/[slug]/page.tsx` — Reference for existing token usage (verify, do not restyle)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Existing trainer dashboard components (`src/app/trainer/*`) already reference DESIGN.md tokens (v1.0 Phase 6) — they are the reference implementation to mirror, not to restyle
- `next/font/google` already in `src/app/layout.tsx` for Inter — swap for DM Sans

### Established Patterns
- CSS custom properties on `:root` in `globals.css`, mapped via `@theme inline` block to Tailwind — keep this pattern, swap token values
- `persist` middleware + Zustand — no impact (not a visual concern)

### Integration Points
- `globals.css` token swap cascades to all pages automatically for anything using tokens; ad-hoc colors in JSX need manual replacement
- Root `layout.tsx` owns font loading → all routes inherit typography
- Middleware auth unchanged — styling does not touch auth logic

</code_context>

<deferred>
## Deferred Ideas

- Dark mode toggle UI + persistence — tokens defined, toggle wiring deferred to v1.2
- `/interview` + `/review` restyle — deferred indefinitely (mid-session regression risk)
- Illustrations / empty-state art — plain typographic empty states in v1.1, custom illustrations deferred
- Visual regression CI gate (blocking) — advisory only in Phase 14, blocking gate deferred
- Motion refinements beyond slide-up/fade-in — out of scope
- Responsive mobile layouts beyond baseline stack — baseline only in v1.1

</deferred>

---

*Phase: 14-design-cohesion*
*Context gathered: 2026-04-14*
