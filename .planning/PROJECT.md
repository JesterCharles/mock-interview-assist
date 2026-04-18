# Next Level Mock — Readiness Engine

## What This Is

An adaptive technical skills development platform that gives associates repeated mock interview experiences with AI-scored feedback, tracks improvement over time, and surfaces readiness signals to trainers. Features trainer-led and AI-automated mock interviews, persistent session storage (Prisma + Supabase), two-level gap scoring, readiness classification, a unified two-level app shell for both trainers and associates, a trainer analytics dashboard, an associate self-dashboard with trajectory-language visualizations (SkillCardList + FocusHero + SkillRadar Before/Now overlay), curriculum visibility for associates, and adaptive mock setup that pre-populates from gap history.

## Core Value

Associates get consistent, feedback-rich practice reps that adapt to their weaknesses — replacing snapshot audits with continuous improvement trajectories that trainers and clients can trust.

## Current State

**v1.3 shipped (PR #6 `05d2546`, merged 2026-04-18).** All four milestones to date (v1.0, v1.1, v1.2, v1.3) are on main. Production deploy automation remains deferred to v1.4.

- **v1.0 (2026-04-14):** 7 phases, 15 plans, 22 requirements. Prisma + Supabase foundation, gap scoring, readiness classification, trainer dashboard, adaptive mock setup.
- **v1.1 (2026-04-14):** 8 phases (8–15), 22 plans, 14 requirements. Cohorts + curriculum filter + authenticated automated interviews + PIN auth (flag-gated off) + unified DESIGN system (`--nlm-*` deleted). 131 commits, 239/239 vitest.
- **v1.2 (2026-04-16):** 10 phases (16–25), 26 plans, 30 requirements. Supabase Auth cutover (trainer password + associate magic link), RLS defense-in-depth, two-level app shell, trainer analytics, associate self-dashboard, PDF analytics, PIN removal. 205 commits, 470 tests.
- **v1.3 (2026-04-18):** 11 phases (26–35 incl. decimal 28.1), 18 plans, 27 requirements. Associate shell unification, accordion sign-in, Profile model, associate data-viz suite, curriculum view, dark-mode sweep, sidebar-primary architecture overhaul, gap-closure wave (P33-35). 524 passing / 4 skipped tests. Audit status: tech_debt (verification-hygiene only, no functional gaps).
- Total codebase: 35+ routes, standalone Docker output, idempotent migrations, 524 passing tests.

## Database Access Architecture

### Prisma + Service-Role (BYPASSRLS)

Prisma connects via `DATABASE_URL` (Supabase Transaction Pooler, port 6543) using the service-role key. Service-role connections **bypass RLS** — Postgres Row Level Security policies have zero effect on Prisma queries. This is intentional: Prisma is the primary data access layer, and all access control is enforced at the application layer.

### RLS as Defense-in-Depth

RLS policies are deployed on `Associate`, `Session`, `GapScore`, `Cohort`, and `CurriculumWeek` as a **defense-in-depth** layer. They protect against unauthorized direct `supabase-js` reads (e.g., from client-side code or edge functions that use the anon key). RLS is NOT the primary access control mechanism.

Policies:
- **Associate**: Self (authUserId = auth.uid()) OR trainer/admin
- **Session, GapScore**: Owner (via Associate FK) OR trainer/admin
- **Cohort, CurriculumWeek**: Trainer/admin only

A `public.is_trainer()` SECURITY DEFINER function checks `auth.jwt() -> user_metadata.role` for `'trainer'` or `'admin'`.

### Explicit-Filter Requirement

Every route handler MUST call `getCallerIdentity()` and filter database queries by the caller's identity. Do NOT rely on RLS to enforce access control for Prisma queries — service-role bypasses it.

Pattern:
```typescript
const caller = await getCallerIdentity() // [AUDIT-VERIFIED: P20]
if (caller.kind !== 'trainer' && caller.kind !== 'admin') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

All existing route handlers were audited in Phase 20 and annotated with `// [AUDIT-VERIFIED: P20]`.

### AUTH-09 Status

Middleware (`src/middleware.ts`) was rewritten to Supabase-primary in Phase 18. It guards:
- `/trainer/*` — trainer role only
- `/associate/*` except `/signin` — trainer or matching associate
- `/interview/*`, `/review/*` — trainer only

The PIN-based associate auth was never shipped to production. No grace window code exists — `getCallerIdentity()` reads Supabase session only.

## Next Milestone: v1.4 (Planning)

Milestone not yet defined. Candidates in the active backlog:

- **999.1 Staging / Prod Split** — Second Supabase project for staging, `.env.local`/`.env` split, Docker deploy routed to prod only, pre-merge CI smoke tests.
- **999.2 Trainer Default Cohort** — Persist each trainer's default cohort (`Profile.defaultCohortId` or join table); roster boots scoped instead of "All Cohorts".
- **DEPLOY-01 / DEPLOY-02 / DEPLOY-03** — CI/CD pipeline, production deploy automation, scheduled readiness-sweep cron. Deferred since v1.2.

Kick off with `/gsd-new-milestone`.

**Deferred features (see prior milestones):** curriculum cloning, curriculum-scoped gap computation, cohort snapshots + per-cohort trend charts, readiness-change email notifications, Nyquist validation backfill (VALID-01), v1.3 phase-level VERIFICATION.md normalization.

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

- ✓ AUTH-01..04: Associate Supabase auth (magic-link, bulk invite, Supabase cutover) — v1.2
- ✓ PIPE-01..02: Authenticated automated-interview pipeline + readiness recompute marker + sweep — v1.1
- ✓ COHORT-01..04: Cohort CRUD, nullable FK, roster filter, opt-in summary (backward-compatible shape) — v1.1
- ✓ CURRIC-01..02 (v1.1): Weekly curriculum with canonical skillSlug + exact-match wizard filter — v1.1
- ✓ DESIGN-01..03 (v1.1): Unified DESIGN.md token system; legacy `--nlm-*` deleted; single `/signin` tabs — v1.1

- ✓ SHELL-01..04: Associate pages on unified topbar+sidebar shell with Dashboard/Interviews/Curriculum nav + cohort header; PublicShell + AssociateNav deleted — v1.3
- ✓ SIGNIN-01..02: Accordion sign-in (no tabs); first-login password gate for both trainers and associates — v1.3 (trainer path closed in Phase 33)
- ✓ PROFILE-01: Prisma Profile model + tabbed profile page + lazy backfill migrating first-login detection from `user_metadata` to `Profile.passwordSetAt` — v1.3
- ✓ VIZ-01..07: SkillCardList with trajectory arrows + FocusHero + trajectory language + SkillRadar Before/Now overlay with real `GapScore.prevWeightedScore` snapshots + dashboard-wide 2-component skill filter (VIZ-03 formally cut — radar is canonical) — v1.3
- ✓ CURRIC-01..02 (v1.3): Associate-facing curriculum schedule with current-week highlight + empty state — v1.3
- ✓ DESIGN-01..02 (v1.3): DESIGN.md Data Visualization section + chart color tokens with light/dark pairs — v1.3
- ✓ DARK-01..02: No hardcoded hex; all recharts use CSS var tokens; semantic `--success-bg`/`--warning-bg`/`--danger-bg` — v1.3
- ✓ SHELL-32-01..09: Sidebar-primary nav for all roles + utility-only TopBar + Profile modal + landing header + roster slug cleanup + password change gated by old-password or email OTP — v1.3

### Active (v1.4 — populated by next requirements gathering)

(REQ-IDs to be filled by `/gsd-new-milestone`)

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
- **Supabase Auth**: Trainer and associate identity resolved exclusively via Supabase (`getCallerIdentity()`). PIN system removed in Phase 25.

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
| Supabase-only auth (Phase 25) | PIN system removed after Supabase cutover; getCallerIdentity() is sole identity resolver. | Phase 25 cleanup |
| AppShell role prop defaults to 'trainer' | Prevent trainer layout regression during v1.3 shell refactor. | ✓ Validated v1.3 P27 |
| Chart tokens before chart code | Build recharts with CSS vars from day one; avoids dark-mode retrofit. | ✓ Validated v1.3 P26→P31 |
| Profile model keyed on authUserId (no FK to Associate) | Trainers get profiles too; lazy backfill handles `user_metadata`→Profile migration organically. | ✓ Validated v1.3 P28.1 |
| SkillRadar Before/Now overlay as canonical trajectory | Per-skill LineChart (VIZ-03) redundant given radar; DESIGN.md documents the cut. | ✓ Validated v1.3 P34 |
| `GapScore.prevWeightedScore` captured inline on upsert, no backfill | Nullable column; radar hides Before polygon until populated. | ✓ Validated v1.3 P34 |
| Sidebar-primary navigation for all roles | TopBar utility-only; Settings as collapsible accordion; Profile as modal (not route). | ✓ Validated v1.3 P32 |
| Trainer first-login gate via exchange route reorder + SignInTabs client gate | Passport Profile check runs before trainer role short-circuit; fail-open on getUser errors (middleware still enforces). | ✓ Validated v1.3 P33 |
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
*Last updated: 2026-04-18 — v1.3 UX Unification & Polish milestone shipped*
