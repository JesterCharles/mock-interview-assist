---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: UX Unification & Polish
status: roadmap_created
last_updated: "2026-04-16"
last_activity: 2026-04-16
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# v1.3 — UX Unification & Polish

## Current Position

Phase: Phase 26 (not started)
Plan: —
Status: Roadmap created, ready for planning
Last activity: 2026-04-16 — Roadmap written (6 phases, 18 requirements)

```
Progress: [                    ] 0% (0/6 phases)
```

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-16 — v1.3 started)

**Core value:** Associates get consistent, feedback-rich practice reps that adapt to their weaknesses — replacing snapshot audits with continuous improvement trajectories.
**Current focus:** Phase 26 — Design Tokens (Data-Viz)

## Performance Metrics

- v1.0: 7 phases, 22 reqs, ~26h
- v1.1: 8 phases, 14 reqs, ~24h, 131 commits
- v1.2: 10 phases, 30 reqs, ~16h, 205 commits, 470 tests
- v1.3: 6 phases, 18 reqs (in progress)

## Accumulated Context

- Supabase auth is sole identity mechanism (PIN removed Phase 25)
- Two-level shell (topbar+sidebar) exists for trainer; associate pages still use old PublicShell + AssociateNav layout
- Associate self-dashboard has basic gap trends + recommended area but numbers-only, no trajectory language
- Dark mode has inconsistencies — some pages stuck on parchment-light; GapTrendChart.tsx has hardcoded hex
- Sign-in currently uses tab split (trainer/associate) — needs unified stacked buttons (no tabs)
- Associates cannot see cohort curriculum assignment
- DESIGN.md has no data visualization section — chart tokens must exist before any new chart is built
- recharts 3.8.1 already ships AreaChart, Area, ReferenceLine — no new packages needed
- Phase 27 and Phase 28 are independent; can run in parallel if desired
- Phase 29 and Phase 30 both depend on Phase 27 (shell) but are independent of each other
- Phase 31 must be last — sweeps all surfaces built in Phases 26-30
- Shell refactor risk: default role prop to 'trainer' to prevent trainer layout regression
- Gap score history query: cap at last 20 sessions; validate query time post-Phase 29

## Decisions

| Decision | Rationale | Phase |
|----------|-----------|-------|
| AppShell role prop defaults to 'trainer' | Prevents trainer layout regression during shell refactor | Phase 27 |
| Cohort ID derived from auth session (never query params) | Prevents unauthorized curriculum data exposure | Phase 30 |
| Build chart components with CSS vars from day one | Avoids dark mode retrofit in Phase 31 | Phase 26+ |
| Cap gap history at 20 sessions for trend charts | Perf guard; materialize if >2s after Phase 29 | Phase 29 |

## Session Continuity

Last session: 2026-04-16 — roadmap created
Resume with: `/gsd-plan-phase 26`
