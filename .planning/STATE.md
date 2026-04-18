---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: Coding Challenges + Multi-Language Sandbox
status: planning
current_phase: 36
last_updated: "2026-04-18T18:00:00.000Z"
last_activity: 2026-04-18 -- v1.4 milestone initialized (REQUIREMENTS.md created, ROADMAP expanded, PROJECT.md updated)
progress:
  total_phases: 9
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# v1.4 — Coding Challenges + Multi-Language Sandbox (PLANNING)

## Current Position

Status: Planning — milestone initialized; ready for `/gsd-plan-phase 36`
Last activity: 2026-04-18 -- `/gsd-new-milestone v1.4` executed; discovery brief ingested from `.planning/PIPELINE-DISCOVER.md`

```
Progress: [--------------------] 0% (0/9 phases)
```

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-18 — v1.4 active)

**Core value:** Associates get consistent, feedback-rich practice reps that adapt to their weaknesses — replacing snapshot audits with continuous improvement trajectories. v1.4 extends this from mock interviews into coding challenges.

**Current focus:** Phase 36 — Data Model & Schema. Start with `/gsd-plan-phase 36` or `/pipeline-coordinator --resume`.

## Performance Metrics

- v1.0: 7 phases, 22 reqs, ~26h
- v1.1: 8 phases, 14 reqs, ~24h, 131 commits
- v1.2: 10 phases, 30 reqs, ~16h, 205 commits, 470 tests
- v1.3: 11 phases (incl. decimal 28.1), 27 reqs, ~2 days, 18 plans, 524 passing tests
- v1.4 (PLANNING): 9 phases (36-44), 44 reqs, 8-10 week estimate, ~21-28 plan estimate

## Accumulated Context

Inherited from v1.3 close:

- Supabase auth is sole identity mechanism (PIN removed in v1.2 Phase 25)
- Prisma `Profile` model introduced in v1.3 Phase 28.1 (keyed on `authUserId`, no Associate FK) — lazy backfill pattern
- `GapScore.prevWeightedScore` captured inline on upsert (nullable, no backfill)
- Unified two-level AppShell powers all roles; sidebar is primary nav, TopBar is utility-only
- Chart tokens + DESIGN.md Data Visualization section define canonical recharts style
- Backlog items 999.1 (staging/prod split) and 999.2 (trainer default cohort) deferred to v1.5 — NOT in v1.4 scope
- DEPLOY-01/02/03 absorbed into v1.4 Phase 43 (IAC-NN) as part of MSA-from-day-1 approach

New for v1.4:

- Discovery brief at `.planning/PIPELINE-DISCOVER.md` (2026-04-18) — office-hours + codex consult
- Approved approach: B (MSA-from-day-1)
- Requirements: `.planning/REQUIREMENTS.md` (44 reqs across 9 themes, traceability mapped)
- Seeds for v1.5+: `.planning/seeds/v1.4-discovery-seeds.md`

## Decisions

Full log in PROJECT.md Key Decisions table. v1.4 decisions logged at milestone init:

- Separate `CodingChallenge`/`CodingAttempt`/`CodingTestCase`/`CodingSkillSignal` models (not merged into Session) — readiness math stays explainable
- Private GitHub repo for hidden tests (prevents DevTools leak via /api/github)
- Stdin/stdout matching sufficient for v1.4 pedagogy
- SQLite only for v1.4 SQL (real Postgres SQL = v1.5 hardened service)
- Judge0 async submit + poll only, no `wait=true`
- Judge0 pinned to ≥ 1.13.1 (GHSA-q7vg-26pg-v5hr)
- MSA-from-day-1 (Approach B) chosen over mono-service
- Phase 38 Judge0 spike gate required before Phase 39

## Roadmap Evolution

v1.4 added 9 phases (36-44). Phase 38 carries a spike gate (required by codex consult) before proceeding to Phase 39. Phases 43-44 fold in deferred DEPLOY-01/02/03 backlog as MSA-from-day-1 deploy work.

## Session Continuity

Last session: 2026-04-18T18:00:00.000Z (milestone init)
Resume with: `/gsd-plan-phase 36` (to begin Phase 36 planning) OR `/pipeline-coordinator --resume` (to let the coordinator sequence the plan stage)
