---
phase: 15-design-cohesion-sweep
plan: 01
subsystem: design-system
tags: [design, refactor, tokens, a11y]
requirements: [DESIGN-03]
completed: 2026-04-14
duration_min: ~25
dependency_graph:
  requires:
    - "Phase 14 DESIGN.md tokens (--bg/--surface/--ink/--accent etc.)"
    - "Phase 14 .btn-accent-flat / .btn-secondary-flat utilities"
  provides:
    - "Token-only shared components (Navbar, QuestionCard, SpeechToText, ProgressBar)"
    - "Kill-list animations (recording-pulse, progress-glow, pulse-glow, border-glow-pulse, shimmer) removed from shared components"
    - "Focus-visible + 44px hit target a11y on flat buttons"
  affects:
    - "Every consumer page of these 4 components (/, /interview, /review, /dashboard, /history, /pdf, /question-banks) — NOW unblocks Wave 2 (Plans 15-02, 15-03)"
tech_stack:
  patterns:
    - "bg-[var(--surface)] + border border-[var(--border)] surface card"
    - "Clash Display headings via inline style fontFamily: var(--font-display)"
    - "JetBrains Mono uppercase labels with letterSpacing 0.08em"
    - "Static flat recording indicator (dot + uppercase mono label)"
    - ":focus-visible outline on flat buttons for keyboard a11y"
key_files:
  modified:
    - "src/components/Navbar.tsx"
    - "src/components/QuestionCard.tsx"
    - "src/components/SpeechToText.tsx"
    - "src/components/ProgressBar.tsx"
    - "src/app/globals.css (a11y additions to .btn-accent-flat / .btn-secondary-flat)"
  created: []
decisions:
  - "Difficulty badge tones map to semantic DESIGN tokens (easy→success, medium→warning, hard→danger) rather than legacy getDifficultyColor utility — inline switch to avoid pulling legacy helper"
  - "Scored a11y improvement (Rule 2): added min-height:44px + :focus-visible 2px accent outline to .btn-accent-flat and .btn-secondary-flat per design-review directive"
  - "Corrected plan's verification regex — \\bbtn-accent\\b incorrectly flags permitted .btn-accent-flat utility due to '-' being a word boundary; used btn-accent[^-] / btn-primary[^-] which preserves the intent (block only legacy utilities)"
metrics:
  commits: 2
  files_modified: 5
  tasks: 2
  tests_before: "299 passed / 4 skipped"
  tests_after: "299 passed / 4 skipped"
---

# Phase 15 Plan 01: Shared-Component Token Migration Summary

Four shared components (Navbar, QuestionCard, SpeechToText, ProgressBar) migrated from legacy `--nlm-*` tokens + glass/gradient/glow/pulse utility classes onto DESIGN.md tokens; all kill-list animations removed at the leaf level, unblocking Wave 2 page migrations.

## What Changed

### Task 1 — Navbar.tsx + ProgressBar.tsx (`7834068`)

**Navbar.tsx**
- Sticky nav chrome: `bg-[var(--surface)]` + `border-b border-[var(--border)]` (was `bg-slate-900/80 backdrop-blur-xl border-white/[0.06]`).
- Active link: `bg-[var(--highlight)]` + `text-[var(--accent)]` (was indigo translucent).
- Inactive link: `text-[var(--muted)]` + hover `text-[var(--ink)] bg-[var(--highlight)]`.
- Logo: solid `var(--accent)` tile (was cyan→indigo gradient with glow shadow).
- Wordmark: plain Clash Display in `var(--ink)` — `.gradient-text-static` removed.
- Added `aria-label` to mobile menu button (bonus a11y).

**ProgressBar.tsx**
- Container: surface card w/ `0 1px 2px rgba(0,0,0,0.04)` shadow (was `.glass-card`).
- Progress fill: flat `bg-[var(--accent)]` on `bg-[var(--surface-muted)]` track (was `.progress-gradient` — progress-glow keyframe reference now unreferenced anywhere in these 4 files).
- Dot states now use semantic tokens: current=accent filled, completed=success outlined, scoring=warning outlined, processing=accent outlined, skipped=muted, idle=muted (was cyan/indigo/emerald/amber translucent rings).
- Animate-pulse on scoring/processing dots removed (kill-list).
- Section label uses JetBrains Mono uppercase per DESIGN.md.

### Task 2 — QuestionCard.tsx + SpeechToText.tsx (`36d74dd`)

**QuestionCard.tsx**
- Outer: `.glass-card-strong` → `bg-[var(--surface)] border-[var(--border)]` + subtle shadow.
- Cyan decorative corner gradient removed.
- Question heading: inline Clash Display 22/600 in `var(--ink)` (was `text-xl font-semibold text-white`).
- Keyword chips + soft-skill tiles: `var(--surface-muted)` backgrounds with semantic borders (success for hit state, border-subtle for idle). `.glow-border-emerald` deleted.
- `.btn-accent` → `.btn-accent-flat` on Complete button.
- Internal `difficultyTone()` function replaces `getDifficultyColor()` import (legacy helper uses Tailwind hex colors not in token system); maps easy/medium/hard → success/warning/danger tokens.
- Dropped unused `XCircle` import.

