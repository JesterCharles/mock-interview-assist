# Technology Stack — Milestone v1.3 (UX Unification & Polish)

**Project:** Next Level Mock (NLM)
**Researched:** 2026-04-16
**Overall confidence:** HIGH (verified against installed package.json + live node_modules introspection + existing codebase patterns)

---

## Summary: No New Dependencies Required

All four capability areas in v1.3 are fully served by libraries already installed. Zero net-new packages.

| Capability | Verdict | Mechanism |
|------------|---------|-----------|
| Richer data viz (strengths/weaknesses + skill-filtered trends) | No new dep | recharts 3.8.1 — `AreaChart`, `ReferenceLine` not yet used but already in the package |
| Password upgrade flow (magic-link → password) | No new dep | `supabase.auth.updateUser({ password })` — already wired at `/auth/update-password/page.tsx` |
| Sign-in redesign (stacked buttons, no tabs) | No new dep | Component refactor of `SignInTabs.tsx` |
| Dark mode consistency | No new dep | Fix inline hardcoded hex values → CSS var tokens; existing token system is complete |

---

## Recharts — Additions Within Existing Package

recharts 3.8.1 ships all of these; none require a version bump or new install.

### Currently Used in Codebase

| Component | File | Purpose |
|-----------|------|---------|
| `LineChart`, `Line` | `GapTrendChart.tsx`, `RosterSparkline.tsx` | Gap trend lines, sparklines |
| `BarChart`, `Bar`, `Cell` | `calibration/page.tsx` | Override delta histogram |
| `ResponsiveContainer` | All chart files | Container sizing |
| `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend` | `GapTrendChart.tsx` | Axes and labels |

### Available but Not Yet Used — Needed for v1.3

| Component | Purpose in v1.3 | Notes |
|-----------|-----------------|-------|
| `AreaChart`, `Area` | Trajectory/trend fill view for associate progress | `Area` with `fillOpacity` gives visual weight to trend shape without adding clutter. Use `fill="var(--accent)"` at 0.12 opacity, `stroke="var(--accent)"`. |
| `ReferenceLine` | Threshold marker on trend charts (e.g., 75% readiness line) | `y={75}` on `LineChart` or `AreaChart`. Use `stroke="var(--warning)"` + `strokeDasharray="4 2"`. |
| `RadialBar` | Circular progress indicator for readiness score KPI | Optional — only if design spec calls for it. Plain typography (`"82 ascending"`) per DESIGN.md is preferred. |

Verified: `node_modules/recharts/types/cartesian/ReferenceLine.d.ts`, `node_modules/recharts/types/cartesian/Area.d.ts`, `node_modules/recharts/types/polar/RadialBar.d.ts` all present in the installed package.

### Chart Color Integration with DESIGN Tokens

Do NOT use hardcoded hex in chart components. Current `GapTrendChart.tsx` violates this (uses `#C85A2E`, `#2D6A4F`, etc. directly). v1.3 should migrate chart colors to CSS vars:

```tsx
// Correct pattern for v1.3 chart components
const CHART_COLORS = {
  primary: 'var(--accent)',       // #C85A2E light / #D4743F dark
  success: 'var(--success)',      // #2D6A4F light / #3D8B6A dark
  warning: 'var(--warning)',      // #B7791F light / #D4952A dark
  danger:  'var(--danger)',       // #B83B2E light / #D45040 dark
  muted:   'var(--muted)',        // grid lines, secondary labels
  border:  'var(--border)',       // CartesianGrid stroke
}
```

`recharts` SVG elements accept CSS variable strings directly in `stroke` and `fill` props. This is the correct approach for dark mode chart correctness — recharts will read computed values from the DOM at render time.

**Confidence:** HIGH — verified in `RosterSparkline.tsx` where `stroke="var(--accent)"` is already used successfully.

---

## Supabase Auth — Password Upgrade Flow

### What Exists

`/auth/update-password/page.tsx` already implements `supabase.auth.updateUser({ password })`. This page is reached via `/auth/callback?type=recovery` (password reset flow).

### What v1.3 Needs

Associates authenticated via magic link need a path to set a password without going through a full "forgot password" reset. This is a first-login upgrade prompt, not a reset.

**Mechanism:** `supabase.auth.updateUser({ password })` works for any authenticated user, not just recovery sessions. An associate who signs in via magic link has a valid Supabase session and can call `updateUser` to add a password to their account.

**Implementation approach:**
1. After magic-link sign-in completes (post `/auth/callback`), detect first-login via a flag (e.g., check if `user.user_metadata.has_set_password` is absent or `false`).
2. Redirect to a prompt page (can reuse or extend `/auth/update-password/page.tsx`).
3. On submit, call `supabase.auth.updateUser({ password })` + `supabase.auth.updateUser({ data: { has_set_password: true } })` in one call to set the flag.
4. Redirect to `/associate/[slug]/dashboard`.

