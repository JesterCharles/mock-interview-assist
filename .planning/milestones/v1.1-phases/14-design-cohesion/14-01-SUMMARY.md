---
phase: 14-design-cohesion
plan: 01
subsystem: design
tags: [design, css-tokens, public-shell, readiness-signal, codex-finding-8]
requires: [09, 10]
provides:
  - PublicShell shared chrome (warm parchment + Clash wordmark)
  - ReadinessSignal typographic readiness pattern
  - DESIGN.md CSS tokens (--bg / --surface / --ink / --accent / etc.)
  - .btn-accent-flat / .btn-secondary-flat utilities
affects:
  - /login (trainer)
  - /associate/login + PinEntryForm
  - /associate/[slug]
  - /associate/[slug]/interview
tech-stack:
  added: [JetBrains_Mono via next/font/google]
  patterns: [token-driven inline styles, CSS-var passthrough on shared shells]
key-files:
  created:
    - src/components/layout/PublicShell.tsx
    - src/components/readiness/ReadinessSignal.tsx
    - tests/visual/phase-14/public-flow.spec.ts
    - tests/visual/phase-14/playwright.config.ts
    - tests/visual/phase-14/screenshots/trainer-login.png
    - tests/visual/phase-14/screenshots/associate-login.png
  modified:
    - src/app/globals.css
    - src/app/layout.tsx
    - src/app/login/page.tsx
    - src/app/associate/login/page.tsx
    - src/app/associate/login/PinEntryForm.tsx
    - src/app/associate/[slug]/page.tsx
    - src/app/associate/[slug]/interview/page.tsx
decisions:
  - PublicShell exposes data-http-status / data-testid passthrough so guard-matrix tests can read the returned React element's props without traversal
  - Identity tag uses validated slug only (no extra Prisma fetch) to keep Phase 9 guard-matrix tests intact
  - Readiness derivation uses last-3 session avg + delta(newest, oldest); thresholds: delta>1 ascending, delta>=-1 climbing, else stalling
metrics:
  duration: ~25 min
  completed: 2026-04-14
  tasks: 4
  files: 12
---

# Phase 14 Plan 01: Design Cohesion — New Public Flow Summary

Restyled NEW routes (trainer login, /associate/login, /associate/[slug], /associate/[slug]/interview) to DESIGN.md tokens via `globals.css` token additions, PublicShell wrapper, and ReadinessSignal typographic pattern. Legacy `/`, `/interview`, `/review` pages and all their utilities (`.nlm-bg`, `.glass-card`, `.gradient-text`, glow classes, motion keyframes) preserved per Codex finding #8.

## Tasks Completed

| Task | Description | Commit |
| ---- | ----------- | ------ |
| 1 | Add DESIGN.md tokens + new button utilities + JetBrains Mono font | `03f380b` |
| 2 | Build PublicShell + ReadinessSignal components | `0d72ce7` |
| 3 | Restyle 4 new routes to DESIGN.md tokens | `05c901e` |
| 4 | Advisory Playwright visual + legacy regression spec | `a10da74` |

## What Changed

### globals.css (additive only)
- ADDED `--bg/--surface/--surface-muted/--ink/--muted/--accent/--accent-hover/--success/--warning/--danger/--border/--border-subtle/--highlight` CSS custom properties on `:root`
- ADDED `[data-theme="dark"]` token block (defined, not wired)
- EXTENDED `@theme inline` with `--color-bg/--color-accent/--font-display/--font-sans-new` mappings
- ADDED `.btn-accent-flat` and `.btn-secondary-flat` utilities
- PRESERVED all `--nlm-*` tokens and legacy utilities exactly as they were

### layout.tsx
- ADDED JetBrains_Mono via `next/font/google` with `--font-jetbrains-mono` variable
- Inter/DM_Sans/Geist_Mono unchanged
- Clash Display CDN link unchanged

### New components
- `src/components/layout/PublicShell.tsx` — server component, max-w-1120px, warm parchment bg via `var(--bg)`, Clash Display "Next Level Mock" wordmark, muted footer. Accepts `data-http-status` / `data-testid` passthrough on root for 403/404 test inspection.
- `src/components/readiness/ReadinessSignal.tsx` — typographic readiness display per DESIGN.md ("**82** ascending"). Score in Clash Display 700 64px (lg) / 48px (md) with `font-variant-numeric: tabular-nums`; trend word in DM Sans 600 11px lowercase with 0.08em tracking. Trend colors: success ascending, accent climbing, danger stalling.

