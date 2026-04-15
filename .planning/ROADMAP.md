# Roadmap: Next Level Mock

## Milestones

- **v1.0 Readiness Loop MVP** -- Phases 1-7 (shipped 2026-04-14) | [Archive](milestones/v1.0-ROADMAP.md)
- **v1.1 Cohort Readiness System** -- Phases 8-15, 22 plans, 14 reqs; PIN auth (flag-gated), cohorts, curriculum filter, unified DESIGN system (shipped 2026-04-14, PR `4238e36`) | [Archive](milestones/v1.1-ROADMAP.md)
- **v1.2** — TBD (planning)

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

### v1.2 (Planned)

Carried-forward tech debt (see `milestones/v1.1-MILESTONE-AUDIT.md` §5):

- Harden PIN rate limiter (IP reputation, exponential backoff) + flip `ENABLE_ASSOCIATE_AUTH=true`
- Production deploy of v1.1 (merged to main, not yet promoted)
- Cached GitHub question-bank manifest (wizard `<400ms` target)
- Scheduled readiness sweep cron (`/api/admin/readiness-sweep` today is manual)
- Dark mode visual QA across every interactive state
- Readiness-change email notifications (Resend)

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
| 8. Schema Migration | v1.1 | 2/2 | Complete | 2026-04-14 |
| 9. Associate PIN Auth | v1.1 | 3/3 | Complete | 2026-04-14 |
| 10. Automated Interview Pipeline | v1.1 | 3/3 | Complete | 2026-04-14 |
| 11. Cohort Management | v1.1 | 3/3 | Complete | 2026-04-14 |
| 12. Cohort Dashboard Views | v1.1 | 2/2 | Complete | 2026-04-14 |
| 13. Curriculum Schedule | v1.1 | 3/3 | Complete | 2026-04-14 |
| 14. Design Cohesion | v1.1 | 2/2 | Complete | 2026-04-14 |
| 15. Design Cohesion Sweep | v1.1 | 4/4 | Complete | 2026-04-14 |
