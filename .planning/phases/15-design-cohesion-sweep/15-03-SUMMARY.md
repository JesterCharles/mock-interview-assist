---
phase: 15-design-cohesion-sweep
plan: 03
subsystem: design-system
tags: [design, refactor, tokens, wave-2, low-risk]
requirements: [DESIGN-03]
completed: 2026-04-14
duration_min: ~20
dependency_graph:
  requires:
    - "Plan 15-01 (shared components on DESIGN tokens)"
    - "Phase 14 DESIGN.md tokens + .btn-accent-flat / .btn-secondary-flat utilities"
  provides:
    - "/dashboard setup wizard on DESIGN tokens (flat step indicator, token chrome, adaptive + curriculum logic preserved)"
    - "/question-banks on DESIGN tokens (surface card bank list, difficulty pill, mono keyword chips)"
    - "/pdf page chrome on DESIGN tokens (preview frame + flat CTAs; PDFReport StyleSheet untouched per plan)"
    - "/history list on DESIGN tokens (surface cards, tabular-nums, star ratings in accent)"
  affects:
    - "Together with 15-02, unblocks Plan 15-04 legacy deletion — all consumer surfaces now token-only"
tech_stack:
  patterns:
    - "Inline style objects using var(--token) — no arbitrary hex on migrated files (per Phase 14 D-17)"
    - "Clash Display display headings (22/28/48px) via fontFamily: var(--font-display)"
    - "JetBrains Mono uppercase labels with 0.08em tracking for metadata + section labels"
    - "tabular-nums on score cells, counts, dates"
    - "Semantic badge colors (success/warning/danger) for difficulty pills + status banners per DESIGN.md"
    - "Flat step indicator: circle + connector line, no gradient progress bar"
key_files:
  modified:
    - "src/app/dashboard/page.tsx"
    - "src/app/question-banks/page.tsx"
    - "src/app/pdf/page.tsx"
    - "src/app/history/page.tsx"
  created: []
decisions:
  - "Used corrected grep regex (btn-accent[^-] / btn-primary[^-]) per 15-01 deviation — bare \\bbtn-accent\\b false-matches permitted .btn-accent-flat"
  - "Burnt orange var(--accent) used ONLY for buttons, icons, step numerals, star fills, selection borders, and large display numerals — never on body copy (per Phase 15 prompt a11y directive)"
  - "Step indicator redesigned as flat circle-and-line row (no gradient bar) with explicit :outline for the current step to preserve keyboard focus affordance"
  - "Difficulty pill uses semantic badge colors from DESIGN.md §Semantic Badge Colors (beginner→success, intermediate→warning, advanced→danger) — legacy getDifficultyColor helper not imported (same pattern as QuestionCard in 15-01)"
  - "PDFReport.tsx intentionally NOT migrated — uses @react-pdf/renderer StyleSheet API, explicitly out of scope per plan (only page chrome around preview migrates)"
  - "Typeahead suggestions dropdown on /dashboard moved from translucent dark card to surface card chrome with elevated shadow (0 4px 12px rgba(0,0,0,0.08)) — readable on warm parchment"
  - "Delete buttons on /history use .btn-secondary-flat with inline color:var(--danger) — not a destructive fill button (per DESIGN.md restraint)"
metrics:
  commits: 2
  files_modified: 4
  tasks: 2
  tests_before: "299 passed / 4 skipped"
  tests_after: "299 passed / 4 skipped"
---

# Phase 15 Plan 03: Lower-Risk Page Migration Summary

Four lower-risk surfaces (`/dashboard`, `/question-banks`, `/pdf`, `/history`) migrated from legacy `--nlm-*` tokens + glass/gradient utilities onto DESIGN.md tokens; 21 legacy references eliminated across the set, every existing data flow (adaptive setup, curriculum filter, GitHub fetch, react-pdf render, history CRUD) preserved, full suite green.

## What Changed

### Task 1 — `/dashboard` + `/question-banks` (`8a6d562`)

