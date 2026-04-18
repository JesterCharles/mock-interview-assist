---
phase: 41-gapscore-integration
plan: 01
subsystem: gap-persistence
tags: [coding, gapscore, readiness, fire-and-forget]
requires: [phase-36, phase-39]
provides:
  - DIFFICULTY_MULTIPLIERS
  - persistCodingSignalToGapScore
  - coding→GapScore pipeline wired in poll helper
affects:
  - src/lib/gapPersistence.ts
  - src/lib/codingAttemptPoll.ts
tech-stack:
  added: []
  patterns: [fire-and-forget, transaction-wrapped-upsert]
key-files:
  created:
    - src/lib/__tests__/gapPersistence.coding.test.ts
  modified:
    - src/lib/gapPersistence.ts
    - src/lib/codingAttemptPoll.ts
    - src/lib/codingAttemptPoll.test.ts
decisions:
  - D-01/02/03 implemented verbatim (DIFFICULTY_MULTIPLIERS + topic format)
  - D-04 preserved — gapService.ts NOT modified
  - Task 3 wired at codingAttemptPoll.ts helper (not route.ts) —
    helper already owns the signal upsert; adding the GapScore call at
    the same resolution point is the natural integration. Plan text
    referenced route.ts but Phase 39 refactored the logic into the helper
    (commit 09d6af1) per Phase 39 SUMMARY — so the wiring lives with
    the signal-write it mirrors.
metrics:
  duration: ~15 min
  completed: 2026-04-18
requirements: [CODING-SCORE-01, CODING-SCORE-02]
---

# Phase 41 Plan 01: GapScore Integration Summary

Difficulty-weighted coding-signal to GapScore pipeline with fire-and-forget wiring from the Phase 39 poll helper.

## What Shipped

### `src/lib/gapPersistence.ts`
- **`DIFFICULTY_MULTIPLIERS: Record<'easy'|'medium'|'hard', number>`** — exactly `{ easy: 0.7, medium: 1.0, hard: 1.3 }` per Phase 41 D-02. Exported.
- **`persistCodingSignalToGapScore(signal, challenge, associateId)`** — transaction-wrapped findUnique + upsert on `GapScore` keyed on `(associateId, skill=signal.skillSlug, topic="coding:<language>")`. `weightedScore = mappedScore × DIFFICULTY_MULTIPLIERS[difficulty] × signal.weight`. Preserves the `prevWeightedScore` invariant using the same pattern as `saveGapScores` (prior captured inside the same tx). Throws on unknown difficulty (defense-in-depth against T-41-03).
- **`CodingSignalForGap` / `CodingChallengeForGap`** types exported for call-site ergonomics.

### `src/lib/codingAttemptPoll.ts`
- Added `associateId` + `challenge.difficulty` + `challenge.language` to the Prisma selects (both main attempt load and race-recovery re-fetch).
- Imported `persistCodingSignalToGapScore` and added a second fire-and-forget call right after the existing `codingSkillSignal.upsert` — `void persistCodingSignalToGapScore(...).catch(log)`. Guarded by `if (attempt.challenge)` so a malformed row cannot throw synchronously.

### Tests
- **`src/lib/__tests__/gapPersistence.coding.test.ts`** — 11 new Vitest cases:
  - Multiplier constants (exact values)
  - Weighted-score math for each difficulty
  - Topic format (`coding:<language>`)
  - Skill routing (`signal.skillSlug` → `GapScore.skill`)
  - `prevWeightedScore` preservation on update
  - First-insert `prevWeightedScore=null`, `sessionCount=1`
  - `sessionCount` increments on subsequent calls
  - Unknown-difficulty rejection
  - Farming-resistance (per-attempt hard > easy, ratio 130/70)
- **`src/lib/codingAttemptPoll.test.ts`** — 2 new Vitest cases:
  - Call-shape of `persistCodingSignalToGapScore` (signal + challenge + associateId)
  - Rejection swallowed — poll still resolves, error logged

## Verification

- `npm run test -- --run src/lib/__tests__/gapPersistence.coding.test.ts` → 11/11 ✓
- `npm run test -- --run src/lib/codingAttemptPoll.test.ts` → 29/29 ✓ (27 previous + 2 new)
- `npx tsc --noEmit` → zero NEW errors (pre-existing `coding-challenge-service.test.ts` TS errors unrelated to Phase 41)
- `git diff src/lib/gapService.ts` → empty (Phase 36 D-04 invariant preserved)

## Deviations from Plan

### Task 3 wiring location
- **Plan text:** Add fire-and-forget in `src/app/api/coding/attempts/[id]/route.ts`.
- **Actual:** Added in `src/lib/codingAttemptPoll.ts` alongside the existing signal upsert.
- **Rationale:** Phase 39 refactored verdict resolution + signal writeback into `codingAttemptPoll.ts` (commit `09d6af1` per Phase 39-02 SUMMARY). The route now delegates to the helper. Placing the GapScore call in the route would require re-reading the attempt row or duplicating the Phase 39 mapping logic. Putting it next to the signal upsert — where `mapped.skillSlug`, `signalType`, `mapped.weight`, `mapped.rawScore`, `attempt.challenge.*`, and `attempt.associateId` are already in scope — is the idiomatic integration. Rule 3 (blocking issue auto-fix): the route as shipped couldn't carry the wiring without regression.

No other deviations. D-01/02/03/04 implemented as written.

## Commits

- `d33fe7e` — feat(41-01): persistCodingSignalToGapScore + DIFFICULTY_MULTIPLIERS
- `f330f58` — feat(41-01): wire GapScore fire-and-forget from coding poll helper

## Known Stubs

None.

## Self-Check: PASSED

- `src/lib/gapPersistence.ts` — contains `DIFFICULTY_MULTIPLIERS` and `persistCodingSignalToGapScore` ✓
- `src/lib/__tests__/gapPersistence.coding.test.ts` — exists, 11 tests pass ✓
- `src/lib/codingAttemptPoll.ts` — contains `persistCodingSignalToGapScore` import + fire-and-forget call ✓
- `src/lib/gapService.ts` — unchanged ✓
- Commits `d33fe7e` and `f330f58` exist in `git log` ✓
