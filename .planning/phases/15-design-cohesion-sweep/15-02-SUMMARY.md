---
phase: 15-design-cohesion-sweep
plan: 02
subsystem: design-system
tags: [design, refactor, tokens, mid-session, regression-risk]
requirements: [DESIGN-03]
status: AWAITING-MANUAL-SMOKE
completed: PENDING
duration_min: ~15 (Tasks 1-2; checkpoint pending)
dependency_graph:
  requires:
    - "Plan 15-01 (shared components on DESIGN tokens)"
    - "Phase 14 PublicShell + DESIGN.md tokens + .btn-accent-flat utilities"
  provides:
    - "/, /interview, /review on DESIGN tokens (warm parchment, Clash Display, flat burnt orange CTAs)"
    - "Hard gate: D-20 manual trainer-led full-interview smoke (BLOCKING — see Task 3)"
  affects:
    - "Unblocks Plan 15-04 legacy deletion ONLY after human approves Task 3 smoke"
tech_stack:
  patterns:
    - "PublicShell wrapper for anonymous /"
    - "bg-[var(--bg)] + main wrapper (no shell) for trainer-led /interview, /review"
    - "Inline style objects with var(--token) — no arbitrary hex (per Phase 14 D-17)"
    - "Status badges mapped to DESIGN.md §Semantic Badge Colors"
    - "tabular-nums on score cells via fontVariantNumeric"
key_files:
  modified:
    - "src/app/page.tsx"
    - "src/app/interview/page.tsx"
    - "src/app/review/page.tsx"
  created: []
decisions:
  - "Used corrected grep regex (btn-accent[^-] / btn-primary[^-]) per 15-01 SUMMARY deviation #1 — bare \\bbtn-accent\\b false-matches permitted .btn-accent-flat"
  - "Trainer-led /interview and /review do NOT wrap in PublicShell (per D-14 — PublicShell is for public/anon surfaces; trainer flows render full-bleed against var(--bg))"
  - "Anonymous / wraps every step (loading, limit-reached, topics, interview, done) in PublicShell so warm parchment + wordmark chrome are consistent across the entire automated flow"
  - "Status badges in /review reuse DESIGN.md Semantic Badge Colors: #E8F5EE/success (validated), #FEF3E0/warning (ready), highlight/accent (processing), surface-muted/muted (skipped/pending)"
  - "Loading spinners standardized to var(--accent) (replaces cyan-400/indigo-500 gradient tiles)"
  - "Burnt orange (var(--accent)) used ONLY for buttons/CTAs/selected-state borders/score numerals/icons — never on body copy (per design-review a11y note from prompt)"
metrics:
  commits: 2
  files_modified: 3
  tasks_executed: 2
  tasks_total: 3
  tests_before: "299 passed / 4 skipped"
  tests_after: "299 passed / 4 skipped"
---

# Phase 15 Plan 02: High-Regression-Risk Page Migration Summary (PRELIMINARY)

> **STATUS: AWAITING HUMAN APPROVAL** — Tasks 1 and 2 (token swap on `/`, `/interview`, `/review`) are complete and committed. Task 3 is a `checkpoint:human-verify gate="blocking"` (D-20 hard gate) requiring a full trainer-led interview smoke before this plan can be marked complete and Plan 15-04 (legacy deletion) can begin.

`/`, `/interview`, and `/review` migrated from legacy `--nlm-*` tokens + glass/gradient utilities onto DESIGN.md tokens; behavior preserved end-to-end with token/utility swap only. Manual smoke gate pending human verification.

## What Changed

### Task 1 — `src/app/page.tsx` (`9e1d6f6`)

Anonymous automated-interview root, the highest-hit file in the sweep (32 baseline references). Every UI step now lives inside `<PublicShell>`:

- **Loading / limit-reached / topics / interview / done** — all five `step` branches wrapped in `PublicShell` for consistent warm parchment + wordmark chrome.
- **Hero** — `.glass-card-strong` + `.gradient-text "Mock"` -> Clash Display 48px in `var(--ink)`, no gradient.
- **Topic tiles** — cyan glow-border-cyan glass tiles -> `var(--surface)` cards with `var(--accent)` border + `var(--highlight)` background when selected.
- **CTAs** — `.btn-primary` / `.btn-accent` / cyan-gradient buttons -> `.btn-accent-flat` / `.btn-secondary-flat` throughout.
- **Heads-up callout** — amber glass card -> `#FEF3E0` background + `var(--warning)` border (DESIGN.md badge color).
- **Question card** (interview step) — `.glass-card-strong` + cyan-to-indigo gradient tile + decorative gradient corners -> surface card with flat `var(--accent)` numeral chip.
- **Follow-up prompt** — cyan glow-border glass -> `var(--highlight)` + `var(--accent)` border with mono "Follow-up" label.
- **Skipped/Ideal Response panel** — emerald glass + gradient stripe -> surface-muted card with `var(--success)` mono label.
- **Done page hero** — emerald-to-teal gradient icon + glass-card-strong -> flat `var(--success)` icon tile + surface card. Aggregate score uses `tabular-nums` Clash Display.
- **Exit modal** — `bg-black/60 backdrop-blur-sm` + amber glass-card-strong -> solid overlay (`rgba(26,26,26,0.6)`, no blur per D-02 anti-pattern) + warning-bordered surface card.
- **Detailed breakdown cards** — indigo glass + gradient stripe + cyan keyword chips -> surface cards with `var(--highlight)`/`var(--accent)` score badge and `#E8F5EE`/`var(--success)` keyword pills.
- Dropped unused `GitHubFile` import.

