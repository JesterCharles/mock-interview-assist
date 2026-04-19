---
phase: 50-judge0-integration-points-flag-audit
plan: 03
subsystem: ui-feature-flag
tags: [feature-flag, ui, react, coming-soon]
requires:
  - 50-01
provides:
  - CodingComingSoon component
  - useCodingStatus hook
affects:
  - /coding page
  - /coding/[challengeId] page
  - SubmitBar
  - SolveWorkspace
tech-stack:
  added: []
  patterns:
    - "Server-component flag check (isCodingEnabled()) — no NEXT_PUBLIC_* env bake"
    - "Module-scope 60s cache in client hook (matches endpoint Cache-Control)"
    - "Error-code dispatch (FEATURE_DISABLED) not string matching"
key-files:
  created:
    - src/components/coding/CodingComingSoon.tsx
    - src/components/coding/CodingComingSoon.test.tsx
    - src/hooks/useCodingStatus.ts
    - src/hooks/useCodingStatus.test.ts
  modified:
    - src/app/coding/page.tsx
    - src/app/coding/[challengeId]/page.tsx
    - src/components/coding/SubmitBar.tsx
    - src/components/coding/SolveWorkspace.tsx
    - src/components/coding/SolveWorkspace.test.tsx
decisions:
  - "Server pages call isCodingEnabled() directly — NOT fetch /api/coding/status — to avoid an extra RTT when the answer is already in process.env"
  - "Client hook fetches /api/coding/status — lets flag flip without rebuild (NEXT_PUBLIC_* would require redeploy)"
  - "Fail-open on fetch error: render workspace, let submit 503 — better than blocking users on transient hiccup"
  - "FEATURE_DISABLED dispatch via error code, not regex on message (typed path)"
metrics:
  duration: ~12min
  completed: 2026-04-18
  tasks: 2
  tests-added: 11
  regression-suite: 1055/1059 passing
---

# Phase 50 Plan 03: Client UI Flag Integration Summary

**One-liner:** Added ComingSoon card, useCodingStatus hook, and wired /coding pages + SubmitBar + SolveWorkspace to render "coming soon" when flag is off; supports race-case swap mid-session.

## What Was Built

### Task 1: CodingComingSoon + useCodingStatus

- `src/components/coding/CodingComingSoon.tsx`: centered DESIGN-token card. Headline "Coding Challenges Coming Soon", body "We're building an in-browser coding environment. Check back in a few weeks.", "Back to Dashboard" link (default `/dashboard`, override via `backHref` prop). Uses `var(--ink)`, `var(--muted)`, `var(--accent)`, `var(--surface)`, `var(--border)`, `var(--text-on-accent)`.
- `src/hooks/useCodingStatus.ts`: client hook fetches `/api/coding/status` on mount, caches the result for 60s in module scope (matches the endpoint's `Cache-Control: public, s-maxage=60`). Returns `{status: 'loading' | 'ready' | 'error', enabled: boolean | null}`. Fail-open on network error.
- 5 tests per file = 10 new tests.

Commit: (first commit in this plan run) — `feat(50-03): add CodingComingSoon card + useCodingStatus hook`

### Task 2: Page + SolveWorkspace wiring

- `src/app/coding/page.tsx` + `src/app/coding/[challengeId]/page.tsx`: server-side `isCodingEnabled()` check BEFORE any `/api/coding/*` fetch. When off, renders `<CodingComingSoon backHref={...} />` inside the role-aware shell (`AssociateShell` for associates, `AppShell` for trainers).
- `src/components/coding/SubmitBar.tsx`: on 503 with `{enabled: false}` body, surfaces `onError` with `code: 'FEATURE_DISABLED'` (distinct from the pre-existing `SANDBOX_UNAVAILABLE` mapping for non-flag 503s).
- `src/components/coding/SolveWorkspace.tsx`: catches `FEATURE_DISABLED` error code → sets `disabledByServer` state → renders `CodingComingSoon`. Defense-in-depth for mid-session flag flip.
- 1 new SubmitBar test assertion for the FEATURE_DISABLED dispatch.

Commit: `06ab70c` — `feat(50-03): wire /coding pages + SubmitBar + SolveWorkspace to ComingSoon`

## Deviations from Plan

None — plan's parallelization-strategy discussion converged on: server components use `isCodingEnabled` directly, client hook fetches `/api/coding/status`. Both approaches shipped in this plan.

## Threat Flags

None.

## Self-Check: PASSED

- `CodingComingSoon.tsx` + test FOUND
- `useCodingStatus.ts` + test FOUND
- `/coding/page.tsx` + `/coding/[challengeId]/page.tsx` import `CodingComingSoon` + `isCodingEnabled` (grep OK)
- `SubmitBar.tsx` contains `FEATURE_DISABLED` (grep OK)
- `SolveWorkspace.tsx` imports `CodingComingSoon` (grep OK)
- Design tokens `var(--accent)`, `var(--ink)` present in ComingSoon
- Full regression 1055/1059 passing (4 pre-existing skipped)
- `npx tsc --noEmit` exits 0
