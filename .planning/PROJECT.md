# Next Level Mock — Readiness Engine

## What This Is

An adaptive technical skills development platform that gives associates repeated mock experiences with AI-scored feedback, tracks improvement over time, and surfaces readiness signals to trainers. Currently deployed as a mock interview tool with trainer-led and AI-automated modes. Evolving into a multi-format readiness engine with persistent gap tracking and a trainer dashboard.

## Core Value

Associates get consistent, feedback-rich practice reps that adapt to their weaknesses — replacing snapshot audits with continuous improvement trajectories that trainers and clients can trust.

## Requirements

### Validated

- ✓ Trainer-led mock interviews with real-time scoring — existing
- ✓ Public AI-automated interviews (no trainer needed) — existing
- ✓ LLM scoring via LangGraph/GPT-4o-mini with keyword matching + soft skills — existing
- ✓ Trainer score override (real-time calibration) — existing
- ✓ Question bank from GitHub Markdown repos with weighted randomization — existing
- ✓ PDF report generation via @react-pdf/renderer — existing
- ✓ Email delivery of reports via Resend — existing
- ✓ Rate limiting via device fingerprinting (2/13hr, 125/day) — existing
- ✓ Single-password auth with session management — existing
- ✓ Docker Compose deployment on GCE — existing
- ✓ Voice input via Web Speech API — existing

### Active

- [ ] **PERSIST-01**: Session persistence in Supabase (every mock stored with full scoring data)
- [x] **PERSIST-02**: Associate profiles with trainer-assigned slug/ID (persistent identity) — Validated in Phase 3: Associate Profiles
- [ ] **GAP-01**: Two-level gap tracking (skill → topic) with recency-weighted scoring
- [ ] **GAP-02**: Adaptive mock setup (pre-select technologies/weights based on gap history)
- [ ] **DASH-01**: Trainer dashboard — roster view with readiness status badges
- [ ] **DASH-02**: Per-associate detail — session history, gap trend charts, skill/topic selector
- [ ] **DASH-03**: AI vs trainer score calibration view
- [x] **READY-01**: Computed readiness signal (75% avg / 3 sessions / non-negative trend) — Validated in Phase 5: Readiness Signals
- [x] **READY-02**: Next recommended practice area per associate — Validated in Phase 5: Readiness Signals

### Out of Scope

- Multi-format assessments (Feynman method, architecture diagrams, code review) — validate interview format first
- Independent job seeker subscription — MVP serves training org only
- Client-facing talent pipeline portal — deferred to post-MVP
- Multi-tenancy / role-based access — single training org for now
- Billing / payments — no revenue model in MVP
- Supabase Auth — trainer-assigned IDs for MVP, auth upgrade later

## Context

- Founder runs the training operation directly — builds and trains associates for client placements
- Current QC audits are broken: definition recall, "4/5 good job" with no feedback, cumulative doesn't test cumulative
- Trainers are stretched thin — primarily content delivery, mocks are ad-hoc
- Trainers have validated AI scoring as "relatively in place" — fine-tuning planned via autoresearch
- No persistence currently — sessions are live logs only, blocking all adaptive features
- Three eventual buyer segments: training org (platform license), job seekers (subscription), clients (pipeline visibility)
- Design doc approved: `~/.gstack/projects/JesterCharles-mock-interview-assist/jestercharles-main-design-20260413-115201.md`

## Constraints

- **Solo developer**: Founder is the engineer — scope must be achievable in 3-5 weeks
- **Existing codebase**: Next.js 16, App Router, Zustand, LangGraph — must preserve working flows
- **Backwards compatible**: Trainer-led and public interview modes must keep working during migration
- **Supabase (Postgres)**: Hosted database — free tier for MVP, scales to multi-user later
- **Dual-write migration**: File storage (backward compat) + Supabase until migration validated
- **Docker deployment**: GCE via Docker Compose, port 80

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase (hosted Postgres) over SQLite | Avoid migration headache when scaling to multi-tenant. Concurrent writes handled natively. Auth/RLS available for future segments. | — Pending |
| Prisma as ORM | Type-safe queries, works identically with Postgres and SQLite if needed to switch | — Pending |
| Trainer-assigned associate IDs (no login) | Simplest identity model for MVP. No auth complexity. | Validated Phase 3 |
| 0.8 recency decay for gap algorithm | Recent sessions weighted more. Simple starting point, autoresearch optimizes later. | — Pending |
| 75% / 3 sessions / non-negative trend = "ready" | Configurable default. Trainers calibrate based on experience. | — Pending |
| Interview format only for MVP | Validate core loop before expanding to other formats | — Pending |
| Dual-write migration (file + DB) | Preserve existing flows while adding persistence. No data migration needed. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-13 after Phase 3 (Associate Profiles) completion*
