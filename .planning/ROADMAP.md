# Roadmap: Next Level Mock — Readiness Loop MVP

## Overview

Seven phases building the continuous improvement engine: a Prisma/Supabase foundation first, then dual-write session persistence, associate identity, gap scoring, readiness signals, a trainer dashboard to surface it all, and finally adaptive mock setup that closes the feedback loop by pre-selecting practice areas from gap history.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: DB Foundation** - Prisma schema, Supabase connection patterns, and Docker build support
- [ ] **Phase 2: Session Persistence** - Dual-write every mock to Supabase alongside file storage with sync verification
- [ ] **Phase 3: Associate Profiles** - Persistent associate identity via trainer-assigned slugs
- [ ] **Phase 4: Gap Service** - Recency-weighted two-level gap scoring with 3-session gate
- [ ] **Phase 5: Readiness Signals** - Computed readiness signal and next recommended practice area
- [ ] **Phase 6: Trainer Dashboard** - Roster view, per-associate detail, gap charts, and calibration view
- [ ] **Phase 7: Adaptive Setup** - Mock setup pre-populated from gap history with trainer override

## Phase Details

### Phase 1: DB Foundation
**Goal**: The database layer is operational — Prisma connects to Supabase, migrations run, and production Docker builds include Prisma binaries
**Depends on**: Nothing (first phase)
**Requirements**: PERSIST-03, PERSIST-06, PERSIST-07
**Success Criteria** (what must be TRUE):
  1. Prisma client uses a singleton pattern so the dev server does not exhaust Supabase free-tier connections
  2. `npx prisma migrate deploy` succeeds against the Supabase pooler URL without error
  3. Docker production image starts and the app can query Supabase (health endpoint returns 200)
  4. Prisma binary is present inside the Docker image (no missing-binary crash on startup)
**Plans:** 2 plans
Plans:
- [x] 01-01-PLAN.md — Prisma setup, schema, singleton client, health endpoint, schema push
- [x] 01-02-PLAN.md — Docker + Next.js build integration for Prisma binaries

### Phase 2: Session Persistence
**Goal**: Every completed mock session is saved to Supabase with full scoring data, while file-based storage continues to work unchanged
**Depends on**: Phase 1
**Requirements**: PERSIST-01, PERSIST-04, PERSIST-05
**Success Criteria** (what must be TRUE):
  1. Completing a trainer-led or public interview writes the session (questions, scores by dimension, trainer overrides, timestamps) to Supabase
  2. The same session also writes to the existing JSON file — existing interview history page still works
  3. A trainer can hit the sync-check endpoint and see matching session counts between file storage and DB
  4. Existing interview flows (trainer-led, public automated) complete without regression
**Plans:** 2 plans
Plans:
- [ ] 02-01-PLAN.md — Session model, historyService extraction, dual-write in /api/history POST
- [ ] 02-02-PLAN.md — Public interview complete endpoint, sync-check endpoint

### Phase 3: Associate Profiles
**Goal**: Associates have persistent identities that link across sessions, assigned by trainers without requiring any login
**Depends on**: Phase 2
**Requirements**: PERSIST-02
**Success Criteria** (what must be TRUE):
  1. A trainer can assign a slug/ID to an associate and sessions from that associate are linked under one profile
  2. Re-running an interview with the same associate slug attaches the new session to the existing profile
  3. Associate profile page shows all sessions belonging to that slug
**Plans:** 2 plans
Plans:
- [ ] 03-01-PLAN.md — Associate model, slug validation, store + dashboard + API wiring, schema push
- [ ] 03-02-PLAN.md — Associate profile page at /associate/[slug]

