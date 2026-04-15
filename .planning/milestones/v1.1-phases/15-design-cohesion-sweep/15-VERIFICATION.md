---
phase: 15-design-cohesion-sweep
verified: 2026-04-15T02:15:00Z
status: human_needed
score: 9/9 must-haves verified (automated); 1 human-verify item outstanding
overrides_applied: 0
---

# Phase 15: Design Cohesion Sweep — Verification Report

**Phase Goal:** All routes (including legacy `/`, `/interview`, `/review`, `/dashboard`, `/login`) render on DESIGN.md tokens; legacy `--nlm-*` tokens, utility classes (`.glass-card`, `.gradient-text`, `.nlm-bg`, glow classes) and motion keyframes deleted from `globals.css`. Single unified design system, zero retrofit debt.

**Verified:** 2026-04-15
**Status:** human_needed (all automated gates green; trainer-led smoke + visual sign-off remains per 15-04 Task 3 checkpoint)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                         | Status     | Evidence                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `globals.css` contains zero `--nlm-*` tokens                                                  | VERIFIED   | `grep --nlm- src/app/globals.css` → 0 matches. File is 179 lines, scoped to DESIGN tokens + `.btn-accent-flat`/`.btn-secondary-flat` only |
| 2   | `globals.css` contains zero kill-list utility classes                                         | VERIFIED   | `grep .glass-card\|.gradient-text\|.nlm-bg\|.glow-` in globals.css → 0 matches                                                            |
| 3   | `globals.css` contains zero kill-list keyframes (gradient-shift / float / pulse-glow / shimmer / recording-pulse / progress-glow / border-glow-pulse) | VERIFIED   | `grep @keyframes (glow-pulse\|breathe\|spin-slow\|float\|shimmer\|pulse-slow)` → 0 matches; only `slide-up` + `fade-in` remain            |
| 4   | Repo-wide src/ contains zero legacy `--nlm-*` references                                      | VERIFIED   | `grep -r --nlm- src/` → 0 matches (90 hits exist, all confined to `.planning/`, ROADMAP, prior-phase docs, and Playwright DOM assertions) |
| 5   | Repo-wide src/ contains zero legacy utility class references                                  | VERIFIED   | `grep -r 'glass-card\|gradient-text\|nlm-bg\|nlm-glow' src/` → 0 matches                                                                  |
| 6   | DESIGN tokens preserved (`--bg`, `--surface`, `--ink`, `--accent`, `--border`)                | VERIFIED   | All present at `globals.css:11-27`; dark mode mirrors at L31-45; `@theme inline` mappings L48-66                                          |
| 7   | `.btn-accent-flat` and `.btn-secondary-flat` preserved                                        | VERIFIED   | Defined in globals.css L130-178 with 44px hit area + `:focus-visible` 2px accent outline                                                  |
| 8   | Legacy entry routes redirect to unified surfaces (`/dashboard`→`/interview/new`, `/login`→`/signin?as=trainer`, `/associate/login`→`/signin?as=associate`) | VERIFIED   | Server-side `redirect(...)` in each `page.tsx`; build manifest confirms routes registered                                                 |
| 9   | Health stack green (typecheck, tests, build)                                                  | VERIFIED   | `npx tsc --noEmit` exit 0; `npm test` 239 passed / 4 skipped; `npm run build` Compiled successfully, 35 routes generated                  |

**Score:** 9/9 truths verified (automated)

---

### Required Artifacts

