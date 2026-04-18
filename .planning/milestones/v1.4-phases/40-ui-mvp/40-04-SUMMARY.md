---
phase: 40-ui-mvp
plan: 04
subsystem: coding-ui
tags: [ui, coding, polling, verdict, history]
requires:
  - 40-03 (SolveWorkspace scaffold)
provides:
  - usePollAttempt hook with exponential backoff + wall clock
  - VerdictCard (terminal + phase + error states)
  - AttemptHistorySidebar with View swap-in
  - GET /api/coding/attempts list endpoint
  - Monaco bundle regression guard
affects:
  - src/components/coding/SolveWorkspace.tsx (wires VerdictCard + polling + history + toasts)
tech-stack:
  patterns:
    - "Exponential backoff with Retry-After clamp to remaining wall budget"
    - "Source-text regex regression guard for security contract (hidden-test shield)"
key-files:
  created:
    - src/hooks/usePollAttempt.ts
    - src/hooks/usePollAttempt.test.ts
    - src/components/coding/VerdictCard.tsx
    - src/components/coding/VerdictCard.test.tsx
    - src/components/coding/AttemptHistorySidebar.tsx
    - src/components/coding/AttemptHistorySidebar.test.tsx
    - src/components/coding/bundle.test.ts
    - src/app/api/coding/attempts/route.ts
  modified:
    - src/components/coding/SolveWorkspace.tsx
decisions:
  - "Client-side phase inference (elapsed < 1500ms = queued, else running). Debt: v1.5 add explicit server phase field."
  - "Visible test details shown: caseId / passed / stdout / durationMs — NO stdin/expected from poll response (Phase 39 shape)"
  - "react-hot-toast Toaster mounted inside SolveWorkspace; position top-right"
  - "Attempt list: no ETag/cache headers yet — Phase 44 if profiling shows N+1"
metrics:
  duration: "~3 min"
  completed: "2026-04-18"
---

# Phase 40 Plan 04: Polling + Verdict + History Summary

Closes the feedback loop. After Submit, `usePollAttempt` polls `/api/coding/attempts/[id]` with exponential backoff (500ms → 5s, 60s wall) and client-side phase inference (queued < 1500ms; else running). `VerdictCard` renders queued/running/terminal/error states with an overall pill, score, visible-test accordion, and a hidden-test aggregate pill. `AttemptHistorySidebar` lists the last 10 attempts for (caller, challenge) and lets the user swap a past attempt back into the main view. Error toasts cover 429/FORBIDDEN/NETWORK. A bundle regression test prevents Monaco from leaking out of the single dynamic wrapper.

## What shipped
- `src/hooks/usePollAttempt.ts` — exported constants, abort-on-change, unmount cleanup, 404/403/429/Network handling, Retry-After respected + clamped.
- `src/components/coding/VerdictCard.tsx` — phase states + terminal layout; source-grep test guards against hidden-test leakage.
- `src/components/coding/AttemptHistorySidebar.tsx` — fetch on mount + refreshToken; View button; empty/error states.
- `src/app/api/coding/attempts/route.ts` — auth-gated list endpoint; associate sees own, trainer can pass associateSlug.
- `src/components/coding/bundle.test.ts` — walks src/**; matches ES-import, dynamic-import, and require of `@monaco-editor/react`; asserts exactly one offender (the wrapper).
- `SolveWorkspace.tsx` updated to wire: `usePollAttempt(latestAttemptId)` → `<VerdictCard>`; `<AttemptHistorySidebar>` with `refreshToken` increment on Submit; react-hot-toast for errors.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Visible test accordion fields adjusted to match actual poll response**
- Found during: Task 2
- Issue: Plan assumed poll returns `stdin` + `expectedStdout` on visible tests. Phase 39's `codingAttemptPoll.ts` returns only `{ caseId, passed, stdout, durationMs }`.
- Fix: VerdictCard shows only "Your output" (stdout) + pass/fail + durationMs. No stdin/expected display.
- Impact: minor UX — users won't see the test input from the verdict panel; they can still see it from the challenge prompt page.
- Commit: 6b400e0

**2. [Rule 3 - Blocking] bundle.test.ts path resolution + regex patterns**
- Found during: Task 3
- Issue: Initial `resolve(__dirname, ...)` + regex missing dynamic-import pattern produced 0 offenders (test failing)
- Fix: `join(process.cwd(), 'src')` for path; regex triple-pattern (ES import / dynamic import / require); strip comments before scanning
- Commit: 87e4d6b

## Backoff schedule (actual)
- Initial: 500ms
- Factor: 1.5
- Cap: 5000ms
- Wall: 60000ms
- Actual sequence: 500, 750, 1125, 1687, 2531, 3797, 5000, 5000, ...

## Phase inference
- Client-side: `now - submittedAt < 1500ms` → 'queued', else 'running', terminal verdicts → 'terminal'.
- **Debt ticket (v1.5):** extend Phase 39 poll response with explicit `phase: 'queued' | 'running'` so client doesn't need time-math.

## Test timing
- `vi.useFakeTimers()` used throughout usePollAttempt tests. No flakiness observed. All 7 poll test cases pass.

## Toast placement
- `<Toaster position="top-right">` mounted inside `SolveWorkspace` root. If multiple pages need toasts, move to root layout in a follow-up.

## Attempt history
- Ordering: descending `submittedAt`.
- Limit: clamped 1–25, default 10.
- Associate: sees own only. Trainer: can pass `?associateSlug=X` to view.

## Phase 40 close-out debt tickets
- v1.5 add `phase` to poll response (explicit queued/running state)
- v1.5 add DOMPurify to ChallengePrompt if user-authored challenges arrive
- v1.5 implement Run backend (currently disabled button with "Coming soon")
- v1.5 preserve-draft behavior for language switch (currently literal reset per D-08)
- v1.5 per-language starter code authoring UI
- Phase 44 attempt retention policy (table growing without prune)
- Phase 44 ETag/cache for attempts list route if profiling shows slow queries
- v1.5 custom Monaco theme via `defineTheme` matching DESIGN tokens exactly

## Authentication gates
None.

## Self-Check: PASSED

- [x] `src/hooks/usePollAttempt.ts` FOUND
- [x] `src/hooks/usePollAttempt.test.ts` FOUND
- [x] `src/components/coding/VerdictCard.tsx` FOUND
- [x] `src/components/coding/VerdictCard.test.tsx` FOUND
- [x] `src/components/coding/AttemptHistorySidebar.tsx` FOUND
- [x] `src/components/coding/AttemptHistorySidebar.test.tsx` FOUND
- [x] `src/components/coding/bundle.test.ts` FOUND
- [x] `src/app/api/coding/attempts/route.ts` FOUND
- [x] Commit `87e4d6b` FOUND
- [x] Commit `6b400e0` FOUND (Task 1-2)