### Restyled routes
- `/login` — PublicShell wrapper, `.btn-accent-flat` submit, all hex literals → `var(--*)` tokens, removed Sparkles/Lock decorative icons and the dual radial-blur backdrop
- `/associate/login` — PublicShell wrapper, 48px Clash Display "Enter your PIN" heading, 18px DM Sans subtext
- `/associate/login/PinEntryForm.tsx` — converted hex token literals to CSS vars, PIN input now 32px JetBrains Mono with 0.4em tracking and tabular-nums per DESIGN.md PIN spec
- `/associate/[slug]` — PublicShell wrapper, 48px Clash Display display name, ReadinessSignal typographic pattern (replaces former "Completed/Review" pill in this slot — status badges remain on individual session rows but rendered as JetBrains Mono uppercase labels rather than rounded pills)
- `/associate/[slug]/interview` — PublicShell chrome with "Signed in as {slug}" identity tag in JetBrains Mono uppercase 11px; inner `AuthenticatedInterviewClient` left untouched (it shares its DOM with `/` automated-interview UI and remains on legacy classes — that's intentional per D-06a)

## Verification

- `npx tsc --noEmit` passes
- `npm run lint` — no new errors introduced (pre-existing 946 errors / 5467 warnings unchanged on touched files)
- `npm run build` succeeds; all routes compile (`/login`, `/associate/login`, `/associate/[slug]`, `/associate/[slug]/interview`, `/`, `/interview`, `/review`)
- `npm run test` — **299/299 vitest tests pass** (4 skipped pre-existing); all guard-matrix tests for `/associate/[slug]` and `/associate/[slug]/interview` pass after PublicShell prop-passthrough fix
- Scoped grep on new paths returns clean for hex literals and legacy classes (only doc-comment refs remain)
- Playwright advisory spec: 3 passed, 3 best-effort skipped (no auth cookie / seeded slug)
  - `/login` PublicShell bg = `rgb(245, 240, 232)` ✓
  - `/login` `.btn-accent-flat` bg = `rgb(200, 90, 46)` ✓
  - `/associate/login` PIN input has `inputmode="numeric"` ✓
  - `/` still has `.nlm-bg` in DOM (legacy regression) ✓

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 – Bug] PublicShell broke 403 guard-matrix tests for `/associate/[slug]` and `/associate/[slug]/interview`**
- **Found during:** Task 3 verification (`npm run test`)
- **Issue:** Existing tests inspected `result.props['data-http-status']` on the page-level returned React element. Wrapping the 403 render in `<PublicShell>` moved that prop one level deeper, causing 4 test failures.
- **Fix:** Added `data-http-status` and `data-testid` passthrough props to `PublicShell` (typed via bracket-notation key in the props interface so the React element literally receives those keys); updated both `renderForbidden()` callers to pass them. Tests inspect the returned PublicShell element's props directly; values forward to the root `<div>` data-attrs at render time.
- **Files:** `src/components/layout/PublicShell.tsx`, `src/app/associate/[slug]/page.tsx`, `src/app/associate/[slug]/interview/page.tsx`
- **Commit:** `05c901e`

**2. [Rule 1 – Bug] Initial interview page added a Prisma `findUnique` for displayName, which broke 3 tests that did not mock Prisma**
- **Found during:** Task 3 verification
- **Issue:** Adding `prisma.associate.findUnique({ where: { id: targetId } })` to the interview page caused tests to throw `PrismaClientUnknownRequestError` because the test file does not mock Prisma (Phase 9 tests guard the redirect/403 matrix only).
- **Fix:** Dropped the Prisma fetch — the identity tag now uses the validated slug directly (`Signed in as {slug}`). Display-name enrichment can land in a follow-up plan with proper test mocking.
- **Files:** `src/app/associate/[slug]/interview/page.tsx`
- **Commit:** `05c901e`

### Out-of-scope deferred
- 946 pre-existing lint errors across the codebase remain unchanged. None introduced by this plan.
- Display-name lookup on the interview identity tag (intentionally deferred — needs Prisma test fixtures).
- Visual screenshots for `/associate/[slug]` and `/associate/[slug]/interview` (skipped — require seeded auth cookie).

## Known Stubs

None. All token references resolve to defined CSS custom properties; all components consume real data.

## Self-Check: PASSED

- FOUND: `src/components/layout/PublicShell.tsx`
- FOUND: `src/components/readiness/ReadinessSignal.tsx`
- FOUND: `tests/visual/phase-14/public-flow.spec.ts`
- FOUND: `tests/visual/phase-14/playwright.config.ts`
- FOUND: `tests/visual/phase-14/screenshots/trainer-login.png`
- FOUND: `tests/visual/phase-14/screenshots/associate-login.png`
- FOUND commit: `03f380b`
- FOUND commit: `0d72ce7`
- FOUND commit: `05c901e`
- FOUND commit: `a10da74`

Legacy preservation verified:
- `grep -c "glass-card" src/app/globals.css` = 2 (preserved)
- `grep -c "nlm-bg" src/app/globals.css` = 6 (preserved)
- `grep -c "F5F0E8" src/app/globals.css` = 1 (new token added)
- `grep -c "btn-accent-flat" src/app/globals.css` = 3 (new utility added)
- Playwright legacy regression test confirms `.nlm-bg` still in DOM on `/`
