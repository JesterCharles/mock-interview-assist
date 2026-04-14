# Milestone v1.1 Requirements — Cohort Readiness System

**Goal:** Build a trusted readiness record that any evidence source can feed — starting with connecting automated interviews to the readiness pipeline, adding associate PIN-based auth, cohort management, and curriculum-driven question selection.

**Scope:** 13 requirements across 5 categories. Ship-lean version (notifications, magic link auth, curriculum clone deferred to v1.2).

**Timeline:** 3-4 weeks, solo developer.

---

## Active Requirements (v1.1)

### Auth (PIN-based, lightweight)

- [ ] **AUTH-01**: Trainer generates a 6-digit PIN when adding an associate to a cohort. PIN is unique per associate and displayed to trainer for manual communication.
- [ ] **AUTH-02**: Associate enters PIN at the start of an automated interview. System validates PIN and creates an associate session (HttpOnly cookie) that links the interview to their identity.
- [ ] **AUTH-03**: Associate auth coexists with trainer auth. Middleware uses identity enumeration (`trainer | associate | anonymous`) with separate cookie names. No cross-contamination between `/trainer` routes and associate-protected routes.

### Pipeline Integration

- [ ] **PIPE-01**: Automated interview sessions link to the authenticated associate via PIN session. No associate slug input required from the user — identity comes from the session.
- [ ] **PIPE-02**: Automated interview sessions trigger gap score computation and readiness classification update on completion, using the same pipeline as trainer-led sessions (`gapService` → `gapPersistence` → `readinessService`).

### Cohort Management

- [ ] **COHORT-01**: Trainer can create, edit, and delete cohorts via trainer dashboard. Cohort fields: name, start date, end date, description.
- [ ] **COHORT-02**: Trainer can assign an associate to one cohort via nullable FK (`Associate.cohortId`). Associates without a cohort remain functional (backward compatible with v1.0 data).
- [ ] **COHORT-03**: Trainer dashboard roster page supports filtering by cohort via dropdown selector. Roster table and readiness badges unchanged.
- [ ] **COHORT-04**: Cohort view displays aggregate readiness summary: count of ready / improving / not_ready associates in the selected cohort. Displayed as summary bar above roster.

### Curriculum

- [ ] **CURRIC-01**: Trainer can define curriculum weeks per cohort via trainer UI. `CurriculumWeek` fields: cohort FK, week number, skill name, topic tags, start date.
- [ ] **CURRIC-02**: Interview setup auto-filters available questions to skills from taught curriculum weeks (where `startDate <= today`). If associate has a cohort with curriculum, their setup wizard pre-populates from taught skills. Adaptive weights still apply on top.

### Design

- [ ] **DESIGN-01**: Public interview flow (landing, PIN entry, automated interview), associate profile page, and auth pages are styled per DESIGN.md tokens (warm parchment backgrounds, Clash Display headings, DM Sans body, burnt orange accent).
- [ ] **DESIGN-02**: New cohort management UI and curriculum UI follow DESIGN.md from initial build. No retrofit debt.

---

## Future Requirements (deferred to v1.2+)

- **AUTH-FUTURE-01**: Magic link auth via Supabase Auth OTP (replace PIN with email-based auth)
- **AUTH-FUTURE-02**: Associate self-service password reset
- **NOTIF-01**: Readiness change email notifications to trainer via Resend
- **NOTIF-02**: Trainer email stored in Settings; global on/off toggle for notifications
- **CURRIC-FUTURE-01**: Clone curriculum weeks from existing cohort when creating new cohort
- **CURRIC-FUTURE-02**: Curriculum-scoped gap computation (only compute gaps for taught skills)
- **COHORT-FUTURE-01**: Cohort snapshots (daily/weekly aggregate readiness for trend over time)
- **COHORT-FUTURE-02**: Per-cohort readiness trend charts (recharts LineChart)

---

## Out of Scope (v1.1 and likely beyond)

- Associate self-registration (email/password signup) — trainer adds associates, no public signup
- Cohort invitation emails with onboarding flow — PIN delivery is trainer-mediated
- Multi-trainer / role-based access within a cohort — single-trainer auth sufficient
- Automated interview scheduling / calendar integration — curriculum `startDate` provides enough structure
- Cohort progress report PDFs — no client-facing portal yet
- Real-time dashboard updates (Supabase Realtime) — polling sufficient at current scale
- Granular notification preferences — ship one notification type with global toggle when notifications land
- Multi-cohort per associate / specialization tracks — single FK sufficient for v1.1

---

## Traceability

*This section is populated by the roadmapper after phases are defined.*

| REQ-ID | Phase | Plan | Status |
|--------|-------|------|--------|
| AUTH-01 | TBD | TBD | Pending |
| AUTH-02 | TBD | TBD | Pending |
| AUTH-03 | TBD | TBD | Pending |
| PIPE-01 | TBD | TBD | Pending |
| PIPE-02 | TBD | TBD | Pending |
| COHORT-01 | TBD | TBD | Pending |
| COHORT-02 | TBD | TBD | Pending |
| COHORT-03 | TBD | TBD | Pending |
| COHORT-04 | TBD | TBD | Pending |
| CURRIC-01 | TBD | TBD | Pending |
| CURRIC-02 | TBD | TBD | Pending |
| DESIGN-01 | TBD | TBD | Pending |
| DESIGN-02 | TBD | TBD | Pending |

---
*Created: 2026-04-14 for milestone v1.1 Cohort Readiness System*
