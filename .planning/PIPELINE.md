# Pipeline Status

## Current Run — v1.5 (PLAN done → EXECUTE next)
- Started: 2026-04-18
- Current stage: PLAN **done** 2026-04-18 → ready for EXECUTE (`/gsd-execute-phase 45` or `/pipeline-coordinator --resume`)
- **Plans:** 36 across 9 phases (45-53); all frontmatter + structure valid; Wave B (46 ∥ 50) parallelizable. Full summary at `.planning/PIPELINE-PLAN.md`.
- Mode: sync HITL (user-present, interactive approvals)
- Previous: v1.4 shipped 2026-04-18 (PR #7 squash-merged). v1.4 reflect + maintain **deferred** — will run at v1.5 ship
- **Chosen approach:** Approach C Hybrid — **Cloud Run + Supabase** migration from live v0.1 GCE (`nextlevelmock.com`). Judge0 deferred to v1.6. Staging + CI/CD + k6 load-test baseline are P0. 3-4 week estimate.
- Memory pointers: `memory/project_v15_direction.md` (new), `memory/project_deploy_decision_v14.md` (superseded by v15)
- Discovery brief: `.planning/PIPELINE-DISCOVER.md` (rewritten for v1.5; v1.4 brief archived at `.planning/milestones/v1.4-PIPELINE-DISCOVER.md`)
- Seeds: `.planning/seeds/v1.5-discovery-seeds.md` (9 seeds)
- **All discover blockers resolved 2026-04-18.** Finalized IDs:
  - GCP account: `aicogeng@gmail.com`, billing account `01A910-0C5083-DCCFED` ("My Billing Account", active)
  - GCP projects (both exist 2026-04-18): `nlm-prod` (clean ID), `nlm-staging-493715` (suffix added — `nlm-staging` was globally taken; accepting suffix)
  - Supabase staging project: `lzuqbpqmqlvzwebliptj` (ref from `https://lzuqbpqmqlvzwebliptj.supabase.co`)
  - Supabase prod project: existing (unchanged — will be wiped + seeded clean for real prod per env-hygiene decision)
  - DNS: Cloudflare Free Tier on `nextlevelmock.com`
- **Env hygiene decision (carry into plan as Phase 1):** Stop testing in the existing Supabase "prod" project (it's really a dev DB with dirty v1.0-v1.4 test data). Wipe it, reseed staging with dummy data, reserve prod Supabase for actual production deploy + real users. Local `.env` points at staging only from here forward.
- **Execute-phase remaining action:** `gcloud auth login` already done. User still needs to wipe + reseed DB per plan Phase 1 when it runs.

### v1.5 Context Reframe (key finding)
nextlevelmock.com has been LIVE on v0.1 GCE serving public-interview users this whole time. v1.0-v1.4 code NEVER shipped to prod. v1.5 = migration + upgrade, not greenfield. Phase 43 terraform = reference for v1.6 Judge0, not v1.5 app infra.

## Previous Run — v1.4 (SHIPPED 2026-04-18)
- Milestone: v1.4 — Coding Challenges + Multi-Language Sandbox (9 phases 36-44, 44 reqs, Approach B MSA-from-day-1)
- Ship: PR #7 squash-merged; commit `e14be93`; tag v1.4
- Outcome: all 9 phases executed, reviewed, tested, merged
- Deferred stages: reflect + maintain (run before v1.5 ship or on dedicated pass)

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

## Stages (v1.5 — current)
| Stage | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| discover | **done** | 2026-04-18 | 2026-04-18 | Hybrid approach chosen (Cloud Run + Supabase). PIPELINE-DISCOVER.md + seeds + memory |
| init | **done** | 2026-04-18 | 2026-04-18 | PROJECT.md + STATE.md + REQUIREMENTS.md (47 reqs, 11 themes) + ROADMAP.md (9 phases 45-53). Commits 942007c + 3365f03 + f4bf08d |
| design | skipped | | | DevOps milestone, no UI surfaces |
| plan | **done** | 2026-04-18 | 2026-04-18 | All 9 phases planned, 36 plans total. Waves A-H defined (Wave B = 46 ∥ 50). `.planning/PIPELINE-PLAN.md` is the summary. Commit range 4354d7c…48aff11. Multi-lens review deferred to Phase 49 codex adversarial-review + Phase 53 retro |
| execute | pending | | | Next: `/gsd-execute-phase 45` or `/pipeline-coordinator --resume` |
| review | pending | | | |
| test | pending | | | Includes k6 load-test baseline (P0 deliverable) |
| ship | pending | | | PR + merge gate at milestone end. DNS cutover from v0.1 GCE |
| reflect | pending | | | Also covers v1.4 reflect (deferred) |
| maintain | pending | | | Also covers v1.4 maintain (deferred). v0.1 GCE decommission runbook |

## HITL Gates (v1.5)
| Gate | Stage | Type | Status | Decision |
|------|-------|------|--------|----------|
| Approach (PaaS / GCE / Hybrid) | discover | sync | **resolved 2026-04-18** | **Approach C Hybrid** — Cloud Run + Supabase. Not Fly/Railway, not Cloud SQL migration |
| Phase 43 terraform disposition | discover | sync | **resolved 2026-04-18** | Keep as reference for v1.6 Judge0; v1.5 writes new `iac/cloudrun/` |
| Judge0 hosted vs self-hosted | discover | sync | **deferred to v1.6** | v1.5 bakes integration points; actual choice at v1.6 kickoff |
| Supabase branching / DNS / GCP project | init | sync | **resolved 2026-04-18** | All three IDs finalized pre-init (GCP projects exist, Supabase staging ref recorded, Cloudflare on DNS) |
| Milestone scope closure | init | sync | **resolved 2026-04-18** | v1.5 approach + requirements + 9-phase roadmap confirmed by user at `/gsd-new-milestone v1.5` |
| Staging cutover to prod | ship | sync | pending | DNS swap day 15-21 per sunset plan |
| v0.1 GCE decommission | maintain | sync | pending | Day 45 if no rollback |
| Merge approval | ship | sync | pending | No auto-merge |

## Stages (v1.4 — SHIPPED 2026-04-18)
| Stage | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| discover | done | 2026-04-18 | 2026-04-18 | Office-hours + codex consult → Approach B MSA. PIPELINE-DISCOVER.md |
| init | done | 2026-04-18 | 2026-04-18 | Milestone initialized; REQUIREMENTS.md (44 reqs), ROADMAP expanded (P36-44), PROJECT.md updated |
| design | skipped | | | Per-phase handled (P40 UI MVP had UI-SPEC) |
| plan | done | 2026-04-18 | 2026-04-18 | All 9 phases planned (36-44), 28 plans across 28 waves |
| execute | done | 2026-04-18 | 2026-04-18 | All 9 phases shipped after spike gate passed. PR #7 (`e14be93`) |
| review | done | 2026-04-18 | 2026-04-18 | Codex passes closed; P37 1xP0+3xP2, P38 2xP2 fixed |
| test | done | 2026-04-18 | 2026-04-18 | Full suite 680 passing / 4 skipped |
| ship | done | 2026-04-18 | 2026-04-18 | PR #7 squash-merged; tag v1.4 |
| reflect | deferred | | | Rolls into v1.5 reflect pass |
| maintain | deferred | | | Rolls into v1.5 maintain pass |

## Session 1 outcome (2026-04-18 autonomous run)

| Phase | Result | Commits |
|-------|--------|---------|
| 36 | ✓ shipped + reviewed + validated | e7642ea, 4bb0ecd, a22873c, b5efb88, a7ffa9e, 21e26b4 |
| 37 | ✓ shipped + reviewed (1 P0 fixed) + validated | c2d4d66, d82ff7c, 4c1e42e, af1f18d, a65921b, 3d4462c, e3d77f0, bb89da2, 13dfc2a |
| 38 | ⚠️ code complete + reviewed (2 P2 fixed), **spike DEFERRED** | c6a3379, 1ebc69c, af2113d, e69ff96, ca8f14f, d20a5a3, 66fdc36, 7878bd4, 22e33de, 4295efa |
| 42 | ✗ halted gracefully (deps upstream) | 5a60ebc |
| (meta) | pipeline artifacts | ebde8a8 |

## Next human action

Run spike verification manually — see `.planning/phases/38-judge0-infrastructure/SPIKE-VERIFICATION.md`. Expected <30 min. After PASS, resume with `/pipeline-coordinator --resume --unattended --discuss` to execute P39-44.

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
