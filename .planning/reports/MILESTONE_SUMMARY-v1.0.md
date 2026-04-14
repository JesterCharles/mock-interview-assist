# Milestone v1.0 -- Readiness Loop MVP

**Generated:** 2026-04-14
**Purpose:** Team onboarding and project review

---

## 1. Project Overview

**Next Level Mock** is an adaptive technical skills development platform that gives associates repeated mock interview experiences with AI-scored feedback, tracks improvement over time, and surfaces readiness signals to trainers.

**Core Value:** Associates get consistent, feedback-rich practice reps that adapt to their weaknesses -- replacing snapshot audits with continuous improvement trajectories that trainers and clients can trust.

**What v1.0 Adds:** Persistent database layer (Prisma + Supabase), session storage, associate profiles with trainer-assigned slugs, two-level gap scoring with recency weighting, readiness classification signals, a trainer dashboard with charts, and adaptive mock setup that pre-populates from gap history.

**Target Users:** Training org trainers managing associate skill development for client placements.

---

## 2. Architecture & Technical Decisions

### Data Layer
- **Prisma 7 + Supabase (Postgres)** -- type-safe ORM with hosted DB. Connection via Transaction Pooler (port 6543) with `@prisma/adapter-pg` and `pg.Pool max:5`. Direct URL (port 5432) for migrations only.
- **Dual-write migration** -- sessions write to both file storage (existing) and Supabase. DB failure logs but doesn't fail the request. `/api/sync-check` compares counts.
- **Assessments as JSON column** -- complex nested structure stored as Prisma `Json` type; doesn't need independent querying in MVP.

### Identity & Auth
- **Trainer-assigned slugs** -- simple text IDs (e.g., "john-doe"), no login required. Slugs validated (lowercase, alphanumeric + hyphens).
- **Existing single-password auth** preserved -- HttpOnly cookie, 24hr expiry. Middleware protects `/dashboard`, `/interview`, `/review`, `/trainer` routes.

### Scoring Pipeline
- **Gap scores computed on session save** (not dashboard load) -- stored in denormalized `GapScore` table with composite unique (associateId, skill, topic).
- **Recency-weighted average with 0.8 decay** -- newer sessions contribute more. Two levels: skill and topic within skill.
- **Score extraction:** `finalScore` (trainer-validated) with `llmScore` fallback from assessments JSON.
- **3-session minimum gate** before displaying gap scores or computing readiness.

### Readiness Classification
- **Three states:** ready (>= threshold + non-negative trend), improving (positive trend + below threshold), not_ready (everything else).
- **Threshold configurable** (default 75%) via `Settings` table. Change triggers bulk recompute for all associates.
- **Recommended practice area** = lowest weighted gap score topic.
- **Pre-computed on Associate model** -- dashboard reads are instant (DASH-05).

### Trainer Dashboard
- **Two routes:** `/trainer` (roster) and `/trainer/[slug]` (detail).
- **recharts 3.8.1** for gap trend charts -- React 19 compatible, SVG-based, Tailwind-themed.
- **Server-fetched data** passed as props to client chart components.

### Adaptive Setup
- **Slug onBlur triggers gap fetch** -- pre-selects technologies with inverse-weighted gaps (lowest score = weight 5, highest = weight 1).
- **Fully editable** -- trainer can override all pre-populated selections. Cold-start (<3 sessions) silently falls back to manual.

---

## 3. Phases Delivered

| Phase | Name | Status | Summary |
|-------|------|--------|---------|
| 1 | DB Foundation | Complete | Prisma schema, Supabase connection, singleton client, health endpoint, Docker build support |
| 2 | Session Persistence | Complete | Dual-write sessions to file + Supabase, public interview complete endpoint, sync-check |
| 3 | Associate Profiles | Complete | Associate model with trainer-assigned slugs, profile page at /associate/[slug] |
| 4 | Gap Service | Complete | Recency-weighted two-level gap scoring, vitest test suite (76 tests), zod validation |
| 5 | Readiness Signals | Complete | Readiness classification (ready/improving/not_ready), configurable threshold, settings API |
| 6 | Trainer Dashboard | Complete | Roster view, associate detail, gap trend charts (recharts), calibration view |
| 7 | Adaptive Setup | Complete | Gap-based technology pre-selection in setup wizard, weight interpolation, trainer override |