**No additional libraries needed.** `createSupabaseBrowserClient` is already wired at `src/lib/supabase/browser.ts`.

**Confidence:** HIGH — `updateUser` is the canonical Supabase API for user-initiated password setup. Pattern is verified in existing codebase.

---

## Sign-in Redesign — No New Libraries

Current `SignInTabs.tsx` uses Trainer/Associate tabs. v1.3 redesigns to stacked buttons on a single page.

**What changes:** Component logic only. The redesigned sign-in will:
- Show two buttons: "Sign in with email link" (magic link) and "Sign in with password"
- Expand inline to the selected form on button click
- No tabs, no role split at the top level

**No new dependencies.** The existing `useAuth()` + `createSupabaseBrowserClient()` + existing form patterns cover this entirely. `@radix-ui/react-dialog` and `@radix-ui/react-dropdown-menu` are already installed if any popover UX is needed.

**Confidence:** HIGH.

---

## Dark Mode — Tooling and Approach

### Existing Infrastructure (Complete)

The dark mode system is fully wired:
- CSS token pairs for all design tokens (`--bg`, `--surface`, `--ink`, etc.) with dark mode counterparts in `globals.css`
- Boot-time theme script on `<html>` with `suppressHydrationWarning`
- `ThemeToggle.tsx` component already exists

### The Problem

Dark mode QA failures are caused by **inline hardcoded hex values** in component files instead of CSS var tokens. Examples already visible in `GapTrendChart.tsx`:

```tsx
// Wrong — breaks dark mode
tick={{ fill: '#7A7267', fontSize: 12 }}
contentStyle={{ backgroundColor: '#FFFFFF', color: '#1A1A1A' }}

// Correct — respects dark mode
tick={{ fill: 'var(--muted)', fontSize: 12 }}
contentStyle={{ backgroundColor: 'var(--surface)', color: 'var(--ink)' }}
```

### Approach for v1.3

1. **Audit pass** — grep for hardcoded hex in `style={{...}}` and inline `stroke`/`fill` props across all `src/` files.
2. **Replace** — swap hex → CSS var using the DESIGN.md token mapping.
3. **Recharts tooltip fix** — `contentStyle` in recharts `Tooltip` accepts inline style objects; use CSS vars here (recharts reads them from DOM at tooltip render time).
4. **No new tooling needed.** This is a mechanical substitution.

**Confidence:** HIGH — root cause is clear from code inspection.

---

## What NOT to Add

| Library | Why Not |
|---------|---------|
| `framer-motion` | DESIGN.md explicitly bans decorative animation. Motion in v1.3 is strictly functional (page transitions, fade-in). CSS transitions + Next.js built-in `page.tsx` transitions are sufficient. |
| `@radix-ui/react-tabs` | Sign-in redesign removes tabs entirely. Already-installed Radix components (dialog, dropdown) are sufficient for any popovers needed. |
| `react-spring` or similar | Same as framer-motion — banned by motion philosophy. |
| `d3` or any d3-based chart lib | recharts already covers all needed chart types. Adding d3 doubles the charting surface area. |
| `@nivo/*` | ~200KB D3 tree. Overkill. recharts already installed and covers all cases. |
| `color` / `chroma-js` | Chart colors should come from CSS vars, not runtime color computation. |
| `tailwind-merge` / `clsx` | Not in stack. All styling uses inline style objects + design tokens; no class-name conflicts to resolve. |

---

## Version Compatibility

All existing packages remain at current versions. No upgrades required.

| Package | Current | Required for v1.3 | Note |
|---------|---------|-------------------|------|
| recharts | `^3.8.1` | Same | `AreaChart` and `ReferenceLine` already in 3.8.1 |
| `@supabase/supabase-js` | `^2.103.2` | Same | `updateUser` API stable across 2.x |
| `@supabase/ssr` | `^0.10.2` | Same | Auth callback handling unchanged |
| `@radix-ui/react-dialog` | `^1.1.15` | Same | |
| Tailwind CSS | `^4` | Same | |

---

## Sources

| Area | Source | Confidence |
|------|--------|-----------|
| Recharts component availability | Direct inspection: `node_modules/recharts/types/cartesian/` + `types/polar/` | HIGH |
| `stroke="var(--css-var)"` works in recharts | Existing code: `RosterSparkline.tsx` uses `stroke="var(--accent)"` successfully | HIGH |
| `updateUser({ password })` for authenticated user | Existing code: `src/app/auth/update-password/page.tsx` + Supabase Auth admin docs | HIGH |
| Dark mode root cause | Code inspection: `GapTrendChart.tsx` hardcoded hex values | HIGH |
| Sign-in redesign scope | Code inspection: `SignInTabs.tsx` + v1.3 milestone spec in PROJECT.md | HIGH |
| No new deps conclusion | Package audit + codebase capability survey | HIGH |

---

*Stack research for: v1.3 UX Unification & Polish*
*Researched: 2026-04-16*
