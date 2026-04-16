---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Analytics & Auth Overhaul
status: executing
last_updated: "2026-04-16T07:19:00.177Z"
last_activity: 2026-04-16 -- Phase 21 planning complete
progress:
  total_phases: 10
  completed_phases: 5
  total_plans: 16
  completed_plans: 14
  percent: 88
---

# v1.2 — Analytics & Auth Overhaul (started 2026-04-15)

**Goal:** Actionable analytics dashboard, Supabase auth cutover, bulk cohort onboarding via magic-link invites.

**Phase structure (16-25):**

- Phase 16: Cached Question-Bank Manifest (independent quick win)
- Phase 17: Schema Prep + Email Backfill (independent data migration)
- Phase 18: Supabase Auth Install (depends on 17)
- Phase 19: Bulk Invite (depends on 18)
- Phase 20: Middleware Cutover + RLS (depends on 18, 19)
- Phase 21: App Shell Redesign (parallelizable)
- Phase 22: Trainer Analytics (depends on 21, 17)
- Phase 23: Associate Self-Dashboard (depends on 20, 21)
- Phase 24: PDF Analytics Export (depends on 22)
- Phase 25: PIN Removal + Cleanup (depends on 20 + 2-week grace)

**Deferred to v1.3 (CI/CD milestone):** prod deploy automation, readiness sweep cron, dark-mode visual QA, Nyquist validation backfill.

---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-15 — v1.2 milestone active)

**Core value:** Associates get consistent, feedback-rich practice reps that adapt to their weaknesses — replacing snapshot audits with continuous improvement trajectories.
**Current focus:** Phase 20 — Middleware Cutover + RLS

## Current Position

Phase: 21
Plan: Not started
Status: Ready to execute
Last activity: 2026-04-16 -- Phase 21 planning complete

## Performance Metrics

- v1.0: 7 phases, 22 reqs, ~26h
- v1.1: 8 phases, 14 reqs, ~24h, 131 commits
- v1.2: 10 phases, 30 reqs (planned)

## Accumulated Context

### Locked decisions (from research/SUMMARY.md)

- Auth stack: `@supabase/ssr` + `@supabase/supabase-js` admin (greenfield install)
- RLS = defense-in-depth; app-layer auth primary; Prisma stays on service-role + Transaction Pooler
- `Associate.authUserId` additive nullable FK (no PK swap, `Session.associateId` unchanged)
- Trainer role marker: `auth.users.user_metadata.role = 'trainer'`
- Magic-link delivery: `admin.generateLink` + Resend (NOT Supabase default SMTP); PKCE + 7-day expiry
- Manifest cache: in-memory `Map` + 5-min TTL + ETag `If-None-Match` + manual invalidate (no Redis)
- Recharts only outside PDFs; pre-rendered SVG sparkline helper inside `@react-pdf`
- 4 KPI cards max (Avg Readiness / Mocks This Week / At-Risk Count + Top Gap / AI-Trainer Variance)
- Bulk invite: 50/call cap, per-email transaction, `lastInvitedAt` 5-min throttle
- PIN removal: staged 4-commit sequence + 2-week grace + CI grep-gate before `DROP COLUMN`
- No streaks / no leaderboards / no push notifications; readiness-goal progress bar only
- Cohort-mate names hidden on associate dashboard (aggregate-only privacy default)

### v1.1 decisions (retained)

- Postgres canonical for all new features; file history legacy export only
- Idempotent migrations (`IF NOT EXISTS` + DO-block guards)
- Split completion endpoints for automated interviews
- Opt-in `?includeSummary=true` preserves v1.0 `/api/trainer` shape
- Exact skillSlug match for curriculum filter

### Open questions (resolve during phase planning)

- Q1: Existing Associate email coverage audit (BLOCKER for Phase 17 strategy)
- Q2: Supabase project tier + April-2026 email rate limits (Phase 18)
- Q3: Latest `@supabase/ssr` version verification (Phase 18)
- Q4: Does `Session` capture question-bank provenance? (affects Phase 22 per-bank analytics)
- Q5: `finalized.html` sidebar spec reconcile (Phase 21)

### Blockers/Concerns

- None at roadmap stage. Q1 must answer before Phase 17 plan finalizes.

## Session Continuity

Last session: 2026-04-16T07:00:29.624Z
Resume with: `/gsd-plan-phase 16`
