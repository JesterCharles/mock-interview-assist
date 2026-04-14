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

- [ ] **Phase 8: Schema Migration** - Add Cohort, CurriculumWeek models and nullable FKs to Associate + Session
- [ ] **Phase 9: Associate PIN Auth** - Trainer-generated PIN validates associate identity for automated interviews
- [ ] **Phase 10: Automated Interview Pipeline** - Authenticated automated sessions trigger gap scoring and readiness updates
- [ ] **Phase 11: Cohort Management** - Trainer can create cohorts and assign associates via dashboard
- [ ] **Phase 12: Cohort Dashboard Views** - Trainer can filter roster by cohort and view aggregate readiness summary
- [ ] **Phase 13: Curriculum Schedule** - Trainer defines curriculum weeks; setup wizard auto-filters to taught skills
- [ ] **Phase 14: Design Cohesion** - Public interview flow, auth pages, and new UIs styled per DESIGN.md

</details>

## Phase Details

### Phase 8: Schema Migration
**Goal**: The database has the tables and nullable foreign keys that all v1.1 features depend on, with no impact to existing data or live flows
**Depends on**: Nothing (first phase of v1.1 — additive migrations only)
**Requirements**: None (enabling foundation — no user-facing requirements map here; enables AUTH-01–03, COHORT-01–02, CURRIC-01)
**Success Criteria** (what must be TRUE):
  1. `prisma migrate deploy` runs cleanly in CI and Docker without errors
  2. Existing trainer-led sessions persist to DB without change — `/api/sync-check` shows no new divergence after migration
  3. `Associate.cohortId` is nullable — existing associates (cohortId = null) are visible in `/trainer` roster unchanged
  4. `Session.mode` defaults to `"trainer-led"` on all existing rows — no null values in mode column
**Plans**: TBD

---

### Phase 9: Associate PIN Auth
**Goal**: Associates can enter a trainer-assigned PIN to identify themselves before an automated interview, with trainer and associate auth fully separated in middleware
**Depends on**: Phase 8
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. Trainer can generate a 6-digit PIN from the trainer dashboard when adding an associate — PIN is displayed once and stored hashed
  2. Associate enters a valid PIN at the public interview entry point and the system creates an `associate_session` HttpOnly cookie linking to their identity
  3. Entering an invalid PIN shows an error and does not create a session
  4. An associate session cookie does not grant access to `/trainer` routes — navigating to `/trainer` while holding only an associate cookie returns 403 or redirects to trainer login
  5. Trainer session cookie continues to work unchanged — existing `/dashboard`, `/interview`, `/review`, `/trainer` routes unaffected
  6. `/associate/[slug]` requires auth — either matching associate session OR active trainer session grants access; mismatched associate slugs return 403; unauthenticated requests redirect to PIN entry
**Plans**: TBD
**UI hint**: yes

---

### Phase 10: Automated Interview Pipeline
**Goal**: Automated interview sessions completed by authenticated associates trigger gap score computation and readiness classification, feeding the same pipeline as trainer-led sessions
**Depends on**: Phase 9
**Requirements**: PIPE-01, PIPE-02
**Success Criteria** (what must be TRUE):
  1. After an authenticated associate completes an automated interview, their `Session` row in the DB has a non-null `associateId` matching their identity — no orphaned sessions
  2. Gap scores for the associate's skills are recomputed after session completion — `GapScore` rows reflect the new session
  3. `Associate.readinessStatus` is updated after session completion using the same threshold logic as trainer-led sessions
  4. Anonymous (non-PIN) users can still complete a public interview — the existing `/api/public/interview/complete` endpoint returns 200 without requiring auth
**Plans**: TBD

---

