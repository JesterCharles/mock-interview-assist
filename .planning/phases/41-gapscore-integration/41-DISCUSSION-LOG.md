# Phase 41: GapScore Integration — Discussion Log

> Audit trail only. Decisions captured in CONTEXT.md.

**Date:** 2026-04-18
**Mode:** `--auto`
**Areas:** Signal wiring, difficulty weight, dashboard panel, doc update, backfill

---

## Signal Wiring

| Option | Selected |
|--------|----------|
| Extend `gapPersistence.ts` with coding-aware function, feed same gapService | ✓ (recommended) |
| Build parallel coding-only GapScore table | Rejected — readiness math bifurcates |

## Difficulty Weighting

| Option | Selected |
|--------|----------|
| Multiplier: easy 0.7 / medium 1.0 / hard 1.3 | ✓ (recommended) |
| Flat weight regardless | Gameable |
| Full score bucketing | Overcomplicated |

## Dashboard Integration

| Option | Selected |
|--------|----------|
| New "Coding" tab/panel on `/trainer/[slug]` | ✓ (recommended — diagnoses source) |
| Merge with interview panel | Loses diagnostic clarity |

## Doc Update

| Option | Selected |
|--------|----------|
| PROJECT.md readiness-math + DESIGN.md dashboard section | ✓ (required by CODING-SCORE-04) |

## Backfill

| Option | Selected |
|--------|----------|
| No backfill v1.4 — note in PROJECT.md | ✓ (recommended — legacy data unreliable) |
| Best-effort import with manual trainer sign-off | v1.5+ |
