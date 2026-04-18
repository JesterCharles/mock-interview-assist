# Pipeline Status

## Current Run — v1.4 (PLAN COMPLETE)
- Started: 2026-04-18
- Current stage: PLAN complete ✓ — all 9 phases (36-44) planned, 28 plans total. Ready for EXECUTE.
- Mode: interactive (resume)
- Previous: v1.3 shipped + tagged 2026-04-18 (commit 42cd703, tag v1.3)
- Milestone: v1.4 — Coding Challenges + Multi-Language Sandbox (9 phases 36-44, 44 reqs, Approach B MSA-from-day-1)

### Plan summary per phase (commits)
| Phase | Plans | Commit | Notes |
|-------|-------|--------|-------|
| 36 Data Model & Schema | 3 | 550cb10 | Checker PASSED |
| 37 Challenge Bank | 3 | 05f5b6f | Needs `@@unique([challengeId, id])` on CodingTestCase (Phase 36 delta) |
| 38 Judge0 Infrastructure | 3 | e748aaf | SPIKE GATE (human-verify) blocks Phase 39 |
| 39 Execution API | 3 | e737a50 | Trainer submit = 403 in v1.4 (associateId non-null) |
| 40 UI MVP | 4 | 6069633 | UI-SPEC gate (`/gsd-ui-phase 40`) is first task |
| 41 GapScore Integration | 3 | 9842c4b | Depends on Phase 39 poll route |
| 42 SQL MVP (SQLite) | 2 | f524483 | SQLite Judge0 id verification blocking |
| 43 MSA Deployment | 4 | 0b763d4 | GCP creds + VM import checkpoint |
| 44 Hardening + Load Test | 3 | e366296 | /cso + codex adversarial gates |

### Discover complete (2026-04-18)
- Office hours + codex consult → Approach B selected (MSA-from-day-1)
- REQUIREMENTS.md: 44 reqs across 9 themes
- ROADMAP.md: phases 36-44 added
- PROJECT.md: updated for v1.4 active
- Discovery brief: `.planning/PIPELINE-DISCOVER.md`
- Seeds: `.planning/seeds/v1.4-discovery-seeds.md`

### Plan stage next:
- `/gsd-plan-phase 36` — Data Model & Schema (CodingChallenge/CodingAttempt/CodingTestCase/CodingSkillSignal + idempotent migration)
- Then sequential: 37 (Challenge Bank) → 38 (Judge0 spike GATE) → 39 (Submission API) → 40-44

## Stages (v1.4 — IN PROGRESS)
| Stage | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| discover | done | 2026-04-18 | 2026-04-18 | Office-hours + codex consult → Approach B MSA. PIPELINE-DISCOVER.md |
| init | done | 2026-04-18 | 2026-04-18 | Milestone initialized; REQUIREMENTS.md (44 reqs), ROADMAP expanded (P36-44), PROJECT.md updated |
| design | pending | | | Evaluate per-phase — UI surfaces likely in P41 (challenge UI) |
| plan | done | 2026-04-18 | 2026-04-18 | All 9 phases planned (36-44), 28 plans across 28 waves. Next: execute 36 first (blocks 37+). |
| execute | pending | | | Wave execution per phase after plan |
| review | pending | | | Codex review after execute |
| test | pending | | | Unit + Playwright after execute |
| ship | pending | | | PR + merge gate at milestone end |
| reflect | pending | | | Retro + seeds at milestone end |
| maintain | pending | | | Health check after ship |

## HITL Gates (v1.4)
| Gate | Stage | Type | Status | Decision |
|------|-------|------|--------|----------|
| Phase 38 Judge0 spike gate | plan→execute | sync | pending | Required before Phase 39 per codex consult |
| Design selection | design | sync | pending | P41 challenge UI only |
| Taste decisions | plan | async | pending | Per-phase |
| Review findings | review | async | pending | Per-phase |
| Merge approval | ship | sync | pending | No auto-merge |
| Milestone closure | ship | async | pending | |

## Artifacts (v1.4)
- .planning/PIPELINE-DISCOVER.md (2026-04-18)
- .planning/REQUIREMENTS.md (44 reqs)
- .planning/ROADMAP.md (phases 36-44 added)
- .planning/PROJECT.md (v1.4 active)
- .planning/seeds/v1.4-discovery-seeds.md

---

## v1.3 Gap Closure (P33-35) — shipped

Empty phase dirs → auto-discussed → planned → executed → reviewed → tested → PR #6 (merge deferred).

## v1.3 Milestone Scope

**Goal:** Unify all surfaces to the two-level shell, enrich associate experience with curriculum visibility and richer data visualization, polish dark mode.

