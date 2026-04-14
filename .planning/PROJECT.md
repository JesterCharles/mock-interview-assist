# Next Level Mock — Readiness Engine

## What This Is

An adaptive technical skills development platform that gives associates repeated mock interview experiences with AI-scored feedback, tracks improvement over time, and surfaces readiness signals to trainers. Features trainer-led and AI-automated mock interviews, persistent session storage (Prisma + Supabase), two-level gap scoring, readiness classification, a trainer dashboard with gap charts, and adaptive mock setup that pre-populates from gap history.

## Core Value

Associates get consistent, feedback-rich practice reps that adapt to their weaknesses — replacing snapshot audits with continuous improvement trajectories that trainers and clients can trust.

## Current State (v1.0 shipped 2026-04-14)

- 7 phases, 15 plans, 22 requirements — all complete
- Prisma 7 + Supabase with dual-write migration (file + DB)
- 60 unit tests passing, TypeScript clean
- Trainer dashboard at /trainer with gap trend charts (recharts)
- Adaptive mock setup pre-populates from associate gap history
- 11 tech debt items tracked (see milestones/v1.0-MILESTONE-AUDIT.md)

## Current Milestone: v1.1 Cohort Readiness System

**Goal:** Build a trusted readiness record that any evidence source can feed — starting with connecting automated interviews to the readiness pipeline, adding associate auth, cohort management, and curriculum-driven question selection.

**Target features:**
- Associate authentication (automated interviews link to identity and readiness record)
- Cohort management (groups with curriculum schedules, trainer assignment)
- Curriculum-driven question selection (auto-filter based on what's been taught)
- Automated interviews feeding readiness pipeline (sessions persist, gap scores compute)
- Cohort-level trainer dashboard views (roster filtered by cohort, aggregate readiness)
- Design cohesion across all pages (apply DESIGN.md consistently)
- Email notifications on readiness changes

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
- ✓ PERSIST-01: Session persistence in Supabase — v1.0
- ✓ PERSIST-02: Associate profiles with trainer-assigned slugs — v1.0
- ✓ PERSIST-03: Prisma singleton connection pooling — v1.0
- ✓ PERSIST-04: Dual-write file + Supabase — v1.0
- ✓ PERSIST-05: Sync-check endpoint — v1.0
- ✓ PERSIST-06: Docker Prisma binary support — v1.0
- ✓ PERSIST-07: Supabase pooler URL pattern — v1.0
- ✓ GAP-01: Two-level gap tracking (skill + topic) — v1.0
- ✓ GAP-02: Recency-weighted scoring (0.8 decay) — v1.0
- ✓ GAP-03: 3-session minimum gate — v1.0
- ✓ GAP-04: Topic tags from question bank metadata — v1.0
- ✓ GAP-05: Adaptive mock setup from gap history — v1.0
- ✓ READY-01: Computed readiness signal — v1.0
- ✓ READY-02: Recommended practice area — v1.0
- ✓ READY-03: Configurable readiness threshold — v1.0
- ✓ DASH-01 through DASH-07: Trainer dashboard — v1.0

### Active

(Defining in REQUIREMENTS.md for v1.1)

### Out of Scope

- Multi-format assessments (Feynman method, architecture diagrams, code review) — validate interview format first
- Independent job seeker subscription — MVP serves training org only
- Client-facing talent pipeline portal — deferred to post-MVP
- Multi-tenancy / role-based access — single training org for now, cohorts within one org
- Billing / payments — no revenue model in MVP
- Multi-evidence readiness engine (QC audits, trainer observations as evidence sources) — architecture should accommodate but not build yet
- Real-time dashboard updates via Supabase Realtime — read-heavy dashboard sufficient for v1.1

## Context

- Founder runs the training operation directly — builds and trains associates for client placements
- v1.0 shipped in ~26 hours (solo dev + Claude AI assistance)
- Trainers validated AI scoring as "relatively in place" — fine-tuning planned via autoresearch
- Three eventual buyer segments: training org (platform license), job seekers (subscription), clients (pipeline visibility)
- Design system: editorial/utilitarian aesthetic (warm parchment + burnt orange) documented in DESIGN.md

## Constraints

- **Solo developer**: Founder is the engineer
- **Existing codebase**: Next.js 16, App Router, Zustand, LangGraph — must preserve working flows
- **Backwards compatible**: Trainer-led and public interview modes must keep working
- **Supabase (Postgres)**: Hosted database — free tier, scales to multi-user later
- **Dual-write active**: File storage (backward compat) + Supabase until migration fully validated
- **Docker deployment**: GCE via Docker Compose, port 80

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase (hosted Postgres) over SQLite | Avoid migration headache at scale. Concurrent writes. Auth/RLS for future. | ✓ Validated P1 |
| Prisma 7 as ORM | Type-safe queries, portable across DB engines | ✓ Validated P1 |
| Trainer-assigned associate IDs (no login) | Simplest identity model for MVP | ✓ Validated P3 |
| 0.8 recency decay for gap algorithm | Recent sessions weighted more. Autoresearch optimizes later. | ✓ Validated P4 |
| 75% / 3 sessions / non-negative trend = "ready" | Configurable default. Trainers calibrate. | ✓ Validated P5 |
| recharts 3.8.1 (not Tremor) | React 19 compatible. Tremor requires React 18. | ✓ Validated P6 |
| Dual-write migration (file + DB) | Preserve existing flows. No data migration. | ✓ Validated P2 |
| Interview format only for MVP | Validate core loop before expanding | ✓ Good |

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
*Last updated: 2026-04-14 — v1.1 Cohort Readiness System milestone started*
