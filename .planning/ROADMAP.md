# Roadmap: Next Level Mock

## Milestones

- **v1.0 Readiness Loop MVP** -- Phases 1-7 (shipped 2026-04-14) | [Archive](milestones/v1.0-ROADMAP.md)
- **v1.1 Cohort Readiness System** -- Phases 8-15, 22 plans, 14 reqs (shipped 2026-04-14) | [Archive](milestones/v1.1-ROADMAP.md)
- **v1.2 Analytics & Auth Overhaul** -- Phases 16-25, 26 plans, 30 reqs (shipped 2026-04-16) | [Archive](milestones/v1.2-ROADMAP.md)
- **v1.3 UX Unification & Polish** -- Phases 26-31 (in progress)

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

### v1.3 UX Unification & Polish (In Progress)

**Milestone Goal:** Unify all surfaces to the two-level shell, enrich associate experience with curriculum visibility and richer data visualization, polish dark mode.

- [ ] **Phase 26: Design Tokens (Data-Viz)** - Add chart palette, typography, and trajectory-language conventions to DESIGN.md and globals.css
- [ ] **Phase 27: Unified App Shell** - Extend AppShell to serve associate role; remove PublicShell + AssociateNav
- [ ] **Phase 28: Sign-in Redesign** - Replace tabbed SignInTabs with stacked-button single page + first-login password upgrade
- [ ] **Phase 28.1: User Profile** - Profile model, profile page (avatar menu → settings), migrate first-login detection to Profile table (INSERTED)
- [ ] **Phase 29: Associate Data Visualization** - Skill bars with trend arrows, focus area hero, per-skill trend chart, radar plot, dashboard skill filter
- [ ] **Phase 30: Associate Curriculum View** - Read-only cohort curriculum schedule with current-week highlight and empty state
- [ ] **Phase 31: Dark Mode QA Sweep** - Fix all hardcoded hex and light-only Tailwind classes across every surface

## Phase Details

### Phase 26: Design Tokens (Data-Viz)
**Goal**: Chart design language is defined so all chart components can be built with consistent tokens and dark mode support from day one
**Depends on**: Phase 25
**Requirements**: DESIGN-01, DESIGN-02
**Success Criteria** (what must be TRUE):
  1. DESIGN.md contains a Data Visualization section with chart palette, axis conventions, tooltip patterns, and trajectory language rules
  2. globals.css contains named CSS custom properties for chart colors with light and dark mode pairs
  3. A developer building a new recharts component can find the correct color token in globals.css without guessing
**Plans:** 1 plan

Plans:
- [ ] 26-01-PLAN.md — Add chart tokens to globals.css and Data Visualization section to DESIGN.md

### Phase 27: Unified App Shell
**Goal**: Associates access all pages through the same topbar+sidebar shell as trainers, with a role-restricted nav (Dashboard and Interviews only)
**Depends on**: Phase 26
**Requirements**: SHELL-01, SHELL-02, SHELL-03, SHELL-04
**Success Criteria** (what must be TRUE):
  1. Associate pages render with a topbar and sidebar matching the trainer shell layout
  2. Associate sidebar shows only Dashboard and Interviews nav items
  3. Associate sidebar header displays the associate's assigned cohort name (blank if unassigned)
  4. Associate can start an interview from within the shell; if no cohort/curriculum is assigned it behaves as public mock
  5. PublicShell and AssociateNav components are deleted and no routes reference them
**Plans**: TBD
**UI hint**: yes

### Phase 28: Sign-in Redesign
**Goal**: Users reach the sign-in page and see two stacked buttons with inline form expansion instead of tabs; associates who signed in via magic link are prompted to set a password on first login
**Depends on**: Phase 25
**Requirements**: SIGNIN-01, SIGNIN-02
**Success Criteria** (what must be TRUE):
  1. Sign-in page shows "Continue with email link" and "Sign in with password" as two stacked buttons with no tab UI
  2. Clicking either button expands an inline form without navigating away
  3. An associate who signs in via magic link for the first time sees a prompt to set a password before reaching their dashboard
  4. A trainer completing password sign-in is also prompted to set a new password on first login if none is set
