# Next Level Mock — Readiness Engine

## What This Is

An adaptive technical skills development platform that gives associates repeated mock interview experiences with AI-scored feedback, tracks improvement over time, and surfaces readiness signals to trainers. Features trainer-led and AI-automated mock interviews, persistent session storage (Prisma + Supabase), two-level gap scoring, readiness classification, a trainer dashboard with gap charts, and adaptive mock setup that pre-populates from gap history.

## Core Value

Associates get consistent, feedback-rich practice reps that adapt to their weaknesses — replacing snapshot audits with continuous improvement trajectories that trainers and clients can trust.

## Current State

**v1.1 shipped (PR `4238e36`, merged 2026-04-14) — production deploy deferred to v1.2 cycle.**

- **v1.0 (2026-04-14):** 7 phases, 15 plans, 22 requirements. Prisma + Supabase foundation, gap scoring, readiness classification, trainer dashboard, adaptive mock setup.
- **v1.1 (2026-04-14):** 8 phases (8–15), 22 plans, 14 requirements. Cohorts + curriculum filter + authenticated automated interviews + PIN auth (flag-gated off) + unified DESIGN system (`--nlm-*` deleted). 131 commits, 239/239 vitest, 24/24 Playwright, Codex findings all P1/P2 resolved pre-merge.
- Total codebase: 35 routes, standalone Docker output, idempotent migrations.

## Next Milestone Goals: v1.2 (placeholder)

**Carry-forward tech debt (sourced from `milestones/v1.1-MILESTONE-AUDIT.md` §5):**

- Production deploy of v1.1 (merged to main, not yet promoted — user choice at ship time)
- **PIN auth:** harden rate limiter (IP reputation, exponential backoff), validate in staging, flip `ENABLE_ASSOCIATE_AUTH=true`
- **Perf:** cached GitHub question-bank manifest (wizard `<400ms` target — currently advisory)
- **Ops:** scheduled readiness sweep cron (endpoint exists, today trainer-invoked)
- **Dark mode:** visual QA across every interactive state (tokens defined, toggle wired, spot-checked only)
- **Nyquist validation hygiene:** backfill VALIDATION.md for phases that shipped with `human_needed` residuals

**Deferred features (see `milestones/v1.1-REQUIREMENTS.md` deferred list):** magic-link / Supabase Auth OTP (replace PIN), curriculum cloning, curriculum-scoped gap computation, cohort snapshots + per-cohort trend charts, readiness-change email notifications, self-service PIN reset.

Concrete v1.1→v1.2 scoping happens via `/gsd-new-milestone`.

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

- ✓ AUTH-01..04: Associate PIN auth (6-digit, dedicated secret, cookie versioning) — v1.1 (flag-gated off in prod)
- ✓ PIPE-01..02: Authenticated automated-interview pipeline + readiness recompute marker + sweep — v1.1
- ✓ COHORT-01..04: Cohort CRUD, nullable FK, roster filter, opt-in summary (backward-compatible shape) — v1.1
- ✓ CURRIC-01..02: Weekly curriculum with canonical skillSlug + exact-match wizard filter — v1.1
- ✓ DESIGN-01..03: Unified DESIGN.md token system; legacy `--nlm-*` deleted; single `/signin` tabs — v1.1

### Active

(TBD for v1.2 — populate via `/gsd-new-milestone`)

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
- **Postgres canonical (v1.1)**: Per Codex review finding #6, v1.1 treats Postgres as the single source of truth for all new features (cohorts, PINs, authenticated automated sessions, curriculum, cohort dashboards). File history is transitional export/backup for trainer-led sessions only — no new code path in v1.1 writes to file storage. `/api/sync-check` is an advisory export-parity check, no longer a safety-critical gate. Deleting the file-history write path entirely is deferred to a later milestone.
- **Docker deployment**: GCE via Docker Compose, port 80
- **ASSOCIATE_SESSION_SECRET**: Dedicated env var for HMAC-signing associate PIN session cookies. Separate from `APP_PASSWORD`. Added per Codex review finding #4 — rotating the trainer password no longer invalidates associate sessions, and the cryptographic secret is not a human-entered string.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase (hosted Postgres) over SQLite | Avoid migration headache at scale. Concurrent writes. Auth/RLS for future. | ✓ Validated P1 |
| Prisma 7 as ORM | Type-safe queries, portable across DB engines | ✓ Validated P1 |
| Trainer-assigned associate IDs (no login) | Simplest identity model for MVP | ✓ Validated P3 |
| 0.8 recency decay for gap algorithm | Recent sessions weighted more. Autoresearch optimizes later. | ✓ Validated P4 |
| 75% / 3 sessions / non-negative trend = "ready" | Configurable default. Trainers calibrate. | ✓ Validated P5 |
| recharts 3.8.1 (not Tremor) | React 19 compatible. Tremor requires React 18. | ✓ Validated P6 |
| Dual-write migration (file + DB) | v1.0: preserve existing flows. | ✓ Validated P2 |
| Postgres canonical for v1.1 | Cohorts/PINs/automated pipeline are DB-only by design; file layer is legacy backup. | Codex review 2026-04-14 |
| Dedicated ASSOCIATE_SESSION_SECRET | Decouple associate auth from trainer password; enable token versioning. | Codex review 2026-04-14 |
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
*Last updated: 2026-04-15 after v1.1 milestone (shipped 2026-04-14, prod deploy deferred to v1.2)*
