# Phase 34 Plan 02 — Radar Rewrite + VIZ Cleanup Summary

**Wave:** 2
**Status:** Complete
**Date:** 2026-04-17
**Requirements:** VIZ-03, VIZ-06, VIZ-07
**Depends on:** 34-01

## What Was Built

1. **Type propagation (Task 1)** — Extended `GapScoreEntry` in `src/lib/trainer-types.ts` with optional `prevWeightedScore?: number | null`. Dashboard server query (`src/app/associate/[slug]/dashboard/page.tsx`) now selects + forwards the column. Trainer detail API (`src/app/api/trainer/[slug]/route.ts`) forwards it in its GapScoreEntry mapping. Adaptive-setup gap-scores API intentionally untouched — it uses a separate response shape and does not feed the radar.

2. **SkillRadar rewrite (Task 2)** — Deleted all synthetic-prior helpers (clamp01, hashStr, axisDelta, baseDelta, associateSig, scoredSessionCount) and the "Est. prior is approximated…" italic caption. RadarDataPoint gains hasPrev: boolean. Derivation reads prevWeightedScore per axis: non-null → real snapshot (Math.round * 100), null → falls back to now but flags hasPrev: false. hasHistory is now data-driven — true iff any axis carries a real prior. Legend label "Est. prior" renamed to "Prior"; tooltip matches and gates per-axis via hasPrev. Unused sessions prop kept on signature (external contract) prefixed _sessions.

3. **VIZ-06 cleanup (Task 3)** — `AssociateDashboardClient.tsx` comment at line 99 now reads `{/* Left column: FocusHero → SkillCardList */}`. `src/lib/vizUtils.ts` docstring component list drops SkillTrendChart.

4. **DESIGN.md (Task 4)** — Appended radar-canonical sentence to §Trajectory Language. Decisions Log gains a 2026-04-17 row for VIZ-03 cut + real snapshot sourcing.

5. **SkillRadar tests (Task 5)** — 4 RTL cases asserting: Prior layer absent when all priors null, Prior layer + legend render when ≥1 real prior, hasPrev flags + before value match prevWeightedScore per axis, no "Est. prior is approximated" caption. Uses vi.mock('recharts') with stub primitives since JSDOM cannot compute SVG layout.

6. **Filter sync test (Task 6)** — 2 integration tests in `src/app/associate/[slug]/dashboard/__tests__/dashboard-filter-sync.test.tsx`: clicking a skill card mounts the All-skills chip, flips the card to its 2px accent border, and switches the radar title to topic mode; clicking the chip clears selectedSkill and reverts all three states.

## Commits

- 3eef556 feat(types): propagate prevWeightedScore through GapScoreEntry + data layers
- afe18b5 refactor(radar): render Before polygon from real prevWeightedScore snapshots
- 03a767c chore(viz): drop stale SkillTrendChart references (VIZ-06)
- 26e307a docs(design): declare SkillRadar as canonical trajectory visual (VIZ-03)
- e39f95f test(radar): cover Prior polygon presence/absence + hasPrev flag propagation
- 106f35e test(dashboard): lock VIZ-06 2-component filter sync

## Verification

| Check | Result |
|-------|--------|
| npx tsc --noEmit | Passes |
| npm run lint (scoped) | Only a _sessions unused-var warning, intentional per plan |
| grep SkillTrendChart on client + vizUtils | No matches |
| grep synthetic identifiers in SkillRadar | No matches |
| grep "Est. prior is approximated" in SkillRadar | No matches |
| grep "canonical trajectory" in DESIGN.md | Two matches (Trajectory Language + Decisions Log) |
| npm run test -- gapPersistence + SkillRadar + dashboard-filter-sync | 11/11 pass |
| npm run test -- page.test.tsx (existing) | 5/5 pass, no regression |