| Artifact                                              | Expected                                       | Status     | Details                                                                                |
| ----------------------------------------------------- | ---------------------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| `src/app/globals.css`                                 | DESIGN tokens only, no legacy                  | VERIFIED   | 179 lines, exclusively DESIGN system + 2 button utilities + 2 motion keyframes         |
| `src/components/ThemeToggle.tsx`                      | Cycles light/dark, writes `data-theme`         | VERIFIED   | localStorage `nlm-theme` + `document.documentElement.setAttribute('data-theme', ...)`  |
| `src/app/layout.tsx`                                  | Inline boot script for theme pre-paint         | VERIFIED   | L49-54: pre-paint `data-theme` set from `localStorage.getItem('nlm-theme')`            |
| `src/components/Navbar.tsx`                           | Role-aware (anonymous/trainer/associate)       | VERIFIED   | `Role` union L27, computed L60 from `useAuth()` + `/api/associate/me` cookie probe     |
| `src/app/dashboard/page.tsx`                          | Server redirect to `/interview/new`            | VERIFIED   | One-line `redirect('/interview/new')`                                                  |
| `src/app/login/page.tsx`                              | Server redirect to `/signin?as=trainer`        | VERIFIED   | One-line `redirect('/signin?as=trainer')`                                              |
| `src/app/associate/login/page.tsx`                    | Server redirect to `/signin?as=associate`      | VERIFIED   | Preserves `next` query param                                                           |
| `src/app/signin/SignInTabs.tsx`                       | Trainer / Associate tabs with role switching   | VERIFIED   | `role="tablist"` L132; `tab` state L41 toggled by `aria-selected` buttons L137/L145    |
| `src/app/interview/new/page.tsx`                      | Setup wizard on DESIGN tokens                  | VERIFIED   | Exists; no legacy gradient/glow utility classes                                        |
| `src/app/interview/page.tsx`                          | Trainer-led interview on DESIGN tokens         | VERIFIED   | 7 DESIGN-token references; zero legacy class refs                                      |
| `src/app/review/page.tsx`                             | Review screen on DESIGN tokens                 | VERIFIED   | 47 DESIGN-token references                                                             |
| `src/app/page.tsx` (`/`)                              | Anonymous landing on DESIGN tokens via PublicShell | VERIFIED | 48 DESIGN-token references; PublicShell wrapped throughout                             |
| `tests/visual/phase-15/legacy-deletion.spec.ts`       | Asserts zero legacy class elements per route   | VERIFIED   | 10 tests, asserts `.glass-card`, `.gradient-text`, `.glow-border`, `.btn-primary` etc. |
| `tests/visual/phase-15/route-regression.spec.ts`      | Status-code + screenshot capture per route     | VERIFIED   | 14 tests covering public + auth-gated + legacy redirects                               |
| `tests/visual/phase-15/screenshots/` (14 PNGs)        | Advisory captures committed                    | VERIFIED   | 14 captures present per 15-04 SUMMARY                                                  |

---

### Key Link Verification

| From                       | To                          | Via                                                | Status     | Details                                                                                |
| -------------------------- | --------------------------- | -------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| `ThemeToggle.toggle()`     | `<html data-theme="...">`   | `document.documentElement.setAttribute(...)`       | WIRED      | Persists to `localStorage('nlm-theme')`; both light & dark CSS blocks present          |
| `layout.tsx` boot script   | `<html data-theme="dark">`  | Inline `<script>` reads localStorage pre-paint     | WIRED      | Prevents flash-of-light                                                                |
| `Navbar` role detection    | Conditional menu items      | `useAuth()` (cookie) + `fetch('/api/associate/me')` | WIRED      | `Role` union L27, used to gate nav items                                               |
| `/dashboard`               | `/interview/new`            | server `redirect()`                                | WIRED      | Build registers as static; one-line server component                                   |
| `/login`                   | `/signin?as=trainer`        | server `redirect()`                                | WIRED      | Preserves bookmarks                                                                    |
| `/associate/login`         | `/signin?as=associate`      | server `redirect()` + `next` qs preserved          | WIRED      | Async params destructured                                                              |
| `SignInTabs` tab switch    | Trainer / Associate forms   | `useState<'trainer'\|'associate'>` + role buttons  | WIRED      | `aria-selected` toggles, distinct submit handlers per tab                              |

---

### Data-Flow Trace (Level 4)