**SpeechToText.tsx**
- Recording indicator (critical change per D-02): was red `animate-pulse` dot + `.recording-ring` animation + red-tinted button; now STATIC flat `8x8` `var(--accent)` dot + uppercase JetBrains Mono "Recording" label in `var(--accent)`. Zero animation, zero glow. `aria-live="polite"` added.
- Start/Stop button: `.btn-primary` / `.btn-accent` / `.recording-ring` classes → single `.btn-accent-flat` when idle, `.btn-secondary-flat` when recording. `aria-pressed` state added.
- Transcript textarea: `bg-[var(--surface-muted)]` + token borders (danger/warning/accent depending on state). Focus ring uses `var(--accent)/30`.
- Character chip and progress bar use flat accent fill (no `.progress-gradient`).
- Error banner uses `var(--danger)` border, no glass card.
- Dropped unused `MicOff` and `useCallback` imports.

**globals.css — a11y (Rule 2)**
- `.btn-accent-flat` and `.btn-secondary-flat`: added `min-height: 44px` (touch target) and `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }`.

## Grep Gate Results

| File | Pre-migration | Post-migration |
|------|---------------|----------------|
| Navbar.tsx | 1 (`gradient-text-static`) | 0 |
| ProgressBar.tsx | 2 (`glass-card`, `progress-gradient`) | 0 |
| QuestionCard.tsx | 4 (`glass-card-strong`, `glass-card`, `glow-border-emerald`, `btn-accent`) | 0 |
| SpeechToText.tsx | 6 (`glass-card`×2, `recording-ring`, `btn-accent`, `btn-primary`, `progress-gradient`) | 0 |

Plan-level final gate (all 4 files, corrected regex) → **0 matches**.

## Verification

- `npx tsc --noEmit` — clean (both tasks)
- `npm run test -- --run` — 299 pass / 4 skipped (no regressions, no test files touched)
- `npm run build` — clean production build after Task 2
- Behavior preserved: all component props, event handlers, Web Speech API lifecycle, conditional rendering paths unchanged.

## Deviations from Plan

**1. [Rule 3 - Blocking] Plan verification regex was self-contradictory**
- **Found during:** Task 2 grep gate
- **Issue:** Plan's automated verify regex `\bbtn-accent\b` matches the permitted `.btn-accent-flat` utility because `-` is a non-word character (word boundary fires between `t` and `-`). Applying the plan's literal regex would either (a) block use of the required DESIGN.md flat buttons or (b) fail the gate. The plan body, however, explicitly instructs migration TO `.btn-accent-flat`.
- **Fix:** Used corrected regex `btn-accent[^-]` / `btn-primary[^-]` at the gate, which preserves the documented intent (block only legacy `.btn-accent` / `.btn-primary` bare utilities, permit `-flat` suffix).
- **Files modified:** none (grep-only behavior)
- **Commit:** documented in `36d74dd` body

**2. [Rule 2 - A11y Correctness] Added focus-visible + 44px hit target to flat buttons**
- **Found during:** pre-commit per user prompt a11y directive
- **Issue:** `.btn-accent-flat` and `.btn-secondary-flat` had no `:focus-visible` outline and no minimum touch target, per design review requirement.
- **Fix:** Added `min-height: 44px` and `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }` to both classes in `src/app/globals.css`.
- **Files modified:** `src/app/globals.css`
- **Commit:** `36d74dd`

**3. [Rule 1 - Refactor hygiene] Replaced legacy `getDifficultyColor()` import in QuestionCard**
- **Found during:** Task 2
- **Issue:** `getDifficultyColor()` from `@/lib/markdownParser` returns Tailwind hex colors that sit outside the DESIGN.md token system. Keeping the import would satisfy grep but violate D-17 (no arbitrary hex on migrated files).
- **Fix:** Inlined a 10-line `difficultyTone()` map to semantic tokens (success/warning/danger). No behavior change (badge still colors by difficulty).
- **Commit:** `36d74dd`

## Auth Gates

None encountered.

## Known Stubs

None. All four components retain full behavior.

## Commits

- `7834068` — refactor(15-01): migrate Navbar + ProgressBar to DESIGN tokens
- `36d74dd` — refactor(15-01): migrate QuestionCard + SpeechToText to DESIGN tokens (kill recording-pulse)

## Self-Check: PASSED

- Navbar.tsx, ProgressBar.tsx, QuestionCard.tsx, SpeechToText.tsx all exist and contain zero matches for the legacy-utility regex (corrected).
- Commits `7834068` and `36d74dd` exist in git log.
- `.btn-accent-flat` and `.btn-secondary-flat` in globals.css now include `:focus-visible` + `min-height: 44px`.
- Vitest full suite green (299 pass / 4 skipped).
- Next build green.
