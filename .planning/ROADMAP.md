# Roadmap: Next Level Mock

## Milestones

- **v1.0 Readiness Loop MVP** -- Phases 1-7 (shipped 2026-04-14) | [Archive](milestones/v1.0-ROADMAP.md)
- **v1.1 Cohort Readiness System** -- Phases 8-15, 22 plans, 14 reqs (shipped 2026-04-14) | [Archive](milestones/v1.1-ROADMAP.md)
- **v1.2 Analytics & Auth Overhaul** -- Phases 16-25, 26 plans, 30 reqs (shipped 2026-04-16) | [Archive](milestones/v1.2-ROADMAP.md)
- **v1.3 UX Unification & Polish** -- Phases 26-35, 18 plans, 27 reqs (shipped 2026-04-18) | [Archive](milestones/v1.3-ROADMAP.md)
- **v1.4** -- _Planning next milestone_ (use `/gsd-new-milestone`)

## Phases

<details>
<summary>v1.0 Readiness Loop MVP (Phases 1-7) -- SHIPPED 2026-04-14</summary>

- [x] Phase 1: DB Foundation (2/2 plans) -- completed 2026-04-13
- [x] Phase 2: Session Persistence (2/2 plans) -- completed 2026-04-13
- [x] Phase 3: Associate Profiles (2/2 plans) -- completed 2026-04-13
- [x] Phase 4: Gap Service (3/3 plans) -- completed 2026-04-14
- [x] Phase 5: Readiness Signals (2/2 plans) -- completed 2026-04-14
- [x] Phase 6: Trainer Dashboard (2/2 plans) -- completed 2026-04-14
- [x] Phase 7: Adaptive Setup (2/2 plans) -- completed 2026-04-14

</details>

<details>
<summary>v1.1 Cohort Readiness System (Phases 8-15) -- SHIPPED 2026-04-14</summary>

- [x] Phase 8: Schema Migration (2/2 plans) -- completed 2026-04-14
- [x] Phase 9: Associate PIN Auth (3/3 plans) -- completed 2026-04-14
- [x] Phase 10: Automated Interview Pipeline (3/3 plans) -- completed 2026-04-14
- [x] Phase 11: Cohort Management (3/3 plans) -- completed 2026-04-14
- [x] Phase 12: Cohort Dashboard Views (2/2 plans) -- completed 2026-04-14
- [x] Phase 13: Curriculum Schedule (3/3 plans) -- completed 2026-04-14
- [x] Phase 14: Design Cohesion (2/2 plans) -- completed 2026-04-14
- [x] Phase 15: Design Cohesion Sweep (4/4 plans) -- completed 2026-04-14

</details>

<details>
<summary>v1.2 Analytics & Auth Overhaul (Phases 16-25) -- SHIPPED 2026-04-16</summary>

- [x] Phase 16: Cached Question-Bank Manifest (1/1 plans) -- completed 2026-04-15
- [x] Phase 17: Schema Prep + Email Backfill (4/4 plans) -- completed 2026-04-15
- [x] Phase 18: Supabase Auth Install (4/4 plans) -- completed 2026-04-16
- [x] Phase 19: Bulk Invite (3/3 plans) -- completed 2026-04-16
- [x] Phase 20: Middleware Cutover + RLS (2/2 plans) -- completed 2026-04-16
- [x] Phase 21: App Shell Redesign (2/2 plans) -- completed 2026-04-16
- [x] Phase 22: Trainer Analytics (4/4 plans) -- completed 2026-04-16
- [x] Phase 23: Associate Self-Dashboard (2/2 plans) -- completed 2026-04-16
- [x] Phase 24: PDF Analytics Export (2/2 plans) -- completed 2026-04-16
- [x] Phase 25: PIN Removal + Cleanup (2/2 plans) -- completed 2026-04-16

</details>

<details>
<summary>v1.3 UX Unification & Polish (Phases 26-35) -- SHIPPED 2026-04-18</summary>