---

## 4. Requirements Coverage

### Persistence (7/7)
- PERSIST-01: Session persistence in Supabase with full scoring data
- PERSIST-02: Associate profiles with trainer-assigned slug/ID
- PERSIST-03: Prisma singleton prevents connection exhaustion
- PERSIST-04: Dual-write to file + Supabase during migration
- PERSIST-05: Sync-check endpoint compares file/DB session counts
- PERSIST-06: Docker build includes Prisma binary via outputFileTracingIncludes
- PERSIST-07: Supabase pooler URL for runtime, direct URL for migrations

### Gap Tracking (5/5)
- GAP-01: Two-level gap tracking (skill + topic)
- GAP-02: Recency-weighted scoring with 0.8 decay
- GAP-03: 3-session minimum gate
- GAP-04: Topic tags from question bank Markdown metadata
- GAP-05: Adaptive mock setup pre-selects from gap history

### Trainer Dashboard (7/7)
- DASH-01: Roster view with readiness badges
- DASH-02: Per-associate detail with session history
- DASH-03: Gap trend charts with skill/topic selector (recharts)
- DASH-04: AI vs trainer score calibration view
- DASH-05: Readiness badges pre-computed on session save
- DASH-06: Dashboard protected by single-password auth
- DASH-07: Graceful empty states for <3 sessions

### Readiness Signal (3/3)
- READY-01: Computed readiness signal (75% avg / 3 sessions / non-negative trend)
- READY-02: Next recommended practice area per associate
- READY-03: Readiness threshold configurable per trainer

**All 22 requirements complete.**

---

## 5. Key Decisions Log

| ID | Decision | Phase | Rationale |
|----|----------|-------|-----------|
| D-01-01 | Minimal schema first (connectivity test) | 1 | Prove pipeline before modeling domain |
| D-01-02 | New `/api/health` endpoint with DB check | 1 | Replaces root-page spider for Docker HEALTHCHECK |
| D-01-03 | Migrations as separate command, not startup | 1 | Avoids startup latency and failure loops |
| D-01-04 | `@prisma/adapter-pg` with `pg.Pool max:5` | 1 | Connection pool control with Supabase pgBouncer |
| D-02-01 | Dual-write in `/api/history` POST | 2 | DB failure doesn't fail request; file storage continues |
| D-02-02 | Assessments as JSON column | 2 | Complex structure, no independent querying needed |
| D-02-03 | Sync-check with spot-checks | 2 | Validates dual-write beyond count comparison |
| D-03-01 | Trainer-assigned slugs (no auto-generation) | 3 | Simplest identity model; no login complexity |
| D-03-02 | Optional slug input alongside candidateName | 3 | Backward compatible with existing flow |
| D-04-01 | 0.8 decay factor, denormalized GapScore table | 4 | Simple starting point; autoresearch optimizes later |
| D-04-02 | finalScore with llmScore fallback | 4 | Prefer trainer-validated scores when available |
| D-04-03 | Composite unique (associateId, skill, topic) | 4 | Enables upsert on session save without duplicates |
| D-05-01 | Three-state readiness with cascade order | 5 | Check "ready" before "improving" to avoid misclassification |
| D-05-02 | Threshold in Settings table, bulk recompute | 5 | Trainer control without code changes |
| D-06-01 | recharts 3.8.1 (not Tremor) | 6 | React 19 compatible; Tremor requires React 18 |
| D-06-02 | Server-fetched data to client chart components | 6 | Keeps chart rendering client-side, data fetching server-side |
| D-07-01 | Inverse-weight linear interpolation | 7 | Lowest gap = highest weight; simple and intuitive |
| D-07-02 | Silent cold-start fallback | 7 | No errors for new associates; manual mode seamless |