**`src/app/dashboard/page.tsx`**
- Outer wrapper: `min-h-screen nlm-bg` → `style={{ background: 'var(--bg)' }}`.
- Wizard shell: `.glass-card-strong rounded-3xl border border-white/10` → surface card (`bg: var(--surface)`, `border: 1px solid var(--border)`, `0 1px 2px rgba(0,0,0,0.04)`).
- Page title: gradient-clipped indigo→purple heading → Clash Display 48/600 in `var(--ink)`.
- Step progress indicator: redesigned flat — each step is a circle-and-label button with 2px border cascading from `var(--border)` → `var(--accent)` as the wizard advances; active step gets an explicit `outline: 2px solid var(--accent)` for focus-affordance; connector is a 1px line in `var(--border)` that fills to `var(--accent)` when the later step is reached. No gradient progress bar.
- Phase 1 tech list: dark `bg-white/[0.04] border-white/5` rows → surface cards on `var(--surface)` with `var(--border)`; selected row switches to `var(--highlight)` with `var(--accent)` border; weight slider uses `var(--surface-muted)` track + `accentColor: var(--accent)`; weight bubbles render in JetBrains Mono with accent fill when active.
- Assessment focus / interview level toggle cards: token-driven selected vs idle borders, `var(--highlight)` on selected.
- Pre-populated tech pill panel: `bg-indigo-500/10 border-indigo-500/20` → `var(--highlight)` + `var(--border)`; weight-tone colors map 4+→danger, 3→warning, ≤2→success (matching DESIGN semantic tones).
- CTAs: `.btn-accent-flat` for Next Step / Review & Confirm / Start Interview / Resume; `.btn-secondary-flat` for Back.
- Phase 3 ready-to-start banners: indigo/green translucent cards → semantic banner cards (`#FEF3E0`/`var(--warning)` while loading; `#E8F5EE`/`var(--success)` when ready).
- Active-session resume banner: gradient indigo→purple / amber→orange banners → flat token banners (`var(--highlight)`+`var(--accent)` for review, `#FEF3E0`+`var(--warning)` for in-progress).
- Adaptive gap-score pre-population + curriculum filter + associate typeahead + handleSlugLookup + Promise.all cohort/curriculum fetch: **logic UNCHANGED**. Only chrome migrated.
- Dropped unused `FileText`, `Settings`, `ChevronLeft` re-entry (kept for pagination), `Check`, and `ArrowRight` icon re-imports where shadowed.

**`src/app/question-banks/page.tsx`**
- Outer: `nlm-bg` → `var(--bg)`; header uses Clash Display 48px title; upload CTA now `.btn-accent-flat` with icon inline.
- Bank cards: `.glass-card` → surface card (`var(--surface)` + `var(--border)`), hover `var(--highlight)`; title uses Clash Display 22/600 `var(--ink)`; metadata row in DM Sans `var(--muted)` with tabular-nums counts/sizes; action buttons render as subtle icon-only hover pills.
- Built-in vs custom sections: section headings (`Curriculum Question Banks`, `Uploaded Question Banks`) switched from `text-white` + indigo/purple icons to Clash Display 28/600 `var(--ink)` with `var(--accent)` icon.
- Empty state: dashed border surface card on `var(--surface)` with token-colored body copy.
- Preview modal: `.glass-card-strong` → surface card with `0 12px 32px rgba(0,0,0,0.18)` elevated shadow on a warm ink/45% backdrop; each question row uses `border-b border-[var(--border-subtle)]` vertical rhythm per plan; difficulty pill uses DESIGN.md §Semantic Badge Colors (beginner→success, intermediate→warning, advanced→danger); keyword chips use `var(--surface-muted)`/`var(--muted)`.
- **Rule 1 fix**: The original UI referenced `q.difficulty === 'easy'|'medium'|'hard'` but the `ParsedQuestion.difficulty` type is `'beginner'|'intermediate'|'advanced'`. TypeScript caught it on the first typecheck. Corrected to match the type.
- GitHub fetch + preview parse paths (`/api/load-markdown`, `parseInterviewQuestions`): **UNCHANGED**.

### Task 2 — `/pdf` + `/history` (`52eebd8`)

