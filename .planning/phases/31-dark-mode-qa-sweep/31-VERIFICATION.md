---
phase: 31-dark-mode-qa-sweep
verified: 2026-04-16T00:00:00Z
status: gaps_found
score: 2/4 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Switching to dark mode on any page produces no parchment-white backgrounds, no dark-on-dark text, and no invisible borders"
    status: failed
    reason: "trainer.css defines --bg, --surface, --surface-muted, --ink, --muted, --accent, --border, --border-subtle, --highlight under .trainer-shell class without a dark mode override block. Since .trainer-shell is applied to the root div of all /trainer pages, these light-theme values override the [data-theme=\"dark\"] globals for the entire trainer dashboard subtree. In dark mode, /trainer and /trainer/[slug] will render with parchment-white (#F5F0E8) backgrounds."
    artifacts:
      - path: "src/app/trainer/(dashboard)/trainer.css"
        issue: "Scopes all design tokens under .trainer-shell with light values only — no [data-theme=\"dark\"] .trainer-shell counterpart block. Trainer pages import this file which re-assigns --bg: #F5F0E8, --surface: #FFFFFF, etc., overriding globals.css dark theme vars for the trainer subtree."
    missing:
      - "Add [data-theme=\"dark\"] .trainer-shell { ... } block to trainer.css with dark equivalents of all token values (matching the [data-theme=\"dark\"] block in globals.css)"

  - truth: "No component file contains a hardcoded hex color that has a design token equivalent"
    status: failed
    reason: "ProfileTabs.tsx (created in phase 28.1, not listed in phase 31 plan) contains hardcoded #E8F5EE, #FEF3E0, #FDECEB in readinessBadgeStyle(). These are exactly the badge-bg hex values that phase 31 Task 1 added as --success-bg, --warning-bg, --danger-bg tokens — but ProfileTabs.tsx was not included in the sweep file list."
    artifacts:
      - path: "src/app/profile/ProfileTabs.tsx"
        issue: "Lines 64, 75, 85 use hardcoded #E8F5EE, #FEF3E0, #FDECEB as background values in readinessBadgeStyle(). Token equivalents --success-bg, --warning-bg, --danger-bg now exist in globals.css."
    missing:
      - "Replace background: '#E8F5EE' with background: 'var(--success-bg)' in readinessBadgeStyle()"
      - "Replace background: '#FEF3E0' with background: 'var(--warning-bg)' in readinessBadgeStyle()'"
      - "Replace background: '#FDECEB' with background: 'var(--danger-bg)' in readinessBadgeStyle()'"

  - truth: "Semantic badge backgrounds (success/warning/danger) switch to dark variants automatically"
    status: partial
    reason: "globals.css has correct dark variant token values. However ProfileTabs.tsx uses hardcoded hex instead of the tokens, so the readiness badge on the profile page will always show light badge colors regardless of theme."
    artifacts:
      - path: "src/app/profile/ProfileTabs.tsx"
        issue: "readinessBadgeStyle() uses hardcoded hex background colors instead of var(--success-bg), var(--warning-bg), var(--danger-bg)"
    missing:
      - "Use token references in ProfileTabs.tsx readinessBadgeStyle() so dark mode gets #1A2E24, #2E2518, #2E1C1A badge backgrounds"
---

# Phase 31: Dark Mode QA Sweep Verification Report

