# Roadmap: Next Level Mock

## Milestones

- **v1.0 Readiness Loop MVP** -- Phases 1-7 (shipped 2026-04-14) | [Archive](milestones/v1.0-ROADMAP.md)
- **v1.1 Cohort Readiness System** -- Phases 8-15, 22 plans, 14 reqs (shipped 2026-04-14) | [Archive](milestones/v1.1-ROADMAP.md)
- **v1.2 Analytics & Auth Overhaul** -- Phases 16-25, 26 plans, 30 reqs (shipped 2026-04-16) | [Archive](milestones/v1.2-ROADMAP.md)
- **v1.3 UX Unification & Polish** -- Phases 26-35, 18 plans, 27 reqs (shipped 2026-04-18) | [Archive](milestones/v1.3-ROADMAP.md)
- **v1.4 Coding Challenges + Multi-Language Sandbox** -- Phases 36-44, 44 reqs (planning, initialized 2026-04-18)

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

### v1.4 Coding Challenges + Multi-Language Sandbox (Planning, Phases 36-44)

**Approach:** B — MSA-from-day-1 | **Estimate:** 8-10 weeks | **Requirements:** 44 | **Source:** `.planning/PIPELINE-DISCOVER.md`

Adds coding challenges as a continuous-practice rep type alongside mock interviews. Judge0-based multi-language sandbox (Python, JS/TS, Java, SQL-SQLite, C# Mono), GitHub-loaded challenge bank (public prompts, private hidden tests), and `CodingSkillSignal` mapping into the existing GapScore engine. MSA-from-day-1 deployment (dedicated Judge0 host + Terraform IaC + GitHub Actions CI/CD) folds in deferred DEPLOY-01/02/03 backlog as part of meaningful product work.

#### Phase 36: Data Model & Schema
**Goal**: Prisma models for coding challenges, attempts, test cases, and skill signals — plus idempotent migration and signal→GapScore mapping unit-tested
**Depends on**: v1.3 shipped
**Requirements**: CODING-MODEL-01..06
**Success**: `prisma migrate deploy` clean on existing DB; signal-to-GapScore pure function has unit tests covering all signal types; generated client exports new models
**Estimate**: ~1 week, 2-3 plans

**Plans:** 3 plans in 2 waves

Plans:
- [ ] 36-01-PLAN.md — Prisma schema: 4 coding models + back-relations (Wave 1)
- [ ] 36-02-PLAN.md — Hand-written idempotent migration + smoke test (Wave 2)
- [ ] 36-03-PLAN.md — codingSignalService + Vitest suite (Wave 2)

#### Phase 37: Challenge Bank Contract & Loader
**Goal**: Trainers author coding challenges in GitHub repos (public prompts + private hidden tests); app loader fetches, validates, caches
**Depends on**: Phase 36
**Requirements**: CODING-BANK-01..05
**Success**: Challenge authored in repo appears in app within 5 min; validation rejects malformed challenges; hidden tests never appear in public API responses
**Estimate**: ~1 week, 2-3 plans

**Plans:** 3 plans in 3 waves

Plans:
- [ ] 37-01-PLAN.md — Repo schema docs + Zod schemas + loader skeleton (Wave 1)
- [ ] 37-02-PLAN.md — Public/private fetch + ETag cache + idempotent DB sync (Wave 2)
- [ ] 37-03-PLAN.md — Trainer-only POST /api/coding/bank/refresh (Wave 3)

#### Phase 38: Judge0 Infrastructure (Local + Remote-Ready) — SPIKE GATE
**Goal**: Judge0 stack pinned, hardened, and env-driven so local-mono and remote-MSA deploys are identical code; resource sizing committed from real GCE spike
**Depends on**: Phase 36 (env wiring only)
**Requirements**: JUDGE-01..06
**Success**: 10 concurrent mixed-language submissions on actual GCE VM size complete without queue death; p50/p95 measured; resource caps committed to PROJECT.md before Phase 39
**Estimate**: ~1.5 weeks, 3 plans (includes spike)

#### Phase 39: Execution API (Server-Side)
**Goal**: Auth-gated async submit + poll endpoints with server-side hidden test injection, language allowlist, rate limits, and verdict normalization
**Depends on**: Phase 37 + Phase 38
**Requirements**: CODING-API-01..07
**Success**: End-to-end submit→verdict path works for all 5 languages; hidden test inputs never appear in client responses; rate limits enforced; Judge0 never exposed to browser
**Estimate**: ~1 week, 3 plans

**Plans:** 3 plans in 3 waves

Plans:
- [ ] 39-01-PLAN.md — Verdict normalizer + rate-limit scope + POST /api/coding/submit (Wave 1)
- [ ] 39-02-PLAN.md — codingAttemptPoll helper + GET /api/coding/attempts/[id] with Zod shield (Wave 2)
- [ ] 39-03-PLAN.md — codingApiErrors library + GET /api/coding/challenges (Wave 3)

#### Phase 40: UI MVP
**Goal**: Associates browse challenges, solve in Monaco editor, see verdicts clearly — integrated into existing AppShell
**Depends on**: Phase 39
**Requirements**: CODING-UI-01..05
**Success**: `/coding` list + `/coding/[id]` solve page functional for all 5 languages; queued/running/verdict states visible; dark mode compliant; passes design review
**Estimate**: ~1.5 weeks, 3-4 plans

#### Phase 41: GapScore Integration & Trainer Visibility
**Goal**: Coding attempts feed GapScore with difficulty-weighted signals; trainer dashboard shows continuous coding skill traceability across all 11 cohort weeks
**Depends on**: Phase 40
**Requirements**: CODING-SCORE-01..04
**Success**: Attempt verdict triggers GapScore recompute within 5 sec; trainer dashboard shows per-associate coding panel; readiness math documented in PROJECT.md + DESIGN.md
**Estimate**: ~1 week, 2-3 plans

#### Phase 42: SQL MVP (SQLite Only)
**Goal**: SQLite language wired as a Judge0 path with server-side schema + seed injection; trainer-facing dialect label explicit
**Depends on**: Phase 39 + Phase 40
**Requirements**: SQL-01..03
**Success**: Trainer-authored SQL challenge runs end-to-end with normalized row output; dialect label visible on challenge cards; Postgres SQL deferral documented
**Estimate**: ~0.5 week, 1-2 plans

#### Phase 43: MSA Deployment (Terraform + CI/CD)
**Goal**: Dedicated Judge0 GCE host provisioned via Terraform; GitHub Actions deploys app + Judge0 as separate workflows with health checks, rollback, monitoring
**Depends on**: Phase 38 + Phase 39
**Requirements**: IAC-01..05
**Success**: Tag-push deploys app and Judge0 independently; failed health checks auto-revert; queue-depth + latency metrics visible in Logs Explorer; runbook published
**Estimate**: ~1.5 weeks, 3-4 plans

#### Phase 44: Hardening + Load Test
**Goal**: Production-ready under 50-concurrent submission load; abuse-safe; security-reviewed; documented
**Depends on**: Phase 43
**Requirements**: HARD-01..04
**Success**: 50 concurrent submissions p95 ≤ 10 sec; malicious payloads contained; `/cso` + codex adversarial-review both pass; ARCHITECTURE.md + README quickstart published
**Estimate**: ~1 week, 2-3 plans

**Total v1.4 plan estimate:** ~21-28 plans across 9 phases.

#### Parked (not in v1.4 scope)

- **999.1 Staging / Prod Split** — Deferred to v1.5; adjacent to IAC-01..05 but scope creep for v1.4
- **999.2 Trainer Default Cohort** — Deferred to v1.5 / post-v1.4 polish
- **DEPLOY-01/02/03** — Absorbed into v1.4 Phase 43 (IAC-NN) as part of MSA-from-day-1 approach

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-7. Readiness Loop MVP | v1.0 | 15/15 | Complete | 2026-04-14 |
| 8-15. Cohort Readiness | v1.1 | 22/22 | Complete | 2026-04-14 |
| 16-25. Analytics & Auth | v1.2 | 26/26 | Complete | 2026-04-16 |
| 26-35. UX Unification & Polish | v1.3 | 18/18 | Complete | 2026-04-18 |
| 36-44. Coding Challenges + Multi-Lang Sandbox | v1.4 | 0/~25 | Planning | — |

## Backlog

- **999.1 Staging / Prod Split** — Provision second Supabase project for staging, split `.env.local` (staging) from `.env` (prod), route Docker deploy to prod only, add staging deploy target. Drivers: avoid seeding demo data into prod DB; enable safe schema/migration previews; unblock pre-merge CI smoke tests. Estimate: 1 phase, ~4-6h.
- **999.2 Trainer Default Cohort** — Persist each trainer's assigned/default cohort so roster boots scoped to their cohort instead of "All Cohorts". Options: add `Profile.defaultCohortId` (reuse existing Profile model) or a new `TrainerCohortAssignment` join. UX: dropdown still lets user view others; default sticks. Drivers: trainers typically own one cohort; "All Cohorts" noise hides the roster that matters. Estimate: 1 small phase, ~3h.
- ~~**999.3 Per-Skill Historical Snapshots**~~ — Shipped as VIZ-07 in Phase 34 (v1.3).
- ~~**999.4 Shell Edge Cases**~~ — Shipped in PR #5. TopBar wordmark now only hides on desktop when `onToggleSidebar` is passed (AppShell/AssociateShell); bare-TopBar layouts keep it. `SectionSidebar` accepts `homeHref` (default `/trainer`, AssociateShell passes associate dashboard URL). Collapsed Settings icon calls `onExpandSidebar` before opening the accordion so it's visible.
