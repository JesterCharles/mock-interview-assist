# Roadmap: Next Level Mock

## Milestones

- **v1.0 Readiness Loop MVP** -- Phases 1-7 (shipped 2026-04-14) | [Archive](milestones/v1.0-ROADMAP.md)
- **v1.1 Cohort Readiness System** -- Phases 8-15, 22 plans, 14 reqs (shipped 2026-04-14) | [Archive](milestones/v1.1-ROADMAP.md)
- **v1.2 Analytics & Auth Overhaul** -- Phases 16-25, 26 plans, 30 reqs (shipped 2026-04-16) | [Archive](milestones/v1.2-ROADMAP.md)
- **v1.3 UX Unification & Polish** -- Phases 26-35 (in progress — gap closure Phases 33-35 added 2026-04-17 post-audit)

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

- [x] **Phase 26: Design Tokens (Data-Viz)** - Add chart palette, typography, and trajectory-language conventions to DESIGN.md and globals.css (completed 2026-04-17)
- [ ] **Phase 27: Unified App Shell** - Extend AppShell to serve associate role; remove PublicShell + AssociateNav
- [ ] **Phase 28: Sign-in Redesign** - Replace tabbed SignInTabs with stacked-button single page + first-login password upgrade
- [x] **Phase 28.1: User Profile** - Profile model, profile page (avatar menu → settings), migrate first-login detection to Profile table (INSERTED) (completed 2026-04-17)
- [x] **Phase 29: Associate Data Visualization** - Skill bars with trend arrows, focus area hero, per-skill trend chart, radar plot, dashboard skill filter (completed 2026-04-17)
- [x] **Phase 30: Associate Curriculum View** - Read-only cohort curriculum schedule with current-week highlight and empty state (completed 2026-04-17)
- [x] **Phase 31: Dark Mode QA Sweep** - Fix all hardcoded hex and light-only Tailwind classes across every surface (completed 2026-04-17)
- [x] **Phase 32: Shell Architecture Overhaul** - Sidebar-primary nav, TopBar utility-only, profile modal, landing header, roster cleanup, password security (completed 2026-04-17)
- [ ] **Phase 33: Trainer First-Login Password Gate** - Close SIGNIN-02: trainers redirected to /auth/set-password on first login (both password and magic-link paths)
- [ ] **Phase 34: SkillRadar Quality + VIZ Scope Reconciliation** - Cut VIZ-03, reword VIZ-06, introduce VIZ-07 (real historical snapshots replacing synthetic "Est. prior")
- [ ] **Phase 35: Shell Scope Reconciliation + Cleanup** - Associate Settings accordion wired; REQ SHELL-01 reconciled; deprecated code deleted

## Phase Details

### Phase 26: Design Tokens (Data-Viz)
**Goal**: Chart design language is defined so all chart components can be built with consistent tokens and dark mode support from day one
**Depends on**: Phase 25
**Requirements**: DESIGN-01, DESIGN-02
**Success Criteria** (what must be TRUE):
  1. DESIGN.md contains a Data Visualization section with chart palette, axis conventions, tooltip patterns, and trajectory language rules
  2. globals.css contains named CSS custom properties for chart colors with light and dark mode pairs
  3. A developer building a new recharts component can find the correct color token in globals.css without guessing
**Plans:** 1/1 plans complete

Plans:
- [x] 26-01-PLAN.md — Add chart tokens to globals.css and Data Visualization section to DESIGN.md

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
**Plans**: 2 plans

Plans:
- [ ] 27-01-PLAN.md — Extend shell components for associate role + wire associate layout
- [ ] 27-02-PLAN.md — Curriculum placeholder + delete legacy nav components
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
**Plans:** 1 plan

Plans:
- [ ] 28-01-PLAN.md — Accordion sign-in buttons + first-login password setup
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
**Plans:** 1/1 plans complete

Plans:
- [x] 28.1-01-PLAN.md — Profile model + tabbed profile page + password detection migration
**UI hint**: yes

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
**Plans**: 3 plans

Plans:
- [x] 29-01-PLAN.md — Tokens + vizUtils + SkillCardList + FocusHero
- [x] 29-02-PLAN.md — SkillTrendChart + SkillRadar
- [x] 29-03-PLAN.md — Dashboard 2-column layout + skill filter wiring + cleanup
**UI hint**: yes

