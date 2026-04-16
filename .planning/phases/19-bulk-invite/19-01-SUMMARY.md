---
phase: 19-bulk-invite
plan: "01"
subsystem: bulk-invite-ui
tags: [email-parsing, chip-ui, tdd, client-component]
dependency_graph:
  requires: []
  provides: [emailParser, EmailChipInput]
  affects: [trainer/onboarding]
tech_stack:
  added: []
  patterns: [pure-function-parsing, debounced-onChange, tdd-red-green]
key_files:
  created:
    - src/lib/emailParser.ts
    - src/lib/emailParser.test.ts
    - src/app/trainer/onboarding/EmailChipInput.tsx
  modified: []
decisions:
  - "Split regex /[\\s,]+/ handles both comma and newline separators in one pass"
  - "Invalid emails excluded from dedup seen-set so two identical malformed strings both render invalid (not duplicate)"
  - "removeChip re-runs dedup from scratch to correctly promote former duplicates to valid"
metrics:
  duration: "~2 minutes"
  completed: "2026-04-16"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 0
  tests_added: 18
---

# Phase 19 Plan 01: Email Parser + Chip Input Summary

**One-liner:** Pure-function email parser with comma/newline split, dedup, 50-cap, removeChip reclassification, and a matching `EmailChipInput` React component with semantic chip colors.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Email parser pure function + tests (TDD) | f23a3d5 | src/lib/emailParser.ts, src/lib/emailParser.test.ts |
| 2 | EmailChipInput React component | 304b0a0 | src/app/trainer/onboarding/EmailChipInput.tsx |

## Decisions Made

1. **Split regex `/[\s,]+/`** — single-pass split handles commas, newlines, tabs, and mixed separators without needing to chain multiple splits.

2. **Invalid emails excluded from dedup seen-set** — an invalid email token can never be "a duplicate of" a valid one. Two identical malformed strings both render `invalid`, not `invalid + duplicate`. This matches the user-visible intent (the batch has two bad entries, not one bad + one flagged).

3. **`removeChip` re-runs full dedup pass** — rather than patching state, removal rebuilds the seen-set from scratch. Ensures correct promotion of former duplicates regardless of removal order.

4. **Named export + default export** — `EmailChipInput` exported both ways per plan spec for maximum flexibility in consuming pages.

## Deviations from Plan

None — plan executed exactly as written. TDD RED→GREEN followed strictly.

## Known Stubs

None — this plan is purely logic + UI component with no data source wiring required. Consuming page (`OnboardingPage`) is built in Plan 02.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. Client-side parsing only; T-19-00 (client input tampering) is `accept` per plan threat register — server re-validates via Zod in Plan 03.

## Self-Check: PASSED

- [x] `src/lib/emailParser.ts` exists
- [x] `src/lib/emailParser.test.ts` exists — 18 tests pass
- [x] `src/app/trainer/onboarding/EmailChipInput.tsx` exists
- [x] Commit f23a3d5 exists
- [x] Commit 304b0a0 exists
- [x] `npx tsc --noEmit` passes clean
