# Roadmap: Next Level Mock

## Milestones

- **v1.0 Readiness Loop MVP** -- Phases 1-7 (shipped 2026-04-14) | [Archive](milestones/v1.0-ROADMAP.md)
- **v1.1 Cohort Readiness System** -- Phases 8-14 (in progress)

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

<details open>
<summary>v1.1 Cohort Readiness System (Phases 8-14) -- IN PROGRESS</summary>

- [ ] **Phase 8: Schema Migration** - Add Cohort, CurriculumWeek (with skillSlug + unique(cohortId, weekNumber)) models and nullable FKs to Associate + Session + Session.readinessRecomputeStatus
- [ ] **Phase 9: Associate PIN Auth** - Trainer-generated PIN validates associate identity; dedicated ASSOCIATE_SESSION_SECRET; cookie version tied to pinGeneratedAt; adds authenticated /associate/[slug]/interview entry route
- [ ] **Phase 10: Automated Interview Pipeline** - Split endpoints (public strips identity / authenticated cookie-only); DB-backed readiness recompute marker + sweep endpoint
- [ ] **Phase 11: Cohort Management** - Trainer can create cohorts and assign associates via dashboard
- [ ] **Phase 12: Cohort Dashboard Views** - Trainer can filter roster by cohort + opt-in summary (default /api/trainer response shape preserved)
- [ ] **Phase 13: Curriculum Schedule** - Trainer defines curriculum weeks with canonical skillSlug; setup wizard exact-match filters to taught slugs
- [ ] **Phase 14: Design Cohesion** - NEW v1.1 UIs styled per DESIGN.md; legacy utilities preserved for /, /interview, /review

</details>

## Phase Details