**Phases:**
- Phase 26: Design Tokens (Data-Viz) — chart palette, typography, trajectory language in DESIGN.md + globals.css
- Phase 27: Unified App Shell — extend AppShell for associate role, remove PublicShell + AssociateNav
- Phase 28: Sign-in Redesign — stacked buttons, inline forms, first-login password upgrade
- Phase 29: Associate Data Visualization — skill bars, trend arrows, focus hero, radar plot, skill filter
- Phase 30: Associate Curriculum View — read-only schedule, current-week highlight, empty state
- Phase 31: Dark Mode QA Sweep — fix hardcoded hex/light-only classes across all surfaces

## Stages (v1.3 Gap Closure — P33-35)
| Stage | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| discover | skipped | | | Gap closure scoped from v1.3 milestone audit (`v1.3-MILESTONE-AUDIT.md`) |
| init | skipped | | | Existing codebase intel current |
| design | skipped | | | No new surfaces; reuses existing components |
| plan | done | 2026-04-17 | 2026-04-17 | 3/3 phases auto-discussed, 4 plans (P33×1, P34×2, P35×1). Artifact: PIPELINE-PLAN.md |
| execute | done | 2026-04-17 | 2026-04-17 | 19 commits across P33-35, +45 tests, all passing |
| review | done | 2026-04-17 | 2026-04-17 | Codex: 1 P1 + 2 P2 → all closed (PIPELINE-REVIEW.md + PIPELINE-REVIEW-FIX.md, 73415c3) |
| test | done | 2026-04-17 | 2026-04-17 | 524 passing / 4 skipped, build clean (PIPELINE-TEST.md) |
| ship | partial | 2026-04-17 | 2026-04-17 | PR #6 created, **merge deferred** per no-auto-merge policy |
| reflect | done | 2026-04-17 | 2026-04-17 | Retro + session notes + 3 seeds. Artifact: `.planning/PIPELINE-REFLECT-GAP.md`. 2 notes in `~/second-brain/projects/nlm/notes/` |
| maintain | done | 2026-04-17 | 2026-04-17 | Health 8.0/10 (flat). PIPELINE-MAINTAIN-GAP.md |

## Stages (v1.3 main run — SHIPPED)
| Stage | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| discover | done | 2026-04-16 | 2026-04-16 | Research + requirements + roadmap committed (ec44ea2) |
| init | skipped | | | Codebase intel from v1.2 still current |
| design | pending | | | UI-phase specs needed for P27-30 |
| plan | done | 2026-04-16 | 2026-04-16 | 7/7 phases discussed, 7/7 planned (9 plans total) |
| execute | done | 2026-04-17 | 2026-04-17 | 7/7 phases, 10/10 plans, 479 tests passing |
| review | done | 2026-04-17 | 2026-04-17 | 4 codex passes on PR #5; 1 P1 (demo cohort prefix) + 6 P2 (shell/radar/e2e) + 1 P3 all addressed. Final gate clean on approved scope. |
| test | done | 2026-04-17 | 2026-04-17 | 479 unit, 7 e2e passing, build clean |
| debug | skipped | | | No blocking failures |
| optimize | skipped | | | No numeric metric target this run |
| ship | done | 2026-04-17 | 2026-04-17 | PR #5 merged (c444f9e) on 2026-04-17. 17 commits on v1.3-ux-polish. |
| reflect | done | 2026-04-17 | 2026-04-17 | Retro + stats + session + 6 seeds archived. Artifact: `.planning/PIPELINE-REFLECT.md`. 5 notes in `~/second-brain/projects/nlm/notes/` |
| maintain | done | 2026-04-17 | 2026-04-17 | See PIPELINE-MAINTAIN.md — health 8/10, tests 479 pass, lint noise traced to vendored/generated paths, 6 stale test-results cleaned |

## HITL Gates (v1.3)
| Gate | Stage | Type | Status | Decision |
|------|-------|------|--------|----------|
| Design selection | design | sync | pending | |
| Taste decisions | plan | async | pending | |
| Review findings | review | async | pending | |
| Merge approval | ship | sync | pending | |
| Milestone closure | ship | async | pending | |

## Artifacts (v1.3)
- ROADMAP.md (ec44ea2)
- STATE.md (2026-04-16)
- .planning/research/ (eaa30ac)

---

## Previous Milestones

- **v1.2** — Shipped 2026-04-16. 10 phases (16-25), 30 reqs, 470 tests. Archive: `.planning/milestones/v1.2-*`
- **v1.1** — Shipped 2026-04-14 (PR #3). 8 phases (8-15), 22 reqs. Archive: `.planning/milestones/v1.1-*`
- **v1.0** — Shipped 2026-04-14. 7 phases (1-7). Archive: `.planning/milestones/v1.0-*`
