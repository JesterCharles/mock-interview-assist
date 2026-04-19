---
phase: 40-ui-mvp
plan: 03
subsystem: coding-ui
tags: [ui, coding, editor, monaco, solve]
requires:
  - 40-01 (Monaco wrapper)
  - 40-02 (list page hook patterns)
provides:
  - /coding/[challengeId] solve page
  - ChallengePrompt, LanguageToggle, EditorPane, SubmitBar, SolveWorkspace
  - useColorMode hook
  - /api/coding/challenges/[id] detail route
affects:
  - src/app/globals.css (coding-prompt scoped typography)
tech-stack:
  patterns:
    - "marked + dangerouslySetInnerHTML for trusted markdown (server-sourced)"
    - "MutationObserver for reactive color-mode tracking"
    - "D-08 literal reset-on-switch for language starter code"
key-files:
  created:
    - src/hooks/useColorMode.ts
    - src/components/coding/ChallengePrompt.tsx
    - src/components/coding/LanguageToggle.tsx
    - src/components/coding/EditorPane.tsx
    - src/components/coding/SubmitBar.tsx
    - src/components/coding/SolveWorkspace.tsx
    - src/components/coding/SolveWorkspace.test.tsx
    - src/app/api/coding/challenges/[id]/route.ts
  modified:
    - src/app/coding/[challengeId]/page.tsx
    - src/app/globals.css
decisions:
  - "Monaco theme: vs / vs-dark built-ins (custom defineTheme deferred to v1.5)"
  - "Language switch: literal reset to starter per D-08 (preserve-draft deferred to v1.5)"
  - "/api/coding/challenges/[id] added in this plan (Phase 39 did not ship it)"
  - "Accept both CUID and slug as id param (future-proof links)"
metrics:
  duration: "~3 min"
  completed: "2026-04-18"
---

# Phase 40 Plan 03: Solve Page Summary

Shipped `/coding/[challengeId]` per CODING-UI-02. Server component fetches detail from `/api/coding/challenges/[id]` (added here), renders `SolveWorkspace` — two-column md+ / stacked mobile — with `ChallengePrompt` (markdown via `marked`), `EditorPane` (LanguageToggle + Monaco wrapper from 40-01, color-mode-reactive), `SubmitBar` (Submit primary, Run disabled with "Coming soon" tooltip), plus error surface + attempt-id placeholder handoff for 40-04.

## What shipped
- `src/app/api/coding/challenges/[id]/route.ts` — auth-gated, cohort-scoped; loads README via `loadChallenge(slug)`; returns `languages`, `starters`, `visibleTests` (id+stdin+expectedStdout). Never returns hidden tests.
- `useColorMode` hook — SSR-safe; MutationObserver on `<html class>`.
- `ChallengePrompt` — `marked.parse({ gfm:true, breaks:false })`; CSS rules scoped under `.coding-prompt` in globals.css.
- `LanguageToggle` — native select; pretty labels (Python, JavaScript, TypeScript, Java, SQL, C#).
- `EditorPane` — language toggle + CodingEditor (dynamic); resolves theme via `useColorMode()`; D-08 literal reset on lang switch.
- `SubmitBar` — POST /api/coding/submit; disabled on empty/whitespace code or while pending; 429 with Retry-After; FORBIDDEN and network error surfaces via onError.
- `SolveWorkspace` — composes all of the above; md:grid-cols-12 layout (prompt 5 / editor 7); attempt-id placeholder ready for 40-04 VerdictCard swap-in.
- `/coding/[challengeId]` page.tsx — server fetch + shell branching + NOT_FOUND/FORBIDDEN fallbacks.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing route] Added `/api/coding/challenges/[id]` from scratch**
- Found during: Task 3
- Issue: Phase 39 did not ship a detail route; SolveWorkspace needs one
- Fix: New route handler that calls `loadChallenge(slug)` + fetches visible tests from DB; accepts both id and slug (ChallengeCard links via slug, list API returns id — both must resolve)
- Files: `src/app/api/coding/challenges/[id]/route.ts`
- Commit: 9a3e0f1

## Test coverage
- **12 tests** in `SolveWorkspace.test.tsx`:
  - ChallengePrompt: heading + code fence render
  - LanguageToggle: filters to prop list; emits onChange
  - useColorMode: light default; reactive to .dark class
  - EditorPane: initial starter; D-08 literal reset on switch
  - SubmitBar: disabled Run tooltip; Submit POST + onAttemptStarted; aria-busy during pending; 429 retryAfterSeconds; disabled on empty code

## Authentication gates
None.

## Markdown edge cases
- Raw HTML in markdown: `marked` default settings preserve it. Source is trusted (server-side, private repo). If v1.5 adds user-authored challenges, wrap with DOMPurify — noted in ChallengePrompt header comment.

## Language switch behavior
- Literal reset-on-switch per D-08. User-edited code is lost when toggling. If v1.5 wants preserve-draft, refactor EditorPane to hold a `codeByLang` map.

## Self-Check: PASSED

- [x] `src/hooks/useColorMode.ts` FOUND
- [x] `src/components/coding/ChallengePrompt.tsx` FOUND
- [x] `src/components/coding/LanguageToggle.tsx` FOUND
- [x] `src/components/coding/EditorPane.tsx` FOUND
- [x] `src/components/coding/SubmitBar.tsx` FOUND
- [x] `src/components/coding/SolveWorkspace.tsx` FOUND
- [x] `src/components/coding/SolveWorkspace.test.tsx` FOUND
- [x] `src/app/api/coding/challenges/[id]/route.ts` FOUND
- [x] Commit `9a3e0f1` FOUND
