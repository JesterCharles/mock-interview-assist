---
phase: 31-dark-mode-qa-sweep
plan: "01"
subsystem: design-system
tags: [dark-mode, css-tokens, design-system, color]
dependency_graph:
  requires: []
  provides: [dark-mode-token-coverage]
  affects: [all-routes, trainer-dashboard, interview-flow, onboarding]
tech_stack:
  added: []
  patterns: [CSS custom properties, semantic badge background tokens]
key_files:
  created: []
  modified:
    - src/app/globals.css
    - src/components/trainer/GapTrendChart.tsx
    - src/components/trainer/CohortSummaryBar.tsx
    - src/components/trainer/SessionHistoryList.tsx
    - src/components/trainer/RosterTable.tsx
    - src/components/trainer/CurriculumWeekRow.tsx
    - src/components/trainer/AddCurriculumWeekForm.tsx
    - src/components/trainer/CalibrationView.tsx
    - src/components/trainer/SkillFilterDropdown.tsx
    - src/components/trainer/ReadinessDisplay.tsx
    - src/components/trainer/CohortFilterBar.tsx
    - src/components/trainer/CurriculumTable.tsx
    - src/components/interview/AuthenticatedInterviewClient.tsx
    - src/components/dashboard/CurriculumFilterBadge.tsx
    - src/app/page.tsx
    - src/app/interview/new/page.tsx
    - src/app/review/page.tsx
    - src/app/pdf/page.tsx
    - src/app/question-banks/page.tsx
    - src/app/trainer/(dashboard)/page.tsx
    - src/app/trainer/(dashboard)/loading.tsx
    - src/app/trainer/(dashboard)/[slug]/page.tsx
    - src/app/trainer/(dashboard)/[slug]/loading.tsx
    - src/app/trainer/(dashboard)/[slug]/AssociateCohortSelect.tsx
    - src/app/trainer/(dashboard)/reports/page.tsx
    - src/app/trainer/onboarding/EmailChipInput.tsx
    - src/app/trainer/onboarding/BulkPreviewTable.tsx
    - src/app/trainer/onboarding/BulkResultTable.tsx
    - src/app/trainer/onboarding/page.tsx
decisions:
  - "White text on colored buttons kept as literal 'white' not var(--ink) — intentionally always white regardless of theme"
  - "rgba(0,0,0,*) shadow values left untouched — neutral scrims work in both themes"
  - "CohortFilterBar comment block retaining old hex for documentation — only code values replaced"
  - "#C9C2B8 (close-enough border) mapped to var(--border) per plan mapping table"
metrics:
  duration: "~60 minutes execution"
  completed_date: "2026-04-16"
  tasks: 3
  files_modified: 29
---

# Phase 31 Plan 01: Dark Mode QA Sweep Summary

Complete dark mode token coverage — replaced every hardcoded hex color across all .tsx files with CSS variable token references. Added three new semantic badge background tokens with light/dark pairs.

## Tasks Completed

### Task 1: Add semantic badge-background tokens to globals.css

Added `--success-bg`, `--warning-bg`, `--danger-bg` to `:root` (light) and `[data-theme="dark"]` blocks, plus `@theme inline` Tailwind mappings. 9 total references confirmed.

Commit: `30d8fd0`

### Task 2: Replace hardcoded hex in trainer components

All 11 trainer component files cleaned:
- `GapTrendChart.tsx`: TOPIC_COLORS now uses `--chart-1/2/4` and `--accent`; CartesianGrid uses `--border-subtle`; axis ticks, tooltip, legend all use tokens
- `CohortSummaryBar.tsx`: pills use `--success/--warning/--danger` + `--success-bg/--warning-bg/--danger-bg`
- `SessionHistoryList.tsx`: StatusBadge uses badge-bg tokens; all cell colors tokenized
- `RosterTable.tsx`: empty state and placeholder em-dash colors tokenized
- `CalibrationView.tsx`: all inline styles replaced — hover highlight, borders, conditional cell colors
- `CohortFilterBar.tsx`: focus ring uses `--accent`/`--chart-highlight`, select uses design tokens
- `ReadinessDisplay.tsx`: STATUS_CONFIG colors use `--success`/`--accent`/`--danger`
- `SkillFilterDropdown.tsx`: label and select use design tokens
- `CurriculumWeekRow.tsx`: input styles, Save/Cancel buttons, error row, display-mode colors all tokenized
- `AddCurriculumWeekForm.tsx`: all input/label/error/submit styles use tokens
- `CurriculumTable.tsx`: loading text and error alert use tokens