### Task 2 — `src/app/interview/page.tsx` + `src/app/review/page.tsx` (`d065ed3`)

Trainer-led mid-session surfaces. Per D-14, these do NOT wrap in `PublicShell` (they keep the existing trainer chrome from the root layout). Outer wrappers are `<main className="min-h-screen" style={{ background: 'var(--bg)' }}>`.

**`/interview`:**
- `.nlm-bg` -> `bg-[var(--bg)]`.
- Header dark slate + `.gradient-text-static "Interviewing"` -> `var(--border-subtle)` divider + JetBrains Mono uppercase mono label + surface-muted candidate-name pill.
- Navigation Previous/Next dark hover-slate -> `.btn-secondary-flat`. Finish Interview `.btn-accent` -> `.btn-accent-flat`.
- Loading state cyan-to-indigo gradient tile -> single `var(--accent)` spinner on warm parchment.
- `QuestionCard`, `ProgressBar` consumed as-is from Plan 15-01.

**`/review`:**
- `.nlm-bg` -> `bg-[var(--bg)]`.
- Summary cards `.glass-card-strong` + `white/10` borders -> `surfaceCard` style (var(--surface) + var(--border) + 12px radius + subtle shadow). Score values use `fontVariantNumeric: 'tabular-nums'` and Clash Display.
- Blue-500/10 + purple-500/10 feedback glass cards -> surface-muted with JetBrains Mono labels in `var(--accent)`.
- Generate PDF gradient-indigo-to-purple, Accept All indigo-600, Edit Overall indigo-600 -> all flat utilities (`.btn-accent-flat` / `.btn-secondary-flat`).
- Status badges mapped to DESIGN.md §Semantic Badge Colors via inline `getStatusInfo()` helper (legacy Tailwind `text-green-600` / `bg-green-100` etc. removed).
- Star rating amber-400 -> `var(--accent)` filled. Score selector indigo-600 -> `var(--accent)` filled.
- All textareas: `bg-white/[0.06] border-white/[0.08]` -> `var(--surface)` + `var(--border)`.
- Score cells use `tabular-nums` per D-04 typography rule.

## Grep Gate Results

| File | Pre-migration | Post-migration |
|------|---------------|----------------|
| `src/app/page.tsx` | 32 | 0 |
| `src/app/interview/page.tsx` | 4 | 0 |
| `src/app/review/page.tsx` | 7 | 0 |

Plan-level final gate (corrected regex: `btn-accent[^-]` / `btn-primary[^-]`) -> **0 matches** across all three files.

```bash
grep -cE "nlm-bg|glass-card|gradient-text|glow-border|progress-gradient|recording-ring|--nlm-|btn-primary[^-]|btn-accent[^-]|gradient-shift|\bfloat\b|pulse-glow|shimmer|recording-pulse|progress-glow|border-glow-pulse" \
  src/app/page.tsx src/app/interview/page.tsx src/app/review/page.tsx
# → all 0
```

## Verification

- `npx tsc --noEmit` — clean (after both tasks)
- `npm run test -- --run` — 299 pass / 4 skipped (no regressions, no test files touched)
- `npm run build` — clean production build (after both tasks)
- Behavior preserved: every store handler, fetch call, useEffect, conditional render path retained verbatim. Only classes/styles changed.

## Deviations from Plan

**1. [Rule 3 - Blocking] Plan verification regex would false-match permitted utility**
- **Found during:** Task 1 grep gate
- **Issue:** Plan's automated verify regex `\bbtn-accent\b` matches the permitted `.btn-accent-flat` utility (per 15-01 SUMMARY deviation #1). Carried forward the corrected regex `btn-accent[^-]` / `btn-primary[^-]`.
- **Fix:** Used corrected regex at the gate; documented in both commit bodies.
- **Files modified:** none (grep-only behavior)
- **Commits:** `9e1d6f6`, `d065ed3`

No Rule 1/2 deviations. No auth gates. No architectural decisions required.

## Auth Gates

None encountered.

## Known Stubs

None. All three pages retain full behavior (interview state machine, scoring fan-out, PDF download, exit-guard modal, retry-LLM, override editor, summary auto-generation).

## Commits

- `9e1d6f6` — `refactor(15-02): migrate / (anon automated-interview) to DESIGN tokens`
- `d065ed3` — `refactor(15-02): migrate /interview + /review to DESIGN tokens`

## Self-Check: PASSED (Tasks 1-2)

- `src/app/page.tsx`, `src/app/interview/page.tsx`, `src/app/review/page.tsx` all exist and contain zero matches for the legacy-utility regex (corrected).
- Commits `9e1d6f6` and `d065ed3` exist in git log.
- Vitest full suite green (299 pass / 4 skipped).
- Next build green.
- Typecheck clean.

## Pending — Task 3 (checkpoint:human-verify gate=blocking)

This summary is **PRELIMINARY**. Plan 15-02 cannot be marked complete (and Plan 15-04 deletion cannot start) until the human runs the D-20 trainer-led full-interview smoke as specified in the plan and approves with `"approved — full smoke passed"` (or reports a regression).

Smoke covers: dashboard setup wizard -> trainer-led interview (warm parchment, static recording dot, voice + scoring + timer) -> `/review` (validation, override, PDF generation, email send) -> anonymous `/` (incognito, automated public flow). See `15-02-PLAN.md` Task 3 `<how-to-verify>` for the full step-by-step.

Once approved, this SUMMARY will be updated with the approval quote, status flipped to `complete`, and STATE.md / ROADMAP.md / requirements advanced.