| Artifact         | Data Variable      | Source                                          | Produces Real Data | Status   |
| ---------------- | ------------------ | ----------------------------------------------- | ------------------ | -------- |
| `ThemeToggle`    | `theme` state      | `localStorage.getItem('nlm-theme')` + toggle()  | Yes                | FLOWING  |
| `Navbar`         | `associateSlug`    | `fetch('/api/associate/me')` cookie probe       | Yes (or null)      | FLOWING  |
| `SignInTabs`     | `tab` state        | `initialTab` prop from `?as=` qs                | Yes                | FLOWING  |

---

### Behavioral Spot-Checks

| Behavior                              | Command                          | Result                              | Status |
| ------------------------------------- | -------------------------------- | ----------------------------------- | ------ |
| TypeScript compiles cleanly           | `npx tsc --noEmit`               | exit 0, no output                   | PASS   |
| Vitest suite passes                   | `npm test`                       | 239 passed / 4 skipped (25 files)   | PASS   |
| Production build succeeds             | `npm run build`                  | "Compiled successfully", 35 routes  | PASS   |
| Playwright phase-15 suite             | per 15-04 SUMMARY                | 24/24 green (advisory record)       | PASS (recorded) |
| Globals.css scoped to DESIGN          | `wc -l src/app/globals.css`      | 179 lines                           | PASS   |

---

### Requirements Coverage

| Requirement | Source Plan | Description                          | Status      | Evidence                                                              |
| ----------- | ----------- | ------------------------------------ | ----------- | --------------------------------------------------------------------- |
| DESIGN-03   | 15-01..04   | Unified design system (no retrofit)  | SATISFIED   | globals.css scoped to DESIGN; zero legacy refs in `src/`; tests green |

---

### Anti-Patterns Found

| File                                          | Line     | Pattern                                              | Severity | Impact                                                                                |
| --------------------------------------------- | -------- | ---------------------------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| `src/app/layout.tsx`                          | 6-15     | Loads `Inter` and `Geist_Mono` next/font as `--font-inter` / `--font-geist-mono` but no globals.css rule references them | Info     | Two unused Google fonts still ship in CSS injection; cosmetic cleanup, not a goal break |
| `src/components/ThemeToggle.tsx`              | 18-26    | `setState` (`setTheme(initial)`) inside `useEffect` body — flagged by React Compiler lint | Warning  | Lint error from React Compiler plugin; functionally correct but cascades 1 render. Easy to swap to lazy initializer reading `localStorage` in `useState(() => ...)` after mount-flag pattern. |
| `src/app/interview/page.tsx`                  | 55       | React Compiler "memoization could not be preserved" — pre-existing manual deps mismatch | Info     | Existing `useMemo` deps mismatch; not a Phase 15 regression                            |
| `.obsidian/plugins/obsidian-git/main.js` + `src/generated/prisma/*` | many | Vendor / generated `require()` style — 480+ lint errors | Info     | All pre-existing in vendored bundles + generated Prisma client; not Phase 15 changes  |

No blocker anti-patterns detected. globals.css strictly delivers DESIGN tokens; component sweep is complete.

---

### Human Verification Required

The 15-04 plan emitted a `checkpoint:human-verify` (gate=blocking) for post-deletion smoke. Plan 15-02 baseline approval stands for pre-deletion; the second pass after the atomic deletion commit (06987c7) is still required per D-20.

#### 1. Trainer-led full-flow smoke

**Test:** `npm run dev` → log in as trainer → setup wizard (`/interview/new`) → run a 2–3 question interview → review page → generate PDF → email UI.
**Expected:** No regressions; question scoring works, review surfaces validate/override controls, PDF renders, no console errors.
**Why human:** Browser-driven flow with LLM scoring and PDF generation; no automated E2E covers the trainer-led path end-to-end.

#### 2. Anonymous public interview flow on `/`

