---
phase: 36-data-model-schema
plan: 03
subsystem: coding-signal-mapper
tags: [pure-function, signal-mapping, tdd, coding-challenges]
requires: [36-01]
provides: [mapSignalToScore, SIGNAL_WEIGHTS, SignalType]
affects: [src/lib/codingSignalService.ts, src/lib/__tests__/codingSignalService.test.ts]
tech-stack:
  added: []
  patterns: [pure-function service, Zod enum at boundary, Object.freeze immutable table]
key-files:
  created:
    - src/lib/codingSignalService.ts
    - src/lib/__tests__/codingSignalService.test.ts
  modified: []
decisions:
  - "Throws on invalid input (divergence from gapService filter pattern) — trusted server-side source"
  - "D-16 weight values locked (tuning is code-review concern)"
  - "SIGNAL_WEIGHTS via Object.freeze (T-36-05 tampering mitigation)"
metrics:
  duration: "~2min"
  completed: "2026-04-18"
  tests_added: 17
---

# Phase 36 Plan 03: Coding Signal Service Summary

Implemented pure-function `codingSignalService.ts` — arithmetic spine of coding-challenge readiness. Ships with 17 Vitest tests covering every SignalType + all edge cases per D-18.

## D-16 Weight Table (Verbatim)

| signalType | baseScore | weight | Rationale |
|-----------|-----------|--------|-----------|
| pass | 100 | 1.0 | Full credit |
| partial | computed | 0.85 | Discount partial vs clean pass |
| fail | 0 | 1.0 | Clear signal |
| compile_error | 10 | 0.6 | "Tried but didn't run" weaker than wrong answer |
| timeout | 20 | 0.8 | Algorithm chosen but inefficient |

## Test Coverage (17 tests, all passing)

- **pass/fail/compile_error/timeout** — 4 exact-output tests
- **partial** — 3 boundary tests (5/10, 0/10, 10/10) + 5 throws (totalTests=0, overflow, negative inputs ×2, missing fields ×2)
- **invalid input** — unknown signalType, empty skillSlug, whitespace skillSlug
- **SIGNAL_WEIGHTS** — frozen, D-16 values exact, no extra keys

## TDD Cycle Commits

| Phase | Commit | Message |
|-------|--------|---------|
| RED | a22873c | test(36-03): add failing tests for codingSignalService |
| GREEN | b5efb88 | feat(36-03): implement codingSignalService.ts |
| REFACTOR | — | Skipped — GREEN implementation needed no cleanup |

## Health Stack at Close

- `npx prisma validate` → OK
- `npx prisma generate` → OK
- `npx tsc --noEmit` → clean
- `npx eslint src/lib/codingSignalService.ts src/lib/__tests__/codingSignalService.test.ts` → clean
- `npm run test` → 541 passed | 4 skipped (59 files)

## Deviations from Plan

**[Scope boundary]** `npm run lint` (full repo) reports 566 pre-existing errors + 2791 warnings across unrelated files (e.g. `src/lib/inviteHelper.ts` prefer-const). New files in this plan contribute zero lint errors — verified by running eslint scoped to Plan 03 files only. Pre-existing repo lint issues are out of scope per executor rules.

## Self-Check: PASSED

- FOUND: src/lib/codingSignalService.ts (99 lines)
- FOUND: src/lib/__tests__/codingSignalService.test.ts (176 lines, 17 tests)
- FOUND: commits a22873c, b5efb88
- VERIFIED: No Prisma/DB imports in service (pure function)
- VERIFIED: Object.freeze present on SIGNAL_WEIGHTS

## Handoff

Phase 41 (GapScore integration): `mapSignalToScore(SignalInput): SignalOutput` signature is stable and ready. Consumer pattern:

```typescript
import { mapSignalToScore } from '@/lib/codingSignalService';
const { skillSlug, rawScore, weight } = mapSignalToScore(signalRow);
// Feed into existing 0.8-decay recency-weighted average in gapService.ts
```
