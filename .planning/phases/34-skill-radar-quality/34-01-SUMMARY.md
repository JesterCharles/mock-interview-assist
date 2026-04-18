# Phase 34 Plan 01 — Schema + Persistence Summary

**Wave:** 1
**Status:** Complete
**Date:** 2026-04-17
**Requirements:** VIZ-07

## What Was Built

1. **Schema change** — Added `prevWeightedScore Float?` nullable column to the `GapScore` model in `prisma/schema.prisma`. No index (column is only ever read alongside its parent row).

2. **Migration** — Created `prisma/migrations/20260418000000_add_gapscore_prev_score/migration.sql` with an idempotent `ADD COLUMN IF NOT EXISTS` ALTER TABLE. Existing rows stay `NULL` until their next upsert — no backfill (D-10).

3. **Persistence logic** — Rewrote `saveGapScores` in `src/lib/gapPersistence.ts` so the single `findMany({ where: { associateId } })` now supplies BOTH the prior-value lookup (keyed on `"${skill}::${topic}"`) AND the stale-row cleanup ids. Upsert count unchanged; first upserts for a new tuple leave `prevWeightedScore` null; subsequent upserts capture the row's previous `weightedScore` before overwriting.

4. **Tests** — Added `src/lib/__tests__/gapPersistence.test.ts` covering the three-state lifecycle (null → value → updated-value), per-tuple independence across multiple skills and topics, and preservation of stale-row cleanup. All 5 cases pass.

## Files Modified

- `prisma/schema.prisma`
- `prisma/migrations/20260418000000_add_gapscore_prev_score/migration.sql` (new)
- `src/lib/gapPersistence.ts`
- `src/lib/__tests__/gapPersistence.test.ts` (new)
- `src/generated/prisma/*` (regenerated via `prisma generate`)

## Commits

- `8f2b086` feat(schema): add GapScore.prevWeightedScore column for real trajectory snapshots
- `a851b88` feat(gap): capture prior weightedScore inline with upsert
- `b4d55f0` test(gap): cover prevWeightedScore lifecycle in saveGapScores

## Verification

| Check | Result |
|-------|--------|
| `npx prisma generate` | ✓ Client regenerated, `prevWeightedScore` in `index.d.ts` |
| `npx tsc --noEmit` | ✓ Passes |
| `npm run lint` (scoped to gapPersistence.ts) | ✓ No new issues |
| `npm run test -- src/lib/__tests__/gapPersistence.test.ts` | ✓ 5/5 pass |
| `grep "prevWeightedScore" prisma/schema.prisma` | ✓ Column present |
| `grep "ADD COLUMN IF NOT EXISTS \"prevWeightedScore\"" migration.sql` | ✓ Present |

## Handoff to Wave 2

- `GapScore.prevWeightedScore` is now written by `saveGapScores`. Existing rows are NULL; SkillRadar in Plan 02 must gracefully render "no history yet" until a new session completes for each associate.
- `GapScoreEntry` type in `src/lib/trainer-types.ts` has NOT been updated — that is Plan 02's Task 1.
- `src/app/associate/[slug]/dashboard/page.tsx` and `src/app/api/trainer/[slug]/route.ts` do NOT yet select/forward the new column — Plan 02's Task 1 handles the propagation.