**Phase Goal:** Every page and component in the application renders correctly under the dark mode theme with no hardcoded colors or light-only classes
**Verified:** 2026-04-16
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Switching to dark mode on any page produces no parchment-white backgrounds, no dark-on-dark text, and no invisible borders | FAILED | trainer.css re-scopes --bg/#F5F0E8, --surface/#FFFFFF under .trainer-shell with no dark override — trainer pages will show light theme in dark mode |
| 2  | All recharts components use CSS variable tokens for stroke, fill, and tooltip styling | VERIFIED | GapTrendChart.tsx: TOPIC_COLORS=['var(--chart-1)','var(--chart-2)','var(--chart-4)','var(--accent)'], CartesianGrid stroke='var(--border-subtle)', axis ticks fill='var(--muted)', tooltip uses var(--surface)/var(--border)/var(--ink) |
| 3  | No component file contains a hardcoded hex color that has a design token equivalent | FAILED | ProfileTabs.tsx lines 64/75/85: #E8F5EE, #FEF3E0, #FDECEB — all have token equivalents (--success-bg, --warning-bg, --danger-bg) added in Task 1 of this phase. CurriculumBanner.tsx line 42: color '#ffffff' on accent button — this matches plan's explicit exception rule ('keep as white') and is acceptable. |
| 4  | Semantic badge backgrounds (success/warning/danger) switch to dark variants automatically | PARTIAL | globals.css has correct dark pairs (#1A2E24, #2E2518, #2E1C1A). ProfileTabs.tsx bypasses tokens with hardcoded hex — profile page readiness badge is stuck in light mode. Trainer components correctly use var(--success-bg)/var(--warning-bg)/var(--danger-bg). |

**Score:** 2/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/globals.css` | --success-bg, --warning-bg, --danger-bg with light and dark pairs | VERIFIED | 9 references found: lines 26-28 (:root), 62-64 ([data-theme="dark"]), 102-104 (@theme inline) |
| `src/components/trainer/GapTrendChart.tsx` | var(--chart-*) tokens, no TOPIC_COLORS hex array | VERIFIED | TOPIC_COLORS=['var(--chart-1)','var(--chart-2)','var(--chart-4)','var(--accent)'] at line 81; all axis/tooltip styles use tokens |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/globals.css` | `[data-theme='dark']` | CSS custom property overrides | VERIFIED | Lines 62-64: --success-bg: #1A2E24, --warning-bg: #2E2518, --danger-bg: #2E1C1A |
| `src/components/trainer/GapTrendChart.tsx` | `src/app/globals.css` | var(--chart-*) token references | VERIFIED | Multiple var(--chart-1/2/4), var(--accent), var(--border-subtle), var(--muted), var(--surface), var(--ink) references confirmed |
| `src/app/trainer/(dashboard)/trainer.css` | `[data-theme="dark"]` globals | Cascade/inheritance | FAILED | trainer.css overrides --bg, --surface, etc. under .trainer-shell without dark counterpart — breaks dark mode for all /trainer pages |

### Data-Flow Trace (Level 4)

Not applicable — this phase produces CSS token coverage, not dynamic data rendering.

### Behavioral Spot-Checks

Step 7b SKIPPED — dark mode correctness requires visual browser inspection; cannot verify color appearance programmatically.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DARK-01 | 31-01-PLAN.md | All pages and components respect dark mode theme (no hardcoded hex, no light-only Tailwind classes) | PARTIAL | trainer.css breaks dark mode on trainer pages; ProfileTabs.tsx uses hardcoded badge-bg hex |
| DARK-02 | 31-01-PLAN.md | All recharts components use CSS var tokens for fills, strokes, and tooltip styles | VERIFIED | GapTrendChart.tsx fully tokenized; all chart-related components use var(--chart-*) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/trainer/(dashboard)/trainer.css` | 3-16 | .trainer-shell scopes light-only token values with no [data-theme="dark"] override | BLOCKER | All /trainer and /trainer/[slug] pages render parchment-white in dark mode |
| `src/app/profile/ProfileTabs.tsx` | 64, 75, 85 | Hardcoded #E8F5EE, #FEF3E0, #FDECEB in readinessBadgeStyle() | BLOCKER | Profile page readiness badge always shows light badge backgrounds |
| `src/components/associate/CurriculumBanner.tsx` | 42 | color: '#ffffff' on accent button | INFO | Plan explicitly allows '#ffffff'/'white' for text on colored buttons — functionally acceptable, form differs from convention |

### Human Verification Required

#### 1. Dark Mode Visual Pass — Trainer Pages

**Test:** Enable dark mode (via browser DevTools or localStorage `nlm-theme=dark`), visit `/trainer` and `/trainer/[slug]`
**Expected:** Page background should be dark (#1C1917 or equivalent), not parchment (#F5F0E8)
**Why human:** CSS cascade specificity with custom properties requires visual confirmation; cannot assert rendering outcome from static analysis alone

#### 2. Dark Mode Visual Pass — Profile Page Badge

**Test:** Enable dark mode, visit `/associate/[slug]` profile page (or wherever ProfileTabs renders)
**Expected:** Readiness badge should show dark badge background (#1A2E24 for ready, #2E2518 for improving, #2E1C1A for not_ready)
**Why human:** Requires rendering to confirm visual output

### Gaps Summary

Two gaps block the phase goal:

**Gap 1 — trainer.css light-only token scope (blocker):** `trainer.css` defines CSS custom properties under `.trainer-shell` with hardcoded light hex values and no dark mode override. Because `.trainer-shell` is applied to the top-level div of all trainer pages, it re-assigns `--bg: #F5F0E8`, `--surface: #FFFFFF`, and nine other tokens — overriding the `[data-theme="dark"]` values set on `<html>`. Fix: add a `[data-theme="dark"] .trainer-shell { }` block to `trainer.css` with dark equivalents for all 12 token assignments.

**Gap 2 — ProfileTabs.tsx missed in sweep (blocker):** `ProfileTabs.tsx` was created in phase 28.1 and was not included in phase 31's file list. It uses the exact hex values (#E8F5EE, #FEF3E0, #FDECEB) that this phase added as token equivalents. The readiness badge on the profile page will always display light badge colors. Fix: replace the three hardcoded hex values with `var(--success-bg)`, `var(--warning-bg)`, `var(--danger-bg)`.

These two gaps are related to the same root cause: the sweep file list was incomplete. Files created in phases 28.1 and 30 that were not in the phase 31 plan were not audited.

---

_Verified: 2026-04-16_
_Verifier: Claude (gsd-verifier)_
