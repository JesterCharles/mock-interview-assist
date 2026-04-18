# Requirements: Next Level Mock

**Defined:** 2026-04-16
**Core Value:** Associates get consistent, feedback-rich practice reps that adapt to their weaknesses — replacing snapshot audits with continuous improvement trajectories that trainers and clients can trust.

## v1.3 Requirements

Requirements for UX Unification & Polish milestone.

### App Shell

- [ ] **SHELL-01**: Associate pages use unified topbar+sidebar shell with restricted nav (Dashboard, Interviews, Curriculum)
- [ ] **SHELL-02**: Associate sidebar displays cohort name label in header
- [ ] **SHELL-03**: Associate can start an interview from the shell; if no cohort/curriculum assigned, functions like public mock (select tech and run)
- [ ] **SHELL-04**: Old PublicShell + AssociateNav removed after migration

### Sign-in

- [ ] **SIGNIN-01**: Sign-in page shows two stacked buttons ("Continue with email link" / "Sign in with password") with inline form expansion, no tabs
- [ ] **SIGNIN-02**: All users redirected to set password on first login (trainers and associates alike)

### User Profile

- [ ] **PROFILE-01**: Profile model (Prisma) with profile page accessible from avatar menu — update password, display email/github, basic associate info; first-login detection migrated from user_metadata to Profile.passwordSetAt

### Data Visualization

- [ ] **VIZ-01**: Ranked skill list with score bars and trend arrows (up/down/flat) on associate dashboard
- [ ] **VIZ-02**: Focus area hero card — single prominent recommendation above the fold with context
- ~~**VIZ-03**~~: Per-skill trend chart — **CUT** in Phase 34. Radar plot is the primary trajectory visual; per-skill LineChart is redundant given the Before/Now radar overlay.
- [ ] **VIZ-04**: Trajectory language throughout ("Improving +8pts over 3 sessions") instead of raw scores
- [ ] **VIZ-05**: Spider/radar plot showing all skills in a cohort; labels highlight only when skill is assessment-ready
- [ ] **VIZ-06**: Dashboard-wide skill filter — selecting a skill transitions SkillCardList and SkillRadar to focus on that skill
- [ ] **VIZ-07**: SkillRadar Before/Now overlay uses real per-skill historical snapshots (no synthetic "Est. prior" calculation)

### Curriculum

- [ ] **CURRIC-01**: Associate can view their assigned cohort's curriculum schedule (read-only, current week highlighted, past greyed, future muted)
- [ ] **CURRIC-02**: Empty state when no cohort assigned ("You haven't been assigned to a cohort yet")

### Design Tokens

- [ ] **DESIGN-01**: DESIGN.md data-viz section documenting chart palette, typography, axis conventions, tooltip patterns, trajectory language
- [ ] **DESIGN-02**: Chart color tokens added to globals.css with light+dark pairs

### Dark Mode

- [ ] **DARK-01**: All pages and components respect dark mode theme (no hardcoded hex, no light-only Tailwind classes)
- [ ] **DARK-02**: All recharts components use CSS var tokens for fills, strokes, and tooltip styles

### Shell Architecture Overhaul

- [ ] **SHELL-32-01**: Sidebar is primary navigation surface for all roles with Settings as collapsible bottom accordion
- [ ] **SHELL-32-02**: TopBar stripped to utility-only (wordmark, CohortSwitcher, ThemeToggle, AvatarMenu) with no center nav links
- [ ] **SHELL-32-03**: Batch Upload appears in trainer sidebar Actions group
- [ ] **SHELL-32-04**: Profile is a modal overlay triggered from avatar menu, not a standalone page
- [ ] **SHELL-32-05**: Landing page has minimal header with NLM logo and Sign In button
- [ ] **SHELL-32-06**: /profile route redirects to appropriate dashboard (profile is modal-only)
- [ ] **SHELL-32-07**: Roster table has no slug column
- [ ] **SHELL-32-08**: Trainer associate detail page renders same AssociateDashboardClient as associate view
- [ ] **SHELL-32-09**: Password change requires old password verification or email OTP before allowing update

## Future Requirements

Deferred to subsequent milestones.

### Deploy (v1.4)

- **DEPLOY-01**: CI/CD pipeline for automated builds and deploys
- **DEPLOY-02**: Production deploy to GCE via Docker Compose
- **DEPLOY-03**: Scheduled readiness sweep cron

### Deferred Features

- **CURRIC-03**: Curriculum cloning across cohorts
- **CURRIC-04**: Curriculum-scoped gap computation
- **COHORT-05**: Cohort snapshots + per-cohort trend charts
- **NOTIF-01**: Readiness-change email notifications
- **VALID-01**: Nyquist validation hygiene backfill

## Out of Scope

| Feature | Reason |
|---------|--------|
| OAuth providers (Google, GitHub) | Adds config surface + user confusion about auth method; defer to v1.4+ |
| Leaderboards / cohort comparison | Demotivates lower performers; self-comparison only |
| Curriculum editing by associates | Curriculum is trainer-owned; creates conflict resolution complexity |
| Completion checkboxes on curriculum | Creates anxiety about missed weeks; curriculum is informational |
| Multiple simultaneous recommendations | Decision fatigue; single focus area is more actionable |
| Auto-start recommended mock | Removes associate agency; show CTA instead |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DESIGN-01 | Phase 26 | Pending |
| DESIGN-02 | Phase 26 | Pending |
| SHELL-01 | Phase 27 | Pending |
| SHELL-02 | Phase 27 | Pending |
| SHELL-03 | Phase 27 | Pending |
| SHELL-04 | Phase 27 | Pending |
| SIGNIN-01 | Phase 28 | Pending |
| SIGNIN-02 | Phase 33 | Pending (reassigned — Phase 28 did not close trainer path) |
| PROFILE-01 | Phase 28.1 | Pending |
| VIZ-01 | Phase 29 | Pending |
| VIZ-02 | Phase 29 | Pending |
| VIZ-03 | Phase 34 | CUT (radar-primary) |
| VIZ-04 | Phase 29 | Pending |
| VIZ-05 | Phase 29 | Pending |
| VIZ-06 | Phase 34 | Pending (reconciled to 2-component reality) |
| VIZ-07 | Phase 34 | Pending (new — real historical snapshots) |
| CURRIC-01 | Phase 30 | Pending |
| CURRIC-02 | Phase 30 | Pending |
| DARK-01 | Phase 31 | Pending |
| DARK-02 | Phase 31 | Pending |
| SHELL-32-01 | Phase 35 | Pending (trainer side complete in Phase 32; Phase 35 wires associate) |
| SHELL-32-02 | Phase 32 | Pending |
| SHELL-32-03 | Phase 32 | Pending |
| SHELL-32-04 | Phase 32 | Pending |
| SHELL-32-05 | Phase 32 | Pending |
| SHELL-32-06 | Phase 32 | Pending |
| SHELL-32-07 | Phase 32 | Pending |
| SHELL-32-08 | Phase 32 | Pending |
| SHELL-32-09 | Phase 32 | Pending |

**Coverage:**
- v1.3 requirements: 28 total (VIZ-03 cut, VIZ-07 added — net unchanged)
- Mapped to phases: 28
- Unmapped: 0
- Gap closure phases: 33 (SIGNIN-02), 34 (VIZ-03-cut/VIZ-06/VIZ-07), 35 (SHELL-01/SHELL-32-01)

---
*Requirements defined: 2026-04-16*
*Last updated: 2026-04-17 — Phase 33-35 gap closure added; VIZ-03 cut, VIZ-07 introduced*
