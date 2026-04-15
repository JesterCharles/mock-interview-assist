---
phase: 15-design-cohesion-sweep
plan: 04
subsystem: design-system
tags: [design, css, tokens, deletion, final-commit, playwright]
requires:
  - 15-01-SUMMARY.md
  - 15-02-SUMMARY.md
  - 15-03-SUMMARY.md
provides:
  - "Unified DESIGN.md token system — single source of truth"
  - "Zero legacy --nlm-* / glass / gradient / glow / kill-list-keyframe references repo-wide"
  - "Playwright advisory regression + legacy-deletion specs (tests/visual/phase-15/)"
affects:
  - "src/app/globals.css (stripped to DESIGN tokens only)"
  - "src/components/layout/AssociateNav.tsx (deleted — unused)"
tech-stack:
  added: []
  patterns:
    - "CSS custom properties on :root as single token surface"
    - "Playwright DOM-class-existence assertions as deletion regression gate"
key-files:
  created:
    - "tests/visual/phase-15/playwright.config.ts"
    - "tests/visual/phase-15/route-regression.spec.ts"
    - "tests/visual/phase-15/legacy-deletion.spec.ts"
    - "tests/visual/phase-15/screenshots/*.png (14 advisory captures)"
  modified:
    - "src/app/globals.css"
  deleted:
    - "src/components/layout/AssociateNav.tsx"
decisions:
  - "D-13 honored: all legacy deletion in ONE atomic commit (06987c7) — no partial deletion"
  - "--background / --foreground tokens deleted too (exclusively referenced by removed rules)"
  - ".hover-lift and .shimmer-bg deleted (unused across src/)"
  - "::selection and scrollbar rules retuned to DESIGN parchment palette via --accent / --muted / --border / --surface-muted (kept, not deleted — plan did not list them, but their dark-palette rgbs would have clashed visually)"
  - "AssociateNav.tsx deleted in this plan (safe — only self-reference + docstring mention in /api/associate/me/route.ts)"
  - "Task 3 (human-verify) pending — checkpoint emitted, not auto-approved"
metrics:
  duration: "~25 minutes"
  completed: "2026-04-15"
  tasks_completed: 2
  tasks_total: 3
  commits: 2
  lines_deleted_globals_css: "~190"
  lines_added_globals_css: "~50"
---

# Phase 15 Plan 04: Final Deletion Commit + Playwright Regression — Summary

## One-liner

FINAL COMMIT of Phase 15: stripped `src/app/globals.css` to DESIGN.md tokens only, deleted `--nlm-*` + legacy utilities + kill-list keyframes in one atomic change, added Playwright advisory regression suite; 24/24 green, full vitest + typecheck + build regression clean.

## Grep Counts — Baseline vs Post

| Scope | Regex | Baseline | Post |
|-------|-------|----------|------|
| `src/app/globals.css` | `--nlm-\|\.nlm-bg\|\.glass-card\|\.gradient-text\|\.glow-border\|\.progress-gradient\|\.recording-ring\|btn-primary[^-]\|btn-accent[^-]\|@keyframes (gradient-shift\|float\|pulse-glow\|shimmer\|recording-pulse\|progress-glow\|border-glow-pulse)` | **50** | **0** |
| Repo-wide `src/` (incl. globals.css) | phase-15 final gate regex | N/A | **0** |
| `src/` excluding globals.css (D-12 gate) | same | **0** | **0** |

## Deletion List (globals.css)

**Custom properties removed (`:root`):**
- `--nlm-primary`, `--nlm-primary-light`
- `--nlm-accent`, `--nlm-accent-light`
- `--nlm-teal`, `--nlm-purple`
- `--nlm-success`, `--nlm-warning`, `--nlm-danger`
- `--nlm-bg-primary`, `--nlm-bg-secondary`
- `--nlm-bg-card`, `--nlm-bg-glass`
- `--nlm-border`, `--nlm-border-glow`
- `--background`, `--foreground` (exclusively referenced by deleted rules)