- [x] Phase 26: Design Tokens (Data-Viz) (1/1 plans) -- completed 2026-04-17
- [x] Phase 27: Unified App Shell (2/2 plans) -- completed 2026-04-17
- [x] Phase 28: Sign-in Redesign (1/1 plans) -- completed 2026-04-17
- [x] Phase 28.1: User Profile (INSERTED) (1/1 plans) -- completed 2026-04-17
- [x] Phase 29: Associate Data Visualization (3/3 plans) -- completed 2026-04-17
- [x] Phase 30: Associate Curriculum View (1/1 plans) -- completed 2026-04-17
- [x] Phase 31: Dark Mode QA Sweep (1/1 plans) -- completed 2026-04-17
- [x] Phase 32: Shell Architecture Overhaul (4/4 plans) -- completed 2026-04-17
- [x] Phase 33: Trainer First-Login Password Gate (1/1 plans) -- completed 2026-04-17
- [x] Phase 34: SkillRadar Quality + VIZ Reconciliation (2/2 plans) -- completed 2026-04-17
- [x] Phase 35: Shell Scope Reconciliation + Cleanup (1/1 plans) -- completed 2026-04-17

</details>

### v1.4 (Planning)

Next milestone not yet defined. Candidates from the backlog:

- **999.1 Staging / Prod Split** — Provision second Supabase project for staging; split `.env.local` from `.env`; route Docker deploy to prod only. Drivers: avoid seeding demo data into prod DB; enable safe schema/migration previews; unblock pre-merge CI smoke tests. Estimate: ~4-6h.
- **999.2 Trainer Default Cohort** — Persist each trainer's assigned/default cohort (add `Profile.defaultCohortId` or new `TrainerCohortAssignment`) so roster boots scoped to their cohort instead of "All Cohorts". Estimate: ~3h.
- **DEPLOY-01 / DEPLOY-02 / DEPLOY-03** — CI/CD pipeline, production Docker deploy automation, scheduled readiness-sweep cron (deferred since v1.2).

Kick off with `/gsd-new-milestone`.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-7. Readiness Loop MVP | v1.0 | 15/15 | Complete | 2026-04-14 |
| 8-15. Cohort Readiness | v1.1 | 22/22 | Complete | 2026-04-14 |
| 16-25. Analytics & Auth | v1.2 | 26/26 | Complete | 2026-04-16 |
| 26-35. UX Unification & Polish | v1.3 | 18/18 | Complete | 2026-04-18 |
| _next_ | v1.4 | — | Planning | — |

## Backlog

- **999.1 Staging / Prod Split** — Provision second Supabase project for staging, split `.env.local` (staging) from `.env` (prod), route Docker deploy to prod only, add staging deploy target. Drivers: avoid seeding demo data into prod DB; enable safe schema/migration previews; unblock pre-merge CI smoke tests. Estimate: 1 phase, ~4-6h.
- **999.2 Trainer Default Cohort** — Persist each trainer's assigned/default cohort so roster boots scoped to their cohort instead of "All Cohorts". Options: add `Profile.defaultCohortId` (reuse existing Profile model) or a new `TrainerCohortAssignment` join. UX: dropdown still lets user view others; default sticks. Drivers: trainers typically own one cohort; "All Cohorts" noise hides the roster that matters. Estimate: 1 small phase, ~3h.
- ~~**999.3 Per-Skill Historical Snapshots**~~ — Shipped as VIZ-07 in Phase 34 (v1.3).
- ~~**999.4 Shell Edge Cases**~~ — Shipped in PR #5. TopBar wordmark now only hides on desktop when `onToggleSidebar` is passed (AppShell/AssociateShell); bare-TopBar layouts keep it. `SectionSidebar` accepts `homeHref` (default `/trainer`, AssociateShell passes associate dashboard URL). Collapsed Settings icon calls `onExpandSidebar` before opening the accordion so it's visible.
