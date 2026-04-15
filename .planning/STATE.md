---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Analytics & Auth Overhaul
status: defining_requirements
stopped_at: milestone scoped; requirements gathering next
last_updated: "2026-04-15T19:00:00.000Z"
last_activity: 2026-04-15 -- v1.2 milestone started via /gsd-new-milestone
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
previous_milestone:
  version: v1.1
  name: Cohort Readiness System
  summary_report: .planning/reports/MILESTONE_SUMMARY-v1.1.md
  git_tag: v1.1
---

# v1.2 — Analytics & Auth Overhaul (started 2026-04-15)

**Goal:** Actionable analytics dashboard, Supabase auth cutover, bulk cohort onboarding via magic-link invites.

**Target features:**
- Trainer analytics + reporting (KPI strip, cohort trends, sparklines, gap aggregation, PDF export)
- Dashboard redesign per `finalized.html` (topbar + sidebar layout, Gap Analysis / Calibration / Reports sidebar routes)
- Associate dashboard upgrade (self-view gap trends, recommended next area, goals/streaks, book-next-mock)
- Full Supabase Auth cutover + bulk magic-link cohort onboarding (replaces trainer password + PIN system)
- Cached question-bank manifest

**Deferred to v1.3 (CI/CD milestone):** prod deploy automation, readiness sweep cron, dark-mode visual QA, Nyquist validation backfill.

---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-15 — v1.2 milestone active)

**Core value:** Associates get consistent, feedback-rich practice reps that adapt to their weaknesses — replacing snapshot audits with continuous improvement trajectories.
**Current focus:** v1.2 — defining requirements, then roadmap.

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-04-15 — Milestone v1.2 started

## Accumulated Context

### v1.1 decisions (retained for reference)

- Postgres canonical for all new features; file history legacy export only
- Dedicated `ASSOCIATE_SESSION_SECRET` (retires w/ PIN system in v1.2)
- Idempotent migrations (`IF NOT EXISTS` + `duplicate_object` guards)
- Split completion endpoints for automated interviews
- Opt-in `?includeSummary=true` preserves v1.0 `/api/trainer` shape
- Exact skillSlug match for curriculum filter

### v1.2 starting context

- Auth migration is breaking; need path for existing associates → `auth.users`
- Bulk invite = new trainer surface; pairs cohort assignment + curriculum mapping + magic-link send
- Dashboard redesign touches all trainer routes; `finalized.html` mockup at `~/.gstack/projects/JesterCharles-mock-interview-assist/designs/design-system-20260413/finalized.html`
- Question-bank caching invalidation strategy TBD (TTL vs hash)

### Blockers/Concerns

- None at scope stage.

## Session Continuity

Last session: 2026-04-15 — v1.2 scoped via `/gsd-new-milestone`
Resume with: `/gsd-plan-phase [N]` once roadmap approved.