**`@theme inline` mappings removed:**
- `--color-background`, `--color-foreground`
- Legacy `--font-sans: var(--font-inter)` + `--font-mono: var(--font-geist-mono)` replaced by DESIGN mappings

**Utility classes removed:**
- `.nlm-bg`
- `.glass-card`, `.glass-card-strong`
- `.gradient-text`, `.gradient-text-static`
- `.glow-border`, `.glow-border-cyan`
- `.progress-gradient`
- `.recording-ring`
- `.btn-primary` (+ `:hover`, `:disabled`)
- `.btn-accent` (+ `:hover`) — preserved `.btn-accent-flat`
- `.hover-lift` (+ `:hover`) — unused
- `.shimmer-bg` — unused

**Keyframes removed:**
- `@keyframes gradient-shift`
- `@keyframes float`
- `@keyframes pulse-glow`
- `@keyframes shimmer`
- `@keyframes recording-pulse`
- `@keyframes progress-glow`
- `@keyframes border-glow-pulse`

**Also deleted:**
- `src/components/layout/AssociateNav.tsx` (unused — folded into unified Navbar during 15-02; only self-reference + one docstring mention remained)

## Preservation List (globals.css)

- **DESIGN.md tokens on `:root`:** `--bg`, `--surface`, `--surface-muted`, `--ink`, `--muted`, `--accent`, `--accent-hover`, `--success`, `--warning`, `--danger`, `--border`, `--border-subtle`, `--highlight`, `--font-clash-display`
- **`[data-theme="dark"]`** block — tokens defined, wiring deferred per D-17/D-18
- **`@theme inline` DESIGN mappings:** `--color-bg` ... `--color-highlight`, `--font-display`, `--font-sans-new`, `--font-jetbrains-mono`
- **`body { background: var(--bg); color: var(--ink); }`** — fixed stale `var(--nlm-bg-primary)` → `var(--bg)`
- **`.btn-accent-flat`, `.btn-secondary-flat`** (min-height 44px, `:focus-visible` 2px accent outline)
- **`@keyframes slide-up`, `@keyframes fade-in`** + `.animate-slide-up`, `.animate-fade-in` (used across components)
- **`::selection`** + scrollbar rules — retuned to DESIGN parchment palette (`--accent`, `--muted`, `--border`, `--surface-muted`)
- **Tailwind `@import "tailwindcss";`** base

## Verification Results

| Gate | Result |
|------|--------|
| D-12 HARD GATE grep (src/ ex globals.css) | PASS — zero matches |
| `npx tsc --noEmit` | PASS — clean |
| `npm run lint` | PASS — baseline unchanged (6400 problems, all pre-existing, no new errors) |
| `npm run test -- --run` | PASS — 299 passed / 4 skipped (vitest) |
| `npm run build` | PASS — Compiled successfully, 35 routes generated |
| Playwright phase-15 suite | PASS — 24/24 green |
| D-13 repo-wide final gate (incl globals.css) | PASS — zero matches |

## Playwright Advisory Suite

**Config:** `tests/visual/phase-15/playwright.config.ts` (standalone, baseURL `http://localhost:3000`, chromium-only, serial workers).

**Specs:**

1. **`legacy-deletion.spec.ts` (10 tests):** Asserts `page.locator(sel).count() === 0` for `DEAD_SELECTORS = ['.nlm-bg', '.glass-card', '.glass-card-strong', '.gradient-text', '.gradient-text-static', '.glow-border', '.glow-border-cyan', '.progress-gradient', '.recording-ring', '.btn-primary']` across `/`, `/signin`, `/signin?as=trainer`, `/signin?as=associate`, `/interview/new`, `/history`, `/pdf`, `/question-banks`, `/trainer`. `.btn-accent` intentionally excluded from DOM selector (would match `.btn-accent-flat`); CSS grep gate covers that deletion.

2. **`route-regression.spec.ts` (14 tests):** Full-page screenshots with status-code assertion (`< 400` for public, `< 500` for auth-gated). Public routes include legacy redirects (`/dashboard`, `/login`, `/associate/login`) that now redirect through `/signin`. Auth-gated routes capture redirect-to-`/signin` behavior.