**Test:** Open `/` anonymous → start the AI-led interview → answer 1–2 questions → reach completion screen.
**Expected:** Public rate limit honored; no 500s; visual matches DESIGN tokens (warm parchment bg #F5F0E8, Clash Display headings, burnt orange flat accent).
**Why human:** Live LLM interaction + `/api/public/interview/*` chain not covered by automated suite.

#### 3. Visual cohesion sweep (DevTools)

**Test:** Visit `/`, `/signin`, `/signin?as=associate`, `/interview/new`, `/interview`, `/review`, `/history`, `/pdf`, `/question-banks`, `/trainer`, `/trainer/cohorts`, `/associate/{slug}`. Open DevTools Elements; confirm `body { background-color: rgb(245, 240, 232); color: rgb(26,26,26); }`. Search DOM for any `.glass-card`, `.nlm-bg`, `.gradient-text`.
**Expected:** Zero matches. All routes parchment + Clash Display + flat burnt orange accent. No glass/gradient/glow/decorative-pulse remnants.
**Why human:** Visual judgment; DOM emptiness is asserted by `legacy-deletion.spec.ts` but humans must confirm aesthetic cohesion.

#### 4. Dark mode toggle propagates everywhere

**Test:** Click `ThemeToggle` in Navbar from `/` and `/trainer`. Reload page; theme should persist. Visit each major route; confirm dark tokens cascade (no hardcoded light overrides).
**Expected:** `<html data-theme="dark">` present after toggle; survives page reload via inline boot script; all surfaces use dark token values from `[data-theme="dark"]` block.
**Why human:** Visual + interaction; no automated coverage of theme persistence across routes.

#### 5. A11y spot-check

**Test:** Tab through `/signin` (both tabs), `/interview/new`, `/trainer`. Inspect focus rings (must be 2px accent outline, 2px offset). Check 44×44 hit areas at 375px viewport.
**Expected:** Visible focus on all buttons; tap targets meet WCAG AA.
**Why human:** Visual measurement.

---

### Gaps Summary

No blocking gaps. Goal achieved at the artifact + wiring level:

- `src/app/globals.css` is scoped exclusively to DESIGN tokens + the two preserved button utilities + two subtle animations. All `--nlm-*` tokens, glass/gradient/glow utilities, and kill-list keyframes were deleted in atomic commit `06987c7`.
- Repo-wide `src/` is free of legacy token / utility references (90 stale references survive only in `.planning/`, ROADMAP docs, and Playwright DOM assertions — all expected/intentional).
- Health stack passes: typecheck clean, 239 vitest tests green, production build succeeds with 35 routes, Playwright phase-15 advisory suite recorded 24/24 green in 15-04 SUMMARY.
- Unified Navbar adapts across anonymous / trainer / associate roles. Legacy entry routes (`/dashboard`, `/login`, `/associate/login`) redirect to the unified surfaces. SignIn tabs wired with `aria-selected` semantics and per-tab submit handlers.

**Minor cosmetic follow-ups (not gaps):**

1. `src/app/layout.tsx` still loads `Inter` and `Geist_Mono` Google fonts whose CSS variables (`--font-inter`, `--font-geist-mono`) are no longer referenced by `globals.css`. These can be removed in a tidy-up commit.
2. `ThemeToggle.tsx` triggers a React Compiler lint error because the initial theme is set via `setState` inside `useEffect`. Functionally correct (one cascading render on mount); refactor to a lazy `useState` initializer + `useEffect` that only writes the attribute would silence the lint.

**Outstanding:** The 15-04 Task 3 blocking human-verify checkpoint (post-deletion trainer smoke + anonymous flow + visual cohesion + dark-mode-propagation + a11y spot-check) has not been recorded as approved in any committed summary. Status remains `human_needed` until the developer signs off in the orchestrator.

---

_Verified: 2026-04-15T02:15:00Z_
_Verifier: Claude (gsd-verifier)_