### Phase 11: Cohort Management
**Goal**: Trainers can create and manage cohorts and assign associates to them via the trainer dashboard, without disrupting existing associate data
**Depends on**: Phase 8
**Requirements**: COHORT-01, COHORT-02
**Success Criteria** (what must be TRUE):
  1. Trainer can create a cohort with name, start date, end date, and description — cohort appears in the trainer dashboard cohort list immediately
  2. Trainer can edit cohort name, dates, and description; trainer can delete a cohort
  3. Trainer can assign an associate to a cohort via the trainer dashboard — the associate's `cohortId` FK is updated
  4. Associates with no cohort assigned remain fully functional — their sessions persist, gap scores compute, and readiness updates without error
  5. A trainer-led session for an associate without a cohort persists to DB successfully — `/api/sync-check` shows no divergence
**Plans**: TBD
**UI hint**: yes

---

### Phase 12: Cohort Dashboard Views
**Goal**: Trainers can filter the associate roster by cohort and see an aggregate readiness summary for each cohort at a glance
**Depends on**: Phases 8 and 11
**Requirements**: COHORT-03, COHORT-04
**Success Criteria** (what must be TRUE):
  1. Trainer dashboard roster page has a cohort dropdown — selecting a cohort filters the roster to only associates in that cohort
  2. Selecting "All Associates" (default) restores the full roster — the existing unfiltered view is unchanged
  3. When a cohort is selected, a summary bar above the roster shows count of ready / improving / not_ready associates in that cohort
  4. Associates with no cohort remain visible under "All Associates" and are not lost from the roster
**Plans**: TBD
**UI hint**: yes

---

### Phase 13: Curriculum Schedule
**Goal**: Trainers can define a weekly curriculum schedule per cohort, and the interview setup wizard auto-filters available questions to skills that have been taught by today's date
**Depends on**: Phases 8 and 11
**Requirements**: CURRIC-01, CURRIC-02
**Success Criteria** (what must be TRUE):
  1. Trainer can add, edit, and delete curriculum weeks for a cohort — each week has a week number, skill name, topic tags, and start date
  2. For an associate in a cohort with a defined curriculum, the interview setup wizard pre-populates selected skills with only the taught weeks (where startDate <= today)
  3. The setup wizard loads in under 400ms when curriculum filter is active — curriculum fetch and GitHub question bank fetch run in parallel
  4. If a cohort has no curriculum defined, or the associate has no cohort, the setup wizard behaves identically to v1.0 — no regression
  5. Adaptive gap-based weight pre-population still applies on top of curriculum filtering — the two features compose correctly
**Plans**: TBD
**UI hint**: yes

---

### Phase 14: Design Cohesion
**Goal**: All pages in the public interview flow, associate auth pages, and new cohort/curriculum UIs are styled consistently with DESIGN.md tokens — no visual debt accumulates from v1.1 features
**Depends on**: Phases 9, 11, 12, 13
**Requirements**: DESIGN-01, DESIGN-02
**Success Criteria** (what must be TRUE):
  1. Public interview landing page, PIN entry page, and automated interview pages use warm parchment backgrounds, Clash Display headings, DM Sans body, and burnt orange accent — matching DESIGN.md tokens
  2. Associate profile page (`/associate/[slug]`) is styled with DESIGN.md tokens
  3. Cohort management UI and curriculum schedule UI use DESIGN.md tokens from initial build — no visual inconsistency with the trainer dashboard
  4. Existing interview flow pages (`/interview`, `/review`) are visually unchanged — design pass does not introduce regressions to mid-session pages
**Plans**: TBD
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
| 8. Schema Migration | v1.1 | 0/? | Not started | - |
| 9. Associate PIN Auth | v1.1 | 0/? | Not started | - |
| 10. Automated Interview Pipeline | v1.1 | 0/? | Not started | - |
| 11. Cohort Management | v1.1 | 0/? | Not started | - |
| 12. Cohort Dashboard Views | v1.1 | 0/? | Not started | - |
| 13. Curriculum Schedule | v1.1 | 0/? | Not started | - |
| 14. Design Cohesion | v1.1 | 0/? | Not started | - |