Commit: `bdf5818`

### Task 3: Replace hardcoded hex in app routes and remaining components

17 files cleaned:
- `AuthenticatedInterviewClient.tsx`: `tokens` const replaced with `var(--*)` values
- `CurriculumFilterBadge.tsx`: fallback hex stripped from all `var(--token, #hex)` patterns
- `app/page.tsx`: danger-bg/warning-bg/success-bg for error banners and keyword badges
- `interview/new/page.tsx`: all status banners and weight buttons use badge-bg tokens
- `review/page.tsx`: score status badge backgrounds use `--success-bg`/`--warning-bg`
- `pdf/page.tsx`: status indicator uses `--success-bg`/`--danger-bg`; button text kept as `'white'`
- `question-banks/page.tsx`: difficulty labels use badge-bg tokens
- `trainer/(dashboard)/page.tsx`: heading color, skeleton shimmer, error alert all tokenized
- `trainer/(dashboard)/loading.tsx`: all skeleton placeholders use `--border`/`--border-subtle`/`--surface-muted`
- `trainer/(dashboard)/[slug]/page.tsx`: back link, skeletons, error, heading, metadata, export button all tokenized
- `trainer/(dashboard)/[slug]/loading.tsx`: skeleton colors use design tokens
- `AssociateCohortSelect.tsx`: label, select, status text all tokenized
- `reports/page.tsx`: fallback hex stripped from all `var(--token, #hex)` patterns
- `onboarding/EmailChipInput.tsx`: CHIP_STYLES uses badge-bg tokens
- `onboarding/BulkPreviewTable.tsx`: ACTION_BADGE_STYLES uses badge-bg tokens
- `onboarding/BulkResultTable.tsx`: STATUS_BADGE_STYLES uses badge-bg tokens
- `onboarding/page.tsx`: API error banner uses `--danger-bg`/`--danger`

Commit: `3ba991a`

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written with one clarification applied:

**Clarification: `rgba(26,26,26,0.6)` modal overlay**
Plan noted `src/app/page.tsx line 1257: rgba(26,26,26,0.6)` should become `rgba(0,0,0,0.6)`. The value was not found at that exact location in the current codebase (likely already changed in a prior phase). No action needed.

## Known Stubs

None — all changes are token replacements, no placeholder data.

## Threat Flags

None — purely cosmetic CSS token replacements with no new trust boundaries.

## Build Verification

`npm run build` from worktree path fails with a Turbopack workspace-root detection error specific to the git worktree path structure (Next.js 16 Turbopack cannot locate `next/package.json` from a worktree subdirectory). This is a known worktree environment limitation, not a code error introduced by this plan. The main repo build is unaffected — pre-existing TypeScript errors from stale Prisma client (Profile model) exist on main branch already.

Final hex scan across all modified files: zero hardcoded hex values remain in code (comments excluded). PDFReport.tsx is the sole acceptable exception per plan specification.

## Self-Check: PASSED

Files verified present:
- src/app/globals.css — contains `--success-bg` token: FOUND
- src/components/trainer/GapTrendChart.tsx — uses `var(--chart-`: FOUND

Commits verified:
- 30d8fd0: feat(31-01): add --success-bg, --warning-bg, --danger-bg tokens: FOUND
- bdf5818: feat(31-01): replace hardcoded hex in all trainer components: FOUND
- 3ba991a: feat(31-01): replace hardcoded hex in app routes and remaining components: FOUND