**`src/app/pdf/page.tsx`**
- Outer: `nlm-bg` → `var(--bg)`; loading fallback and "no session" guard both use the same flat shell.
- Preview frame: `.glass-card-strong rounded-xl border border-white/10` → surface card with `0 1px 2px rgba(0,0,0,0.04)`; preview label moved to `var(--surface-muted)` strip with JetBrains Mono uppercase tracking.
- PDFDownloadLink: inline-styled gradient indigo→purple button → `.btn-accent-flat inline-flex` (preserves render-prop loading/idle branches).
- Repeat Interview / New Setup: framed translucent buttons → `.btn-secondary-flat`.
- EmailSender input group: dark `bg-black/20 border border-white/10` chrome → surface card chrome; Send button switches to `var(--accent)` when input is non-empty, disabled state on `var(--surface-muted)`; status indicator banner uses semantic banner tones (info→highlight+accent, success→#E8F5EE+success, error→#FDECEB+danger).
- @react-pdf/renderer `PDFReport` component in `src/components/PDFReport.tsx`: **explicitly NOT migrated** — uses StyleSheet API out of scope for this phase. Plan's Step 2 note called this out.

**`src/app/history/page.tsx`**
- Outer: `nlm-bg` → `var(--bg)`; header back-link in DM Sans `var(--muted)`; title uses Clash Display 28/600 with `var(--accent)` history icon.
- Empty state: `.glass-card-strong` → surface card; CTA now `.btn-accent-flat`.
- History row: `.glass-card-strong` rounded-xl → surface rounded-lg card per plan; click-to-expand header uses `var(--highlight)` hover.
- Candidate/date: font-mono date line in `var(--muted)` with tabular-nums; user icon in `var(--muted)`.
- Score pill: star row renders fills in `var(--accent)` / outlines in `var(--border)` — no amber/slate; numeric score uses `fontFamily: var(--font-mono)` + tabular-nums, colored through semantic score cascade (>=4 success, >=3 warning, else danger).
- Action row: View PDF uses `.btn-accent-flat`; delete uses `.btn-secondary-flat` with `color: var(--danger)` (per plan step 3). Chevron icons tokenized.
- Expanded panel: `bg-black/20` + `border-white/10` shell → `var(--surface-muted)` banded section inside the card; the three stat tiles (`.glass-card`) → inner surface cards (`var(--surface)`/`var(--border-subtle)`) with JetBrains Mono uppercase labels and Clash Display 28px values in semantic token colors.
- Per-question feedback list: `.glass-card` rows → flat token surface cards; Q-number label uses JetBrains Mono; stars use same accent/border cascade; feedback body in `var(--muted)`.
- Legacy `getScoreColor` Tailwind-hex-class function was rewritten to return token strings (`var(--success)`/`var(--warning)`/`var(--danger)`). Internal to file, zero consumer impact.

## Grep Gate Results

| File | Pre-migration | Post-migration |
|------|---------------|----------------|
| `src/app/dashboard/page.tsx` | 4 | 0 |
| `src/app/question-banks/page.tsx` | 6 | 0 |
| `src/app/pdf/page.tsx` | 3 | 0 |
| `src/app/history/page.tsx` | 8 | 0 |
| **Total** | **21** | **0** |

Plan-level final gate (all four files, corrected regex `btn-accent[^-]` / `btn-primary[^-]`) → **0 matches**.

## Verification

- `npx tsc --noEmit` — clean (both tasks, after Rule 1 difficulty-enum fix)
- `npm run build` — clean production build after each task
- `npm run test -- --run` — 299 passed / 4 skipped (unchanged pre/post migration; no test files touched)
- Behavior preserved: Zustand store bindings, setup-wizard step transitions (`setupPhase` 1→2→3), adaptive gap-score pre-population, curriculum filter Promise.all fetch, GitHub question-bank fetch + preview parse, @react-pdf/renderer render path, history fetch/delete/view-PDF navigation — all UNCHANGED.
- A11y constraints: `var(--accent)` reserved for buttons / icons / numerals / selection borders (never on body copy); all interactive buttons route through `.btn-accent-flat` / `.btn-secondary-flat` which already satisfy 44px touch target + `:focus-visible` outline (from Plan 15-01 globals.css additions).
- Dashboard special handling: repo-fetch loading state renders a flat accent spinner + muted label; error state renders a danger-tone card (`#FDECEB` bg, `var(--danger)` border/text) — **both remain visible**, not suppressed.

## Deviations from Plan

**1. [Rule 1 - Bug] Difficulty enum mismatch in `/question-banks` modal**
- **Found during:** Task 1, first `npx tsc --noEmit` gate
- **Issue:** The new difficulty pill conditionally compared `q.difficulty === 'easy' | 'medium' | 'hard'`, but the `ParsedQuestion.difficulty` discriminated union is `'beginner' | 'intermediate' | 'advanced'`. TypeScript reported TS2367 for both branches.
- **Fix:** Renamed to match the type (`beginner`/`intermediate`/`advanced` → success/warning/danger token mapping). Behavior unchanged; pill now actually renders instead of falling through to the catch-all `advanced` branch.
- **Files modified:** `src/app/question-banks/page.tsx`
- **Commit:** `8a6d562`

## Auth Gates

None encountered.

## Known Stubs

None. All four pages retain full behavior.

## Commits

- `8a6d562` — refactor(15-03): migrate /dashboard + /question-banks to DESIGN tokens
- `52eebd8` — refactor(15-03): migrate /pdf + /history to DESIGN tokens

## Self-Check: PASSED

- `src/app/dashboard/page.tsx`, `src/app/question-banks/page.tsx`, `src/app/pdf/page.tsx`, `src/app/history/page.tsx` all exist and contain **zero** matches for the corrected legacy-utility regex.
- Commits `8a6d562` and `52eebd8` exist in git log on main.
- `npx tsc --noEmit` — clean; `next build` — clean; `npm run test -- --run` — 299 pass / 4 skipped.
- Plan-level grep gate across all four files = 0.