### Phase 4: Gap Service
**Goal**: The system computes meaningful skill and topic gaps per associate using recency-weighted scoring derived from actual question bank metadata
**Depends on**: Phase 3
**Requirements**: GAP-01, GAP-02, GAP-03, GAP-04
**Success Criteria** (what must be TRUE):
  1. Each associate has gap scores at two levels: skill (e.g., React) and topic within each skill (e.g., hooks)
  2. A newer session contributes more to the gap score than an older one (0.8 decay factor visible in score changes)
  3. Gap scores do not display for an associate with fewer than 3 completed sessions — a placeholder is shown instead
  4. Topic tags come from the question bank Markdown metadata, not hard-coded values
**Plans:** 3 plans
Plans:
- [ ] 04-01-PLAN.md — Install vitest/zod, add GapScore model + techMap to schema, push to Supabase
- [ ] 04-02-PLAN.md — TDD gap algorithm: recency-weighted average, score extraction, two-level tracking
- [ ] 04-03-PLAN.md — Wire gap persistence into session save, create read API with 3-session gate

### Phase 5: Readiness Signals
**Goal**: Each associate has a computed readiness signal and a specific recommended next practice area, updated on every session save
**Depends on**: Phase 4
**Requirements**: READY-01, READY-02, READY-03
**Success Criteria** (what must be TRUE):
  1. An associate with 3+ sessions averaging 75% or above with a non-negative score trend is marked "ready"
  2. Each associate's profile shows their single highest-priority practice recommendation (lowest weighted gap score)
  3. A trainer can change the readiness threshold in settings and the badges on all associate profiles update accordingly
**Plans:** 2 plans
Plans:
- [ ] 05-01-PLAN.md — Readiness service, classification logic, Associate schema extension, session save integration
- [ ] 05-02-PLAN.md — Settings model, threshold API, bulk recompute on threshold change

### Phase 6: Trainer Dashboard
**Goal**: Trainers can view their entire associate roster at a glance and drill into any associate's history, gaps, and score calibration
**Depends on**: Phase 5
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, DASH-07
**Success Criteria** (what must be TRUE):
  1. Navigating to /trainer shows every associate with a readiness badge (ready / improving / not ready) without triggering a recalculation
  2. Clicking an associate shows their last 5+ sessions with per-session scores
  3. The gap trend chart lets a trainer filter by skill and see topic-level breakdown over time
  4. The calibration view shows AI score vs trainer override side-by-side for any dimension
  5. Associates with fewer than 3 sessions display a meaningful empty state (no broken charts or blank panels)
  6. The /trainer route is protected by the existing single-password auth — unauthenticated users are redirected
**Plans:** 2 plans
Plans:
- [ ] 06-01-PLAN.md — Install recharts, design tokens, roster page with auth guard and sortable table
- [ ] 06-02-PLAN.md — Associate detail page with session history, gap trend chart, and calibration view
**UI hint**: yes

### Phase 7: Adaptive Setup
**Goal**: Starting a new mock for an associate automatically pre-selects technologies and weights based on that associate's gap history, while trainers retain full override control
**Depends on**: Phase 6
**Requirements**: GAP-05
**Success Criteria** (what must be TRUE):
  1. Opening the mock setup wizard for an associate with gap history shows technologies pre-selected and weighted by gap scores
  2. A trainer can change any pre-selected technology or weight before starting the interview
  3. Starting a mock for an associate with no gap history (fewer than 3 sessions) falls back to the existing manual setup without error
**Plans:** 2 plans
Plans:
- [ ] 07-01-PLAN.md — Gap scores API endpoint and weight interpolation utility with tests
- [ ] 07-02-PLAN.md — Dashboard wizard pre-population integration and visual verification
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. DB Foundation | 0/2 | Planning complete | - |
| 2. Session Persistence | 0/2 | Planning complete | - |
| 3. Associate Profiles | 0/2 | Planning complete | - |
| 4. Gap Service | 0/3 | Planning complete | - |
| 5. Readiness Signals | 0/2 | Planning complete | - |
| 6. Trainer Dashboard | 0/2 | Planning complete | - |
| 7. Adaptive Setup | 0/2 | Planning complete | - |