### Phase 30: Associate Curriculum View
**Goal**: Associates can see their cohort's curriculum schedule so they know what topics are coming and which week is current
**Depends on**: Phase 27
**Requirements**: CURRIC-01, CURRIC-02
**Success Criteria** (what must be TRUE):
  1. An associate assigned to a cohort can navigate to a curriculum view and see the full weekly schedule
  2. The current week is visually highlighted; past weeks appear greyed; future weeks appear muted
  3. An associate with no cohort assignment sees a clear empty state message ("You haven't been assigned to a cohort yet") with no errors
**Plans:** 1/1 plans complete

Plans:
- [x] 30-01-PLAN.md — Curriculum schedule grid with score coloring, collapsible weeks, banner, and empty state
**UI hint**: yes

### Phase 31: Dark Mode QA Sweep
**Goal**: Every page and component in the application renders correctly under the dark mode theme with no hardcoded colors or light-only classes
**Depends on**: Phase 29, Phase 30
**Requirements**: DARK-01, DARK-02
**Success Criteria** (what must be TRUE):
  1. Switching to dark mode on any page produces no parchment-white backgrounds, no dark-on-dark text, and no invisible borders
  2. All recharts components (line charts, area charts, radar plots, sparklines) use CSS variable tokens for fills, strokes, and tooltip backgrounds in both themes
  3. No component file contains a hardcoded hex color or light-only Tailwind utility that bypasses the design token system
**Plans:** 1/1 plans complete

Plans:
- [x] 31-01-PLAN.md — Replace all hardcoded hex colors with CSS variable tokens and add badge-background tokens

### Phase 32: Shell Architecture Overhaul
**Goal:** Restructure AppShell with sidebar-primary navigation for all roles, strip TopBar to utility items only, add profile modal, landing page header, roster cleanup, and password security.
**Requirements**: SHELL-32-01, SHELL-32-02, SHELL-32-03, SHELL-32-04, SHELL-32-05, SHELL-32-06, SHELL-32-07, SHELL-32-08, SHELL-32-09
**Depends on:** Phase 31
**Plans:** 4/4 plans complete

Plans:
- [x] 32-01-PLAN.md — Sidebar Settings accordion + TopBar center nav removal + Batch Upload in sidebar
- [x] 32-02-PLAN.md — Profile modal from avatar menu + landing page minimal header + /profile redirect
- [x] 32-03-PLAN.md — Roster slug column removal + trainer detail reuses AssociateDashboardClient
- [x] 32-04-PLAN.md — Password change requires old password or email OTP verification

### Phase 33: Trainer First-Login Password Gate
**Goal**: Trainers signing in for the first time (via password or magic link) are redirected to `/auth/set-password` before reaching `/trainer`, matching the associate flow
**Depends on**: Phase 28, Phase 28.1
**Requirements**: SIGNIN-02
**Gap Closure**: Closes v1.3 audit gap — trainer first-login gate never wired
**Success Criteria** (what must be TRUE):
  1. Trainer completing password sign-in with `Profile.passwordSetAt == null` is redirected to `/auth/set-password` (not `/trainer`)
  2. Trainer completing magic-link sign-in with `passwordSetAt == null` is redirected to `/auth/set-password` (not `/trainer`)
  3. Trainer with existing `passwordSetAt` continues to route normally to `/trainer`
  4. Associate flow is unchanged
**Plans**: 1 plan (to draft)

### Phase 34: SkillRadar Quality + VIZ Scope Reconciliation
**Goal**: Cut VIZ-03 (per-skill LineChart redundant), reconcile VIZ-06 to match 2-component reality, and replace synthetic radar "Est. prior" polygon with real per-skill historical snapshots (VIZ-07)
**Depends on**: Phase 29
**Requirements**: VIZ-03 (cut), VIZ-06 (reconcile), VIZ-07 (new)
**Gap Closure**: Closes v1.3 audit gap — VIZ-03 regressed during Phase 29 remediation; VIZ-06 cascaded partial
**Success Criteria** (what must be TRUE):
  1. VIZ-03 scope cut is reflected in REQUIREMENTS.md and in DESIGN.md trajectory section (radar is canonical)
  2. Stale `SkillTrendChart` reference comment in `AssociateDashboardClient.tsx:99` is removed
  3. Per-skill historical gap scores are persisted at session completion (either `GapScore.prevWeightedScore` column or `GapScoreHistory` table)
  4. `SkillRadar` "Before" polygon is rendered from real persisted snapshots, not `0.85 * current` synthetic calculation
  5. The "Est. prior is approximated..." disclosure caption is removed
  6. Existing 2-component filter sync (SkillCardList + SkillRadar) continues to pass integration tests