**Plans**: TBD
**UI hint**: yes

### Phase 28.1: User Profile (INSERTED)
**Goal**: Profile model in Prisma with passwordSetAt, a profile page accessible from avatar menu (update password, display email/github/basic info), and migration of first-login detection from user_metadata to Profile table
**Depends on**: Phase 28
**Requirements**: PROFILE-01
**Success Criteria** (what must be TRUE):
  1. Profile model exists in Prisma schema with passwordSetAt, github, and display fields
  2. Avatar menu dropdown links to a profile/settings page
  3. Profile page allows updating password, viewing email, and entering github username
  4. First-login detection reads from Profile.passwordSetAt instead of Supabase user_metadata
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] TBD (run /gsd-plan-phase 28.1 to break down)

### Phase 29: Associate Data Visualization
**Goal**: Associates view a rich picture of their skill performance — ranked bars with trend direction, a prominent focus recommendation, a filterable session-over-session trend chart, and a radar plot of all cohort skills
**Depends on**: Phase 27
**Requirements**: VIZ-01, VIZ-02, VIZ-03, VIZ-04, VIZ-05, VIZ-06
**Success Criteria** (what must be TRUE):
  1. Associate dashboard displays a ranked skill list with score bars and up/down/flat trend arrows per skill
  2. A focus area hero card appears above the fold naming the single recommended skill and its trajectory context
  3. Trend language reads as "Improving +8 pts over 3 sessions" rather than raw numeric scores
  4. A per-skill trend chart renders with a skill filter dropdown; selecting a skill updates the chart to show that skill's history
  5. A radar/spider plot shows all cohort skills; labels are visually distinct only for skills with enough sessions to be assessment-ready
  6. Selecting a skill anywhere on the dashboard transitions all dashboard elements to focus on that skill
**Plans**: TBD
**UI hint**: yes

### Phase 30: Associate Curriculum View
**Goal**: Associates can see their cohort's curriculum schedule so they know what topics are coming and which week is current
**Depends on**: Phase 27
**Requirements**: CURRIC-01, CURRIC-02
**Success Criteria** (what must be TRUE):
  1. An associate assigned to a cohort can navigate to a curriculum view and see the full weekly schedule
  2. The current week is visually highlighted; past weeks appear greyed; future weeks appear muted
  3. An associate with no cohort assignment sees a clear empty state message ("You haven't been assigned to a cohort yet") with no errors
**Plans**: TBD
**UI hint**: yes

### Phase 31: Dark Mode QA Sweep
**Goal**: Every page and component in the application renders correctly under the dark mode theme with no hardcoded colors or light-only classes
**Depends on**: Phase 29, Phase 30
**Requirements**: DARK-01, DARK-02
**Success Criteria** (what must be TRUE):
  1. Switching to dark mode on any page produces no parchment-white backgrounds, no dark-on-dark text, and no invisible borders
  2. All recharts components (line charts, area charts, radar plots, sparklines) use CSS variable tokens for fills, strokes, and tooltip backgrounds in both themes
  3. No component file contains a hardcoded hex color or light-only Tailwind utility that bypasses the design token system
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:** 26 → 27 → 28 → 29 → 30 → 31

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 26. Design Tokens (Data-Viz) | v1.3 | 0/1 | Not started | - |
| 27. Unified App Shell | v1.3 | 0/? | Not started | - |
| 28. Sign-in Redesign | v1.3 | 0/? | Not started | - |
| 29. Associate Data Visualization | v1.3 | 0/? | Not started | - |
| 30. Associate Curriculum View | v1.3 | 0/? | Not started | - |
| 31. Dark Mode QA Sweep | v1.3 | 0/? | Not started | - |