---

## 6. Tech Debt & Deferred Items

### Known Gaps
- **Public interview persistence orphaned** (Phase 2) -- `/api/public/interview/complete` endpoint exists but `handleFinish()` in `page.tsx` calls it fire-and-forget; wired during debug stage
- **No `prisma/migrations/` directory** -- Phase 1 used `db push` instead of `migrate deploy`; need to establish migration history before production
- **readinessScore always null** -- field defined in types but never populated in API routes; `ReadinessDisplay` shows "-- pending"
- **5 console.log in production paths** -- including one that logs LLM response content

### Codex Adversarial Review Findings (Addressed)
- **techMap never persisted** -- fixed: added to sessionPersistence create/update
- **Non-completed sessions in gap/readiness queries** -- fixed: added `status: 'completed'` filter
- **Sort order mismatch (createdAt vs date)** -- fixed: consistent `date` ordering
- **Auth consistency (CR-02)** -- fixed: trainer roster route uses `isAuthenticatedSession()`

### Codex Findings (MVP-Accepted)
- Cookie auth is a static string (`nlm_session=authenticated`) -- MVP design for single-trainer
- Public interview endpoint accepts unauthenticated writes -- by design, rate-limited
- Post-save recompute is fire-and-forget -- acceptable at <200 associates
- Dual-write returns success even on DB failure -- silent divergence under transient faults

### Deferred to Future Milestones
- Autoresearch optimization of 0.8 decay factor
- Cross-associate gap comparison dashboard
- Notification when associate reaches "ready" status
- Historical readiness timeline
- Real-time score updates via Supabase Realtime
- Export/download associate reports
- Difficulty-level adaptation in mock setup
- Error boundaries (`error.tsx` files)
- Structured logging (replace console.log/error)

---

## 7. Getting Started

### Run the Project
```bash
npm install
npm run dev          # Dev server at localhost:3000
npm run test         # Vitest (76 tests)
npm run build        # Production build
```

### Environment Variables
```
OPENAI_API_KEY       # LLM scoring
GITHUB_TOKEN         # Question bank access
RESEND_API_KEY       # Email delivery
APP_PASSWORD         # Auth password
DATABASE_URL         # Supabase pooler (port 6543)
DIRECT_URL           # Supabase direct (port 5432, migrations)
```

### Key Directories
```
src/app/api/         # API routes (history, trainer, settings, health, etc.)
src/lib/             # Core services (gapService, readinessService, sessionPersistence, prisma)
src/app/trainer/     # Trainer dashboard (roster + detail)
src/app/dashboard/   # Interview setup wizard
src/app/interview/   # Interview conductor
src/store/           # Zustand store (interviewStore.ts)
prisma/              # Schema definition
```

### Core Data Flow
```
Interview Complete
  -> /api/history POST (dual-write: file + Supabase)
    -> persistSessionToDb (upsert Session, link Associate)
      -> saveGapScores (compute + upsert GapScore records)
        -> updateAssociateReadiness (classify + persist status)
```

### Tests
```bash
npm run test                    # All 76 tests
npx vitest run src/lib/__tests__/gapService.test.ts    # Gap algorithm
npx vitest run src/lib/__tests__/readinessService.test.ts  # Readiness classification
```

---

## Stats

- **Timeline:** 2026-04-13 -> 2026-04-14 (~24 hours)
- **Phases:** 7/7 complete
- **Plans:** 15/15 complete
- **Requirements:** 22/22 complete
- **Commits:** 114
- **Source files changed:** 64 (+18,574 / -46 lines)
- **Tests:** 76 (4 test files, all passing)
- **Contributors:** JesterCharles + Claude (AI-assisted)
