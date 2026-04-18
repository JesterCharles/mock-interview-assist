# Next Level Mock — Readiness Engine

## What This Is

An adaptive technical skills development platform that gives associates repeated mock interview experiences with AI-scored feedback, tracks improvement over time, and surfaces readiness signals to trainers. Features trainer-led and AI-automated mock interviews, persistent session storage (Prisma + Supabase), two-level gap scoring, readiness classification, a unified two-level app shell for both trainers and associates, a trainer analytics dashboard, an associate self-dashboard with trajectory-language visualizations (SkillCardList + FocusHero + SkillRadar Before/Now overlay), curriculum visibility for associates, and adaptive mock setup that pre-populates from gap history.

## Core Value

Associates get consistent, feedback-rich practice reps that adapt to their weaknesses — replacing snapshot audits with continuous improvement trajectories that trainers and clients can trust.

## Current State

**v1.4 planning (initialized 2026-04-18).** v1.0 / v1.1 / v1.2 / v1.3 shipped on main. Production deploy automation folded into v1.4 Phase 43 (IAC + CI/CD) as part of MSA-from-day-1 approach for coding challenges.

- **v1.0 (2026-04-14):** 7 phases, 15 plans, 22 requirements. Prisma + Supabase foundation, gap scoring, readiness classification, trainer dashboard, adaptive mock setup.
- **v1.1 (2026-04-14):** 8 phases (8–15), 22 plans, 14 requirements. Cohorts + curriculum filter + authenticated automated interviews + PIN auth (flag-gated off) + unified DESIGN system (`--nlm-*` deleted). 131 commits, 239/239 vitest.
- **v1.2 (2026-04-16):** 10 phases (16–25), 26 plans, 30 requirements. Supabase Auth cutover (trainer password + associate magic link), RLS defense-in-depth, two-level app shell, trainer analytics, associate self-dashboard, PDF analytics, PIN removal. 205 commits, 470 tests.
- **v1.3 (2026-04-18):** 11 phases (26–35 incl. decimal 28.1), 18 plans, 27 requirements. Associate shell unification, accordion sign-in, Profile model, associate data-viz suite, curriculum view, dark-mode sweep, sidebar-primary architecture overhaul, gap-closure wave (P33-35). 524 passing / 4 skipped tests. Audit status: tech_debt (verification-hygiene only, no functional gaps).
- **v1.4 (PLANNING — initialized 2026-04-18):** 9 phases (36-44), 44 requirements across 9 themes (CODING-MODEL-NN, CODING-BANK-NN, JUDGE-NN, CODING-API-NN, CODING-UI-NN, CODING-SCORE-NN, SQL-NN, IAC-NN, HARD-NN). Adds coding challenges as a new continuous-practice rep type: Judge0-based multi-language sandbox (Python, JS/TS, Java, SQL-SQLite, C#), loaded from public+private GitHub challenge banks, feeding existing GapScore via explicit `CodingSkillSignal` mapping. Approach B — MSA-from-day-1 (dedicated Judge0 host + Terraform IaC + CI/CD). 8-10 week estimate.
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

## Active Milestone: v1.4 — Coding Challenges + Multi-Language Sandbox (Planning)

**Phases:** 36-44 (9 phases) | **Requirements:** 44 | **Approach:** B — MSA-from-day-1 | **Estimate:** 8-10 weeks

**Goal:** Add coding challenges as a new continuous-practice rep type alongside mock interviews. Judge0-based multi-language sandbox (Python, JS/TS, Java, SQL-SQLite, C# Mono) loaded from public GitHub challenge banks (with hidden tests in a separate private repo). Coding attempts feed `GapScore` via explicit `CodingSkillSignal` mapping — continuous skill telemetry across all 11 cohort weeks instead of the current 3 front-loaded assessment points.

**Problem driver:** Client incident where a Python coding skill gap was missed — cohort failed assessment early but had zero remediation path because coding was only assessed in weeks 1-3 of an 11-week cohort.

### v1.4 Requirement Themes

| Theme | Pattern | Count | Phase |
|-------|---------|-------|-------|
| Data Model | CODING-MODEL-NN | 6 | 36 |
| Challenge Bank | CODING-BANK-NN | 5 | 37 |
| Judge0 Infra | JUDGE-NN | 6 | 38 |
| Execution API | CODING-API-NN | 7 | 39 |
| UI MVP | CODING-UI-NN | 5 | 40 |
| GapScore Integration | CODING-SCORE-NN | 4 | 41 |
| SQL (SQLite) | SQL-NN | 3 | 42 |
| MSA Deploy (IaC) | IAC-NN | 5 | 43 |
| Hardening + Load | HARD-NN | 4 | 44 |

**Full requirement list:** see `.planning/REQUIREMENTS.md`

### Readiness Math with Coding Signals

v1.4 extends the existing 0.8-decay recency-weighted gap engine (unchanged since v1.0) to consume coding-attempt signals alongside interview signals. The pipeline stacks three locked coefficients:

**Pipeline (per coding attempt):**

```
perAttemptWeightedScore
  = mappedScore                           // Phase 36 D-16 (by signalType)
    × signalType.weight                   // Phase 36 D-16 (by signalType)
    × DIFFICULTY_MULTIPLIERS[difficulty]  // Phase 41 D-02
```

Then the existing `gapService.recencyWeightedAverage()` applies 0.8^index decay across per-attempt rows keyed on `(associateId, skill, topic)` where `topic = "coding:<language>"`.

**Signal-type weight table (Phase 36 D-16, unchanged by Phase 41):**

| signalType    | mappedScore       | weight | Rationale                             |
|---------------|-------------------|--------|---------------------------------------|
| pass          | 100               | 1.0    | Full credit                           |
| partial       | fraction × 100    | 0.85   | Discount partial vs clean pass        |
| fail          | 0                 | 1.0    | Clear signal                          |
| compile_error | 10                | 0.6    | Weaker than wrong-answer              |
| timeout       | 20                | 0.8    | Algorithm chosen but inefficient      |

**Difficulty multiplier (Phase 41 D-02, prevents easy-attempt farming):**

| difficulty | multiplier |
|------------|------------|
| easy       | 0.7        |
| medium     | 1.0        |
| hard       | 1.3        |

**Worked example — associate "ada" mixed history on `python-fundamentals`:**

| # | Rep type  | Event                              | Raw score | After signal weight | After difficulty multiplier | Decay factor (newest→oldest) |
|---|-----------|------------------------------------|-----------|---------------------|-----------------------------|------------------------------|
| 1 | Interview | Session (mean of Python questions) | 72        | 72                  | 72 (decay-only path)        | 0.8⁰ = 1.00                  |
| 2 | Coding    | Hard challenge, pass               | 100       | 100 × 1.0 = 100     | 100 × 1.3 = **130**         | 0.8¹ = 0.80                  |
| 3 | Coding    | Medium challenge, compile_error    | 10        | 10 × 0.6 = 6        | 6 × 1.0 = **6**             | 0.8² = 0.64                  |
| 4 | Interview | Session (Python avg)               | 65        | 65                  | 65 (decay-only path)        | 0.8³ = 0.512                 |
| 5 | Coding    | Easy challenge, pass               | 100       | 100 × 1.0 = 100     | 100 × 0.7 = **70**          | 0.8⁴ = 0.4096                |

*Note:* interview-signal rows skip the difficulty multiplier because interviews have no Judge0-authored difficulty. They feed gapService through the existing `saveGapScores()` path unchanged.

`recencyWeightedAverage` over the five rows (newest first):

```
weightedSum  = 72×1.00 + 130×0.80 + 6×0.64 + 65×0.512 + 70×0.4096
             = 72.00 + 104.00 + 3.84 + 33.28 + 28.672
             = 241.79
weightTotal  = 1.00 + 0.80 + 0.64 + 0.512 + 0.4096
             = 3.3616
GapScore     = 241.79 / 3.3616 ≈ 71.93
```

Readiness classification (`readinessService.ts`, unchanged) then uses this 71.93 against the configured threshold (default 75) alongside trend + session-count gates.

**Farming resistance.** Any number of easy passes cannot drag `weightedScore` as high as the same number of hard passes — easy contributes 70 per attempt, hard 130. A trainer auditing a suspicious ready-signal can check the attempt table's difficulty column in the Phase 41 `/trainer/[slug]` coding panel to confirm the source mix.

**Phase invariant.** `src/lib/gapService.ts` is **not** modified by v1.4. The 0.8 decay, the recency math, and the `(associateId, skill, topic)` uniqueness key are all Phase 4 / v1.0 contracts. v1.4 Phase 41 only extends `gapPersistence.ts` with a new entrypoint (`persistCodingSignalToGapScore` + `DIFFICULTY_MULTIPLIERS`) and hooks it from the Phase 39 poll helper fire-and-forget.

### v1.4 Architecture Headlines

- **New Prisma models:** `CodingChallenge`, `CodingAttempt`, `CodingTestCase`, `CodingSkillSignal` — separate from `Session` so readiness math stays explainable
- **Hidden tests live in a private GitHub repo** (token-scoped server-only fetch via `GITHUB_CODING_PRIVATE_TOKEN`) — the public `/api/github` proxy would leak them to DevTools
- **Judge0 ≥ 1.13.1** (pinned — older versions had sandbox escape advisory `GHSA-q7vg-26pg-v5hr`); proxied through Next.js, never exposed to browsers; `enable_network=false`; internal-network-only binding
- **Async submit + poll only.** Judge0 `wait=true` does not scale per upstream docs
- **Env-driven deploy:** `JUDGE0_URL` + `JUDGE0_AUTH_TOKEN` drive the client so the architecture deploys local-mono OR remote-MSA without code changes
- **MSA-from-day-1:** dedicated Judge0 GCE host (Terraform IaC) + separate GitHub Actions workflows for app vs Judge0 — folds in deferred DEPLOY-01/02/03 backlog as part of meaningful product work
- **SQLite only for SQL v1.4.** Real Postgres SQL runner deferred to v1.5 (hardened service with isolated schemas, role-locked, `statement_timeout`, no extensions). Trainer-facing label: `SQL fundamentals (SQLite dialect)`
- **C# Mono only for .NET v1.4.** Modern .NET 8+ runtime deferred to v1.5 if client demand confirmed

**Deferred features (see prior milestones):** curriculum cloning, curriculum-scoped gap computation, cohort snapshots + per-cohort trend charts, readiness-change email notifications, Nyquist validation backfill (VALID-01), v1.3 phase-level VERIFICATION.md normalization. Backlog items **999.1 (Staging/Prod Split)** and **999.2 (Trainer Default Cohort)** remain parked and are not in v1.4 scope.

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

### Active (v1.4 — Coding Challenges + Multi-Language Sandbox)

See `.planning/REQUIREMENTS.md` for the full 44-requirement list. Summary by theme:

- **CODING-MODEL-01..06** — New Prisma models (`CodingChallenge`, `CodingAttempt`, `CodingTestCase`, `CodingSkillSignal`) + idempotent migration + signal→GapScore mapping service — Phase 36
- **CODING-BANK-01..05** — Public + private GitHub repo schemas, loader mirroring `github-service.ts`, ETag cache, validation pipeline — Phase 37
- **JUDGE-01..06** — Judge0 ≥ 1.13.1 pinned, docker-compose integration, sandbox hardening, env-driven URL, health probe, 10-submission spike gate — Phase 38
- **CODING-API-01..07** — Auth-gated async submit + poll endpoints, server-side hidden test injection, language allowlist, rate limits, verdict normalization — Phase 39
- **CODING-UI-01..05** — `/coding` + `/coding/[id]` routes, Monaco editor, attempt history, shell integration — Phase 40
- **CODING-SCORE-01..04** — `CodingSkillSignal` → GapScore with difficulty weighting; trainer dashboard extension — Phase 41
- **SQL-01..03** — Judge0 SQLite wired, result normalization, explicit dialect label — Phase 42
- **IAC-01..05** — Terraform module, CI/CD workflows, health/rollback, monitoring, runbook — Phase 43
- **HARD-01..04** — 50-concurrent load test, abuse test, STRIDE review, docs — Phase 44

### Out of Scope

- Multi-format assessments (Feynman method, architecture diagrams, code review) — validate interview format first
- Independent job seeker subscription — MVP serves training org only
- Client-facing talent pipeline portal — deferred to post-MVP
- Multi-tenancy / role-based access — single training org for now, cohorts within one org
- Billing / payments — no revenue model in MVP
- Multi-evidence readiness engine (QC audits, trainer observations as evidence sources) — architecture should accommodate but not build yet
- Real-time dashboard updates via Supabase Realtime — read-heavy dashboard sufficient for v1.1
- Function-level test harness for coding challenges — stdin/stdout sufficient for v1.4 pedagogy; per-language drivers deferred to v1.5
- Real Postgres SQL execution — deferred to v1.5 as separate hardened service with prewarmed isolated schemas, role-locked connections, statement_timeout, no extensions, no network, full teardown per attempt. v1.4 ships SQLite dialect only.
- Modern .NET 8+ runtime — Judge0 ships C# Mono; modern .NET needs separate sandbox, deferred to v1.5 if client demand confirmed
- In-app challenge authoring — PR-based authoring ships faster; in-app editor deferred to v1.5
- Judge0 WebSocket realtime updates — polling via attempt endpoint sufficient for v1.4
- Anti-cheat / plagiarism detection for coding attempts — trust-dependent signal; build after client asks

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
| Coding challenges as separate data model, NOT merged into `Session` | Readiness math must stay explainable; merging would force artificial unification of interview/coding signals | v1.4 Discovery (codex consult 2026-04-18) |
| Private GitHub repo for hidden coding tests | Public `/api/github` proxy leaks content to DevTools; associates would hardcode sample answers | v1.4 Discovery (codex consult 2026-04-18) |
| Stdin/stdout matching for v1.4 coding pedagogy | Sufficient for algorithms/control flow/hash maps; function-level harness deferred to v1.5 | v1.4 Discovery |
| SQLite only for v1.4 SQL | Real Postgres SQL needs hardened isolated service; mis-scope would create client trust issues from dialect mismatch | v1.4 Discovery (codex consult) |
| Judge0 async submit + poll only (no `wait=true`) | Judge0 upstream docs explicitly say wait mode does not scale | v1.4 Discovery (codex consult) |
| Judge0 pinned to ≥ 1.13.1 | Older versions had sandbox escape advisory `GHSA-q7vg-26pg-v5hr` | v1.4 Discovery (codex consult) |
| MSA-from-day-1 (Approach B) over mono-service (Approach A) | User has runway before next cohort; dedicated Judge0 host avoids rework when client demand grows; folds in DEPLOY-01/02/03 backlog | v1.4 Discovery (user-selected) |
| Env-driven Judge0 topology (`JUDGE0_URL`) | Same code deploys local-mono for dev OR remote-MSA for prod without branching | v1.4 Discovery |
| Phase 38 Judge0 spike gate before committing to VM sizing | De-risks resource assumptions; codex required this gate | v1.4 Discovery (codex consult) |

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

## Open Items for v1.5

1. **Coding-attempt backfill** (Phase 41 D-10) — No retroactive backfill of pre-v1.4 per-cohort coding data shipped in v1.4. Legacy data was manually administered without Judge0 and lacks a reliable verdict mapping. Decide in v1.5 whether to ship an opt-in importer with trainer manual sign-off, or leave pre-v1.4 history untracked.
2. **Coding signal decay cap** — Consider clamping max movement per single attempt (e.g., single attempt can move `GapScore` by ≤ N points) to reduce noise from one-off bad days. Tuning decision — needs live data.
3. **Per-language readiness breakdown on associate UI** — Currently associate-facing views aggregate across languages. Trainer view already shows per-language via `topic="coding:<lang>"` — mirror to associate dashboard if trainers request it.
4. **Trainer alerts on coding gap threshold** — Push notification when an associate's coding-only `weightedScore` crosses a warning boundary. Out of v1.4 scope; revisit after first cohort runs with v1.4.

---
*Last updated: 2026-04-18 — Phase 41 readiness-math documentation*