**Screenshots captured (14):** `tests/visual/phase-15/screenshots/route-{root,signin,signin-trainer,signin-associate,login-legacy-redirect,associate-login-legacy-redirect,dashboard-legacy-redirect,interview-new,interview,review,history,pdf,question-banks,trainer,trainer-cohorts}.png`

**Run command:**
```
npm run start &   # prod server
BASE_URL=http://localhost:3000 npx playwright test --config=tests/visual/phase-15/playwright.config.ts
```

**Result:** 24 passed (10.9s).

## Commit SHAs

| Task | SHA | Type | Subject |
|------|-----|------|---------|
| Task 1 | `98bd74f` | test | add Playwright regression + legacy-deletion specs |
| Task 2 | `06987c7` | refactor! | **delete --nlm-* tokens + legacy utilities + kill-list keyframes** (phase-close marker) |

## Deviations from Plan

**None in deletion scope** — plan executed as written.

Minor scope additions documented in decision log:
1. **[Rule 2 — Cleanup]** Deleted `.hover-lift` and `.shimmer-bg` (unused utilities with dark-palette rgbs). Not in kill-list but would leave stale dark-aesthetic CSS.
2. **[Rule 2 — Cleanup]** Deleted `src/components/layout/AssociateNav.tsx`. Plan flagged it as "feel free to delete in this plan if grep gate passes" — gate passed, deletion safe.
3. **[Rule 1 — Stale reference fix]** `body` rule referenced `var(--nlm-bg-primary)` (would have broken under deletion). Corrected to `var(--bg)` and `color` to `var(--ink)`. Plan's preservation list flagged this explicitly.
4. **[Rule 1 — Stale reference fix]** `::selection` rule and scrollbar rules hardcoded dark-palette rgbs. Retuned to DESIGN tokens (`--accent`, `--muted`, `--border`, `--surface-muted`). These did not trigger the grep gate but visually clashed with parchment bg.

## Task 3 Checkpoint Status — PENDING

**Type:** `checkpoint:human-verify` (gate=blocking)

Post-deletion trainer-led smoke + visual sign-off required before phase close. Not auto-approved per executor rules (blocking human-verify checkpoints STOP execution).

Manual verification checklist (from plan):
1. `npm run dev` → http://localhost:3000
2. Full trainer-led smoke: setup wizard → interview → review → PDF → email UI
3. Anonymous `/` → automated-interview flow end-to-end
4. Visit every route; confirm warm parchment bg (#F5F0E8), Clash Display headings, burnt orange flat accent, NO glass/gradient/glow/decorative pulse
5. Devtools Elements: body `background-color = rgb(245, 240, 232)`; zero `.glass-card` / `.nlm-bg` classes
6. Review screenshots under `tests/visual/phase-15/screenshots/`
7. A11y spot-check: focus rings, no body-copy accent-on-bg (WCAG AA), 44x44 hit areas on 375px viewport
8. State preservation: invalid PIN error, score-pending on /review, STT recording indicator on /interview

**Resume signal:** Human types "approved — phase 15 complete" OR describes regression.

Plan 15-02 manual smoke approval (2026-04-14) stands for pre-deletion baseline; post-deletion re-verification is the second pass per D-20.

## Known Stubs

None. All deletions are final; no placeholder CSS or deferred-wiring TODOs introduced.

## Self-Check: PASSED

- `src/app/globals.css` — FOUND, modified
- `src/components/layout/AssociateNav.tsx` — CONFIRMED DELETED (only `PublicShell.tsx` remains in `src/components/layout/`)
- `tests/visual/phase-15/playwright.config.ts` — FOUND
- `tests/visual/phase-15/route-regression.spec.ts` — FOUND
- `tests/visual/phase-15/legacy-deletion.spec.ts` — FOUND
- `tests/visual/phase-15/screenshots/` — 14 PNGs committed
- Commit `98bd74f` — FOUND in git log (Task 1)
- Commit `06987c7` — FOUND in git log (Task 2, phase-close marker)
- Repo-wide final gate regex — ZERO matches confirmed