### Phase 8: Schema Migration
**Goal**: The database has the tables and nullable foreign keys that all v1.1 features depend on, with no impact to existing data or live flows
**Depends on**: Nothing (first phase of v1.1 — additive migrations only)
**Requirements**: None (enabling foundation — no user-facing requirements map here; enables AUTH-01–03, COHORT-01–02, CURRIC-01, PIPE-02)
**Success Criteria** (what must be TRUE):
  1. `prisma migrate deploy` runs cleanly in CI and Docker without errors
  2. Existing trainer-led sessions persist to DB without change — `/api/sync-check` shows no new divergence after migration
  3. `Associate.cohortId` is nullable — existing associates (cohortId = null) are visible in `/trainer` roster unchanged
  4. `Session.mode` defaults to `"trainer-led"` on all existing rows — no null values in mode column
  5. `Session.readinessRecomputeStatus` defaults to `"not_applicable"` on all existing rows (Codex finding #5 — supports readiness sweep)
  6. `CurriculumWeek` has `skillSlug` column and DB-enforced `@@unique([cohortId, weekNumber])` (Codex finding #9)
**Plans**: 2 plans
- [x] 08-01-PLAN.md — Prisma schema additions (Cohort, CurriculumWeek with skillSlug + unique, FK columns, Session.mode, Session.readinessRecomputeStatus) + migration SQL with backfills
- [ ] 08-02-PLAN.md — Apply migration, verify success criteria, wire prisma migrate deploy into Dockerfile

---

### Phase 9: Associate PIN Auth
**Goal**: Associates can enter a trainer-assigned PIN to identify themselves before an authenticated automated interview, with trainer and associate auth fully separated, revocable, and decoupled from APP_PASSWORD
**Depends on**: Phase 8
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. Trainer can generate a 6-digit PIN from the trainer dashboard — PIN is displayed once, stored hashed, and pinGeneratedAt is advanced (which revokes any prior session cookie via version check)
  2. Associate enters a valid PIN at /associate/login and the system creates an `associate_session` HttpOnly cookie signed with dedicated `ASSOCIATE_SESSION_SECRET` (not APP_PASSWORD) and embedding pinGeneratedAt as the token version (Codex finding #4)
  3. Entering an invalid PIN shows an error and does not create a session
  4. An associate session cookie does not grant access to `/trainer` routes — redirects to /login
  5. Trainer session cookie continues to work unchanged
  6. `/associate/[slug]` requires auth — matching associate (fresh ver) OR trainer grants access; mismatch → 403; stale ver → redirect to login
  7. NEW authenticated automated-interview entry `/associate/[slug]/interview` exists and enforces the same identity matrix — this is the explicit entry Phase 10 consumes (Codex finding #2)
**Plans**: 3 plans
- [x] 09-01-PLAN.md — Schema fields + pinService + PIN generate/verify/logout endpoints (dedicated ASSOCIATE_SESSION_SECRET + pinGeneratedAt-as-version)
- [x] 09-02-PLAN.md — Identity enum helpers (cookie-only) + middleware refactor + version-checking associate helpers
- [ ] 09-03-PLAN.md — PIN entry UI + /associate/[slug] guard + NEW /associate/[slug]/interview authenticated entry + trainer Generate-PIN control
**UI hint**: yes

---

### Phase 10: Automated Interview Pipeline
**Goal**: Authenticated associate automated-interview completions trigger gap/readiness pipeline; anonymous completions cannot forge associate linkage; failed recomputes are repairable
**Depends on**: Phase 9
**Requirements**: PIPE-01, PIPE-02
**Success Criteria** (what must be TRUE):
  1. After an authenticated associate completes an automated interview (via NEW `/api/associate/interview/complete`), their Session has non-null associateId matching cookie identity
  2. Gap scores recompute after completion
  3. Associate.readinessStatus updates after completion using same threshold logic
  4. Anonymous users can still complete via `/api/public/interview/complete` — route UNCONDITIONALLY strips client-supplied associateSlug so forged identity cannot link to real associates (Codex finding #3)
  5. Session.readinessRecomputeStatus transitions pending→done on success; failed recomputes are repairable via `/api/admin/readiness-sweep` (Codex finding #5)
**Plans**: 3 plans
- [ ] 10-01-PLAN.md — Hardened public/complete (strip identity) + NEW /api/associate/interview/complete + shared runReadinessPipeline with DB marker
- [ ] 10-02-PLAN.md — Integration tests (authenticated + anonymous + spoofing), sync-check parity, human verification
- [ ] 10-03-PLAN.md — /api/admin/readiness-sweep endpoint + runReadinessSweep helper (Codex finding #5 repair path)

---

### Phase 11: Cohort Management
**Goal**: Trainers can create and manage cohorts and assign associates to them via the trainer dashboard, without disrupting existing associate data
**Depends on**: Phase 8
**Requirements**: COHORT-01, COHORT-02
**Success Criteria** (what must be TRUE):
  1. Trainer can create a cohort with name, start date, end date, and description
  2. Trainer can edit/delete cohorts
  3. Trainer can assign an associate to a cohort
  4. Associates with no cohort remain fully functional
  5. Trainer-led session for no-cohort associate persists without divergence
**Plans**: 3 plans
- [ ] 11-01-PLAN.md — /api/cohorts CRUD routes with zod validation + non-cascading delete
- [ ] 11-02-PLAN.md — Trainer /trainer/cohorts UI for cohort CRUD
- [ ] 11-03-PLAN.md — Associate cohort assignment via PATCH /api/trainer/[slug] + dropdown
**UI hint**: yes

---

### Phase 12: Cohort Dashboard Views
**Goal**: Trainers can filter the associate roster by cohort and see an aggregate readiness summary — while /api/trainer's default response shape remains BACKWARD COMPATIBLE with v1.0 consumers
**Depends on**: Phases 8 and 11
**Requirements**: COHORT-03, COHORT-04
**Success Criteria** (what must be TRUE):
  1. Trainer dashboard roster page has a cohort dropdown — filters the roster to only associates in that cohort
  2. Selecting "All Associates" restores the full roster
  3. When a cohort is selected, a summary bar shows count of ready/improving/not_ready for that cohort
  4. Associates with no cohort remain visible under "All Associates"
  5. Default GET /api/trainer (no query params) returns RosterAssociate[] — UNCHANGED v1.0 shape. Wrapped `{associates, summary}` shape is OPT-IN via `?includeSummary=true` (Codex finding #1)
**Plans**: 2 plans
- [ ] 12-01-PLAN.md — Extend /api/trainer with OPTIONAL cohortId filter + OPTIONAL includeSummary wrapper (default shape preserved)
- [ ] 12-02-PLAN.md — Trainer roster UI: cohort dropdown + summary bar (opt-in consumer of wrapped shape)
**UI hint**: yes

---

### Phase 13: Curriculum Schedule
**Goal**: Trainers can define a weekly curriculum schedule per cohort, and the interview setup wizard auto-filters available questions to taught skills via canonical skillSlug exact match
**Depends on**: Phases 8 and 11
**Requirements**: CURRIC-01, CURRIC-02
**Success Criteria** (what must be TRUE):
  1. Trainer can add, edit, and delete curriculum weeks — each has week number, skillName (display), skillSlug (canonical), topic tags, start date (Codex finding #9)
  2. For an associate in a cohort with a curriculum, the wizard pre-populates selected skills with only the taught weeks (where startDate <= today) matched by exact skillSlug (Codex finding #9)
  3. Wizard load time with curriculum active is a TARGET of <400ms, NOT a release gate. The real bottleneck is recursive GitHub question-bank discovery; a cached manifest is the future fix (Codex finding #7).
  4. If cohort has no curriculum or associate has no cohort, wizard behaves identically to v1.0
  5. Adaptive gap-based weight pre-population composes on top of curriculum filter
**Plans**: 3 plans
- [ ] 13-01-PLAN.md — Curriculum CRUD API + service layer with skillSlug validation + 409 on unique violation
- [ ] 13-02-PLAN.md — Trainer curriculum UI
- [ ] 13-03-PLAN.md — Setup wizard filter integration (exact skillSlug match) + Playwright advisory perf test (<2000ms ceiling, <400ms logged not gated)
**UI hint**: yes

---

### Phase 14: Design Cohesion
**Goal**: NEW v1.1 public/associate/cohort/curriculum UIs styled per DESIGN.md tokens — while LEGACY utilities are preserved so /, /interview, /review remain visually untouched
**Depends on**: Phases 9, 11, 12, 13
**Requirements**: DESIGN-01, DESIGN-02
**Success Criteria** (what must be TRUE):
  1. NEW routes (PIN entry, /associate/[slug], /associate/[slug]/interview, trainer login) use warm parchment bg + Clash Display + DM Sans + flat burnt orange accent
  2. Cohort management UI and curriculum schedule UI use DESIGN.md tokens from initial build
  3. Legacy pages /, /interview, /review are visually UNCHANGED — legacy utilities (.nlm-bg, .glass-card, .gradient-text, glow classes, motion keyframes) REMAIN in globals.css (Codex finding #8)
  4. DESIGN.md tokens ADDED alongside --nlm-* tokens; new button classes (.btn-accent-flat, .btn-secondary-flat) added without overwriting legacy .btn-primary / .btn-accent
**Plans**: 2 plans
- [ ] 14-01-PLAN.md — Additive token/font loading + PublicShell + ReadinessSignal + restyle NEW public routes (legacy preserved)
- [ ] 14-02-PLAN.md — Cohort + curriculum UI components on DESIGN.md tokens
**UI hint**: yes

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. DB Foundation | v1.0 | 2/2 | Complete | 2026-04-13 |
| 2. Session Persistence | v1.0 | 2/2 | Complete | 2026-04-13 |
| 3. Associate Profiles | v1.0 | 2/2 | Complete | 2026-04-13 |
| 4. Gap Service | v1.0 | 3/3 | Complete | 2026-04-14 |
| 5. Readiness Signals | v1.0 | 2/2 | Complete | 2026-04-14 |
| 6. Trainer Dashboard | v1.0 | 2/2 | Complete | 2026-04-14 |
| 7. Adaptive Setup | v1.0 | 2/2 | Complete | 2026-04-14 |
| 8. Schema Migration | v1.1 | 0/2 | Planned | - |
| 9. Associate PIN Auth | v1.1 | 0/3 | Planned | - |
| 10. Automated Interview Pipeline | v1.1 | 0/3 | Planned | - |
| 11. Cohort Management | v1.1 | 0/3 | Planned | - |
| 12. Cohort Dashboard Views | v1.1 | 0/2 | Planned | - |
| 13. Curriculum Schedule | v1.1 | 0/3 | Planned | - |
| 14. Design Cohesion | v1.1 | 0/2 | Planned | - |