**Plans**: 2 plans (to draft — schema+persistence, then radar integration)

### Phase 35: Shell Scope Reconciliation + Cleanup
**Goal**: Associate Settings accordion wired into `AssociateShell` via `associateSettingsAccordion` factory; deprecated code removed; stale nav artifacts deleted
**Depends on**: Phase 32
**Requirements**: SHELL-01 (reconciled — 3 items matches UI-SPEC D-04), SHELL-32-01 (associate side)
**Gap Closure**: Closes v1.3 audit gaps — orphaned `associateSettingsAccordion`; scope drift on SHELL-01 already reconciled in REQUIREMENTS.md
**Success Criteria** (what must be TRUE):
  1. `AssociateShell.tsx` passes `associateSettingsAccordion` to `SectionSidebar` with `onOpenProfile` / `onOpenSecurity` callbacks that open the `ProfileModal` on the correct tab
  2. Associates see a collapsible Settings bottom accordion matching the trainer pattern
  3. `@deprecated settingsSidebarGroups` export is removed from `sidebar-configs.ts` with no remaining imports
  4. All other existing behavior (trainer accordion, cohort header, nav groups) is unchanged
**Plans**: 1 plan (to draft)

## Progress

**Execution Order:** 26 → 27 → 28 → 28.1 → 29 → 30 → 31 → 32 → 33 → 34 → 35

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 26. Design Tokens (Data-Viz) | v1.3 | 1/1 | Complete    | 2026-04-17 |
| 27. Unified App Shell | v1.3 | 2/2 | Complete    | 2026-04-17 |
| 28. Sign-in Redesign | v1.3 | 1/1 | Complete    | 2026-04-17 |
| 28.1. User Profile | v1.3 | 1/1 | Complete    | 2026-04-17 |
| 29. Associate Data Visualization | v1.3 | 3/3 | Complete    | 2026-04-17 |
| 30. Associate Curriculum View | v1.3 | 1/1 | Complete    | 2026-04-17 |
| 31. Dark Mode QA Sweep | v1.3 | 1/1 | Complete    | 2026-04-17 |
| 32. Shell Architecture Overhaul | v1.3 | 4/4 | Complete    | 2026-04-17 |
| 33. Trainer First-Login Password Gate | v1.3 | 0/1 | Not started | - |
| 34. SkillRadar Quality + VIZ Reconciliation | v1.3 | 0/2 | Not started | - |
| 35. Shell Scope Reconciliation + Cleanup | v1.3 | 0/1 | Not started | - |

## Backlog

- **999.1 Staging / Prod Split** — Provision second Supabase project for staging, split `.env.local` (staging) from `.env` (prod), route Docker deploy to prod only, add staging deploy target. Drivers: avoid seeding demo data into prod DB; enable safe schema/migration previews; unblock pre-merge CI smoke tests. Estimate: 1 phase, ~4-6h.
- **999.2 Trainer Default Cohort** — Persist each trainer's assigned/default cohort so roster boots scoped to their cohort instead of "All Cohorts". Options: add `Profile.defaultCohortId` (reuse existing Profile model) or a new `TrainerCohortAssignment` join. UX: dropdown still lets user view others; default sticks. Drivers: trainers typically own one cohort; "All Cohorts" noise hides the roster that matters. Estimate: 1 small phase, ~3h.
- ~~**999.3 Per-Skill Historical Snapshots**~~ — Promoted to Phase 34 (v1.3 gap closure) as VIZ-07.
- ~~**999.4 Shell Edge Cases**~~ — Landed in PR #5. TopBar wordmark now only hides on desktop when `onToggleSidebar` is passed (AppShell/AssociateShell); bare-TopBar layouts keep it. `SectionSidebar` accepts `homeHref` (default `/trainer`, AssociateShell passes associate dashboard URL). Collapsed Settings icon calls `onExpandSidebar` before opening the accordion so it's visible.
