# Phase 34 — SkillRadar Quality + VIZ Scope Reconciliation

**Status:** Complete
**Completed:** 2026-04-17
**Branch:** `v1.3-gap-closure`
**Requirements closed:** VIZ-03, VIZ-06, VIZ-07

## Outcome

Closed three v1.3 audit gaps around the associate dashboard skill-trajectory story:

- **VIZ-03 (cut formalized):** DESIGN.md §Trajectory Language now states the SkillRadar Before/Now overlay is the canonical trajectory visual; per-skill line charts are intentionally out of scope.
- **VIZ-06 (reconciled):** Stale `SkillTrendChart` references in `AssociateDashboardClient.tsx:99` and `vizUtils.ts` docstring are removed; a new integration test locks the 2-component filter sync (SkillCardList ↔ SkillRadar).
- **VIZ-07 (new):** Real per-skill historical snapshots now drive the SkillRadar "Before" polygon. `GapScore` gained a nullable `prevWeightedScore Float?` column; `saveGapScores` captures each row's prior `weightedScore` inline with the upsert; the `SkillRadar` synthetic approximation code and its "Est. prior is approximated…" caption are deleted.

## Waves

| Wave | Plan | Status | Commits |
|------|------|--------|---------|
| 1 | 34-01 (schema + persistence) | Complete | 8f2b086, a851b88, b4d55f0, 12d7535 |
| 2 | 34-02 (radar rewrite + VIZ cleanup + tests) | Complete | 3eef556, afe18b5, 03a767c, 26e307a, e39f95f, 106f35e |

## Migration

- `prisma/migrations/20260418000000_add_gapscore_prev_score/migration.sql` — idempotent `ADD COLUMN IF NOT EXISTS "prevWeightedScore" DOUBLE PRECISION`. No backfill; existing rows stay NULL until their next upsert per D-10.

## Tests Added

| File | Count | Coverage |
|------|-------|----------|
| `src/lib/__tests__/gapPersistence.test.ts` | 5 | prevWeightedScore lifecycle, per-tuple independence, stale-row cleanup |
| `src/components/associate/__tests__/SkillRadar.test.tsx` | 4 | Prior polygon presence/absence, hasPrev flag, caption removal |
| `src/app/associate/[slug]/dashboard/__tests__/dashboard-filter-sync.test.tsx` | 2 | VIZ-06 SkillCardList ↔ SkillRadar selectedSkill sync |

**Total new tests:** 11, all passing. Existing `page.test.tsx` (5 tests) still passes — no regression.

## Follow-ups

- **Smoke on staging:** First load post-Plan-01 will show Now-only radar until each associate records a new session; subsequent sessions populate `prevWeightedScore` and the Prior polygon appears.
- **No prod migration in this phase:** `prisma migrate deploy` against the remote DB is left for the normal deploy flow per execution brief.
