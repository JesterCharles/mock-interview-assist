# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next Level Mock — an adaptive technical skills development platform built with Next.js 16 (App Router). Features trainer-led and AI-automated mock interviews scored via LLM (GPT-4o-mini through LangChain/LangGraph), with candidates receiving PDF reports via email. The Readiness Loop MVP adds persistent gap tracking per associate, readiness classification (ready/improving/not_ready), a trainer dashboard with roster and trend charts, and adaptive interview setup that pre-populates tech weights based on past performance.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build (standalone output for Docker)
npm run start    # Start production server
npm run lint     # ESLint
npm run test     # Run Vitest tests
npm run test:watch  # Run Vitest in watch mode
```

Docker: `docker compose up` (uses `.env.docker`, maps port 80 → 3000).

## Architecture

### Interview Flow

1. **Dashboard** (`/dashboard`) — Setup wizard (3 phases): configure GitHub repo → select technologies with weights → set question count and candidate info. Includes associate slug input for identity tracking. When an associate has 3+ sessions, tech weights are adaptively pre-populated from gap scores (weakest skills get highest weights).
2. **Interview** (`/interview`) — Trainer conducts interview: 2 starter/behavioral questions → N technical questions with voice input (Web Speech API), keyword tracking, soft skills assessment
3. **Review** (`/review`) — Validate/override LLM scores, edit assessments
4. **Completion** — Generate PDF report (`@react-pdf/renderer`), send via Resend email. Session is dual-written to file storage and Supabase, gap scores are computed, and readiness status is recomputed for the associate.
5. **Trainer Dashboard** (`/trainer`) — Roster view of all associates with readiness badges, sortable table, search. Drill into `/trainer/[slug]` for session history, gap trend charts (recharts), skill filtering, and score calibration view.
6. **Associate Profile** (`/associate/[slug]`) — Server-rendered public profile showing session history and readiness status.

There is also a public automated interview mode (`/api/public/interview/*`) that uses an AI agent to conduct interviews without a trainer.

### State Management

Zustand store (`src/store/interviewStore.ts`) with `persist` middleware (localStorage). This is the central nervous system — holds the full interview session, setup wizard state, per-question assessments, tech weights, associate slug, and navigation. Most components read/write through this store. The session now includes `associateSlug` and `techMap` (maps week numbers to skill names) for gap scoring.

### Scoring System (LangGraph)

`src/lib/langchain.ts` — LangGraph workflow with conditional routing:
- Starter questions → guideline-based evaluation
- Technical questions → keyword matching + soft skills assessment
- Public interview questions → transcript-based evaluation

Uses `ChatOpenAI` (gpt-4o-mini). Scoring is async per-question with status tracking (`pending` → `processing` → `ready` → `validated`).

### Question Source

Questions are parsed from Markdown files fetched from a configurable GitHub repo via `src/lib/github-service.ts` (proxied through `/api/github` to keep tokens server-side). The parser (`src/lib/markdownParser.ts`) extracts question text, keywords, model answers, and difficulty levels. Questions are selected with weighted randomization based on technology weights and stratified by difficulty according to interview level.

### Rate Limiting

`src/lib/rateLimitService.ts` — Per-user limits via device fingerprinting (`@fingerprintjs/fingerprintjs`). Limits: 2 interviews per 13-hour session, 125/day global. State stored in `data/rate-limits.json`.

### Data Persistence

**Dual-write**: Sessions are written to both file storage (backward compat) and Supabase (Postgres via Prisma). The file layer remains the source of truth for the existing interview flow; Supabase is the source of truth for the trainer dashboard, gap scores, and readiness signals.

**File storage** (`data/` directory):
- `data/interview-history.json` — Past sessions (72-hour retention)
- `data/rate-limits.json` — Rate limit tracking (24-hour cleanup)
- Cleanup runs on boot + every 12 hours via `src/lib/instrumentation.ts`

**Supabase (Postgres via Prisma)**:
- `Session` — Full interview session data, linked to Associate via `associateId`
- `Associate` — Identity (slug, displayName), readiness fields (status, recommendedArea, lastComputedAt)
- `GapScore` — Per-skill recency-weighted scores, unique per (associateId, skill, topic)
- `Settings` — Singleton trainer config (readiness threshold, default 75%)
- `HealthCheck` — Connectivity test table

**Key services**:
- `src/lib/sessionPersistence.ts` — Dual-write orchestrator (upserts Associate, writes Session)
- `src/lib/gapService.ts` — Pure-function gap scoring (0.8 decay factor, recency-weighted averages)
- `src/lib/gapPersistence.ts` — Persists gap scores to DB, fire-and-forget from session save
- `src/lib/readinessService.ts` — Classifies associates as ready/improving/not_ready based on threshold + trend + session count
- `src/lib/settingsService.ts` — Read/write trainer settings, triggers bulk readiness recompute on threshold change
- `src/lib/adaptiveSetup.ts` — Maps gap scores to tech weights (1-5) for setup wizard pre-population
- `src/lib/prisma.ts` — Prisma singleton client
- `src/lib/historyService.ts` — File-based history read/write (extracted from route handler)

### Authentication

Single-password auth with HttpOnly cookie (`nlm_session`, 24hr expiry). Auth context in `src/lib/auth-context.tsx`, server helpers in `src/lib/auth-server.ts`. Middleware (`src/middleware.ts`) protects `/dashboard`, `/interview`, `/review`, and `/trainer` routes.

### Key API Routes

| Route | Purpose |
|-------|---------|
| `/api/score` | LLM scoring via LangGraph |
| `/api/github` | GitHub content proxy (hides token) |
| `/api/generate-summary` | AI-generated interview summaries |
| `/api/send-email` | Email delivery via Resend |
| `/api/history` | Interview history CRUD (file + dual-write to Supabase) |
| `/api/health` | DB connectivity check via Prisma |
| `/api/settings` | GET/PUT trainer settings (readiness threshold) |
| `/api/sync-check` | Compare file vs DB session parity |
| `/api/trainer` | GET roster of all associates with readiness data |
| `/api/trainer/[slug]` | GET associate detail: sessions, gap scores, trend data |
| `/api/associates/[slug]/gap-scores` | GET gap scores for adaptive setup pre-population |
| `/api/public/interview/start` | Start public automated interview |
| `/api/public/interview/agent` | Process public interview responses |
| `/api/public/interview/complete` | Persist public interview session to Supabase |

## Environment Variables

- `OPENAI_API_KEY` — Required for LLM scoring
- `GITHUB_TOKEN` — GitHub API access for question banks
- `RESEND_API_KEY` — Email delivery
- `APP_PASSWORD` — Authentication password
- `DATABASE_URL` — Supabase Transaction Pooler connection string (port 6543, `?connection_limit=5&pool_timeout=10`)
- `DIRECT_URL` — Direct Supabase connection for Prisma migrations (port 5432)

## Tech Stack

- **Framework**: Next.js 16 with React 19, TypeScript 5
- **Styling**: Tailwind CSS 4
- **State**: Zustand 5 with persistence
- **Database**: Supabase (Postgres) via Prisma 7 ORM (`@prisma/adapter-pg` + `pg` driver)
- **Charts**: Recharts 3 (trainer dashboard trend lines, gap charts)
- **Validation**: Zod 4 (API route input validation)
- **Testing**: Vitest 4 with `@vitest/coverage-v8`
- **LLM**: LangChain/LangGraph with OpenAI
- **PDF**: @react-pdf/renderer
- **Email**: Resend
- **Path alias**: `@/*` maps to `src/*`

## Unified Workflow — Tool Ownership

### Active Toolchain

| Tool | Role | Install Location |
|------|------|-----------------|
| **Codex plugin** | Code review (sole reviewer) — no self-review by Claude | Plugin (codex@openai-codex) |
| **Superpowers plugin** | TDD enforcement, git worktrees, subagent execution | Plugin (superpowers@claude-plugins-official) |
| **GSD (get-shit-done)** | Context engineering, planning, wave execution | ~/.claude/skills/gsd/ |
| **gstack** | Product discovery, design, QA, security, shipping, retros | ~/.claude/skills/gstack/ |
| **Obsidian plugin** | Second-brain vault at ~/second-brain | Plugin (obsidian@obsidian-skills) |
| **Caveman plugin** | Communication style | Plugin (caveman@caveman) |
| **playwright-cli** | Playwright E2E test authoring | ~/.claude/skills/playwright-cli/ |
| **web-research** | Web scraping to vault | ~/.claude/skills/web-research/ |
| **Autoresearch** | Autonomous optimization loops with single numeric metric | ~/second-brain/tools/autoresearch/program.md (template) |

### Code Review Rules

- ALL code review goes through Codex. Never self-review.
- Do NOT use gstack `/review` for code review. Use Codex plugin instead.
- Security audits (`/cso`) are separate from code review and use gstack.
- Review sequence: `/cso` first → `codex review` → `codex adversarial-review`.

### Planning Rules

- GSD owns structured planning (`/gsd-discuss-phase`, `/gsd-plan-phase`).
- gstack `/plan-*-review` skills review GSD's plans (CEO, eng, design lenses).
- Superpowers plans only at micro-level inside worktree tasks (TDD step breakdown).
- Do NOT use superpowers brainstorming for feature-level planning; use `/office-hours` + GSD.

### Execution Rules

- GSD dispatches wave execution (`/gsd-execute-phase`).
- Inside each task: superpowers enforces TDD (RED-GREEN-REFACTOR) in git worktrees.
- Every test-passing state gets an atomic commit.

### Testing Rules

- gstack `/qa` = exploratory browser testing (finds bugs).
- playwright-cli = structured E2E test writing (prevents regressions).
- Flow: `/qa` finds bugs → fix → playwright-cli writes test → `/gsd-verify-work` confirms.

### Debugging Rules

- Use gstack `/investigate` for root-cause analysis.
- Do NOT use superpowers systematic-debugging (redundant).
- Use gstack `/freeze` to lock files during debugging.

### Shipping Rules

- gstack `/ship` creates PR and runs pre-merge checks.
- Codex reviews the PR.
- gstack `/land-and-deploy` merges and verifies production.
- GSD `/gsd-complete-milestone` archives and tags.

### Autoresearch Integration

Autoresearch activates when a workflow phase surfaces a **measurable, single-numeric metric** worth optimizing. Template: `~/second-brain/tools/autoresearch/program.md`.

**When to trigger:**
- After `/benchmark` — baseline perf metrics → optimize load times, bundle size
- After `/qa` — measurable UX issue → optimize interaction latency
- After `/cso` — quantifiable security score → harden iteratively
- During execution — prompt engineering, scoring accuracy, algorithm tuning
- After `/retro` — recurring metric-based improvement identified

**Autoresearch loop (per target):**
1. Define `program.md` for target: metric, scope (files to modify), eval harness, time budget
2. Create branch: `autoresearch/<tag>` in superpowers worktree
3. Autonomous loop: modify → measure → keep/discard → repeat (never stop, never ask)
4. Log results to `results.tsv` (commit, metric, status, description)
5. Codex reviews winning commits only
6. Merge winners back to feature branch
7. Archive `results.tsv` + learnings → second-brain

**NLM-specific autoresearch targets:**

| Metric | Optimize | Modify Scope | Eval Harness |
|--------|----------|-------------|-------------|
| LLM scoring accuracy | Prompts in `src/lib/langchain.ts` | Scoring prompt templates | Compare vs human-validated scores |
| Page load time (ms) | Components, bundle | Target page | Playwright timing |
| PDF generation time (ms) | PDF template | `@react-pdf/renderer` usage | Time endpoint |
| Interview quality score | AI interview prompts | `/api/public/interview/*` | Rubric-based eval |
| Bundle size (KB) | Imports, dynamic loading | Target pages | `next build` output |

### Second-Brain Integration

| Trigger | Save To | How |
|---------|---------|-----|
| `/office-hours` output | `projects/nlm/notes/office-hours-YYYY-MM-DD.md` | Obsidian plugin |
| `/cso` findings | `projects/nlm/notes/security-audit-YYYY-MM-DD.md` | Obsidian plugin |
| `/retro` output | `projects/nlm/notes/retro-YYYY-MM-DD.md` | Obsidian plugin |
| `/investigate` findings | `projects/nlm/notes/investigation-YYYY-MM-DD.md` | Obsidian plugin |
| Autoresearch results | `projects/nlm/notes/autoresearch-<tag>.md` | Manual after loop |
| web-research | `raw/articles/` via web-research skill | Automatic |
| Milestone completion | `projects/nlm/notes/milestone-N-summary.md` | After `/gsd-complete-milestone` |

### Feature Lifecycle (Quick Reference)

```
Discovery:  /office-hours → web-research (if needed)
Context:    /gsd-new-project → /gsd-discuss-phase
Planning:   /gsd-plan-phase → /plan-eng-review → /plan-ceo-review
Execution:  superpowers worktree → GSD waves → TDD per task
Optimize:   autoresearch (when metric exists) → codex reviews winners
Review:     /cso → codex review → codex adversarial-review
Testing:    /qa (find bugs) → fix → playwright-cli (regression tests)
Ship:       /ship → codex PR review → /land-and-deploy → /canary
Reflect:    /retro → save to second-brain
```

### Disabled/Redirected Capabilities

| Tool | Capability | Status | Reason |
|------|-----------|--------|--------|
| gstack | `/review` | → Codex | Codex owns all code review |
| superpowers | `systematic-debugging` | Skip | gstack `/investigate` preferred |
| superpowers | `brainstorming` | Micro-only | Not for feature-level planning |
| GSD | `/gsd-ship` PR creation | Skip | gstack `/ship` handles PR mechanics |

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Next Level Mock — Readiness Engine**

An adaptive technical skills development platform that gives associates repeated mock experiences with AI-scored feedback, tracks improvement over time, and surfaces readiness signals to trainers. Currently deployed as a mock interview tool with trainer-led and AI-automated modes. Evolving into a multi-format readiness engine with persistent gap tracking and a trainer dashboard.

**Core Value:** Associates get consistent, feedback-rich practice reps that adapt to their weaknesses — replacing snapshot audits with continuous improvement trajectories that trainers and clients can trust.

### Constraints

- **Solo developer**: Founder is the engineer — scope must be achievable in 3-5 weeks
- **Existing codebase**: Next.js 16, App Router, Zustand, LangGraph — must preserve working flows
- **Backwards compatible**: Trainer-led and public interview modes must keep working during migration
- **Supabase (Postgres)**: Hosted database — free tier for MVP, scales to multi-user later
- **Dual-write migration**: File storage (backward compat) + Supabase until migration validated
- **Docker deployment**: GCE via Docker Compose, port 80
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Database + ORM
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Prisma CLI | 7.7.0 | Schema migrations, type generation | Latest stable. Node >=20.19 required — Docker uses node:22-alpine, satisfied. `prisma migrate deploy` works cleanly in CI/Docker build. |
| @prisma/client | 7.7.0 | Type-safe query builder at runtime | Auto-generated from schema. Full TypeScript inference on queries. Pairs 1:1 with CLI version. |
| @prisma/adapter-pg | 7.7.0 | pg driver adapter for Prisma | Enables Prisma to use the native `pg` driver instead of its own binary driver — better connection pool control with Supabase's pgBouncer. |
| pg | 8.20.0 | PostgreSQL driver | Required peer for `@prisma/adapter-pg`. Mature, no breaking changes. |
| @types/pg | 8.20.0 | TypeScript types for pg | Dev dep only. |
#### Supabase Connection Pattern for Docker (Persistent Node Server)
- Use the **Transaction Pooler** connection string from Supabase dashboard (port 6543, PgBouncer in transaction mode)
- Add `?connection_limit=5&pool_timeout=10` to the DATABASE_URL
- Do NOT use `?pgbouncer=true` session mode — that's for serverless/edge where each request gets a connection
- Set `@prisma/adapter-pg` for explicit pool control; configure `max: 5` in `pg.Pool`
# .env
# Also set DIRECT_URL for migrations (bypasses pooler)
### Supabase Client (For Future Realtime / Auth Prep)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @supabase/supabase-js | 2.103.0 | Supabase JS client | Use for future Realtime subscriptions (trainer dashboard live updates) and eventual auth migration. Do NOT use for data queries in MVP — Prisma handles that. |
| @supabase/ssr | 0.10.2 | Next.js App Router Supabase helpers | Handles cookie-based auth for server components and route handlers. Only needed when Supabase Auth is adopted. MVP can skip this. |
### Data Visualization (Trainer Dashboard Charts)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| recharts | 3.8.1 | Score trend lines, skill radar/bar charts | Supports React 19 (`peerDependencies: react '^16.8 || ^17 || ^18 || ^19'`). Composable SVG API. Well-documented. Largest React chart ecosystem with most StackOverflow answers. Ships with `LineChart`, `BarChart`, `RadarChart` — covers all NLM dashboard needs. |
### Gap Tracking Algorithm (No External Library)
- Recency-weighted average per skill/topic: `score_n * 0.8^0 + score_(n-1) * 0.8^1 + ...` normalized
- Readiness signal: 75% weighted avg + 3 sessions + non-negative trend (last 3 sessions slope >= 0)
- Next recommended area: lowest weighted score topic
### Validation (Request Payloads)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| zod | 4.3.6 | API route input validation | Already the standard for Next.js App Router. Version 4 (latest stable) works with TypeScript 5. Use to validate incoming session payloads before Prisma writes. Do NOT add as a new dep — install and use. |
### Data Fetching (Dashboard Pages)
- Dashboard data (roster, associate history, gap trends) is read-heavy with no real-time requirement in MVP
- Next.js App Router Server Components + route handlers provide sufficient data fetching patterns
- Adding a client-side cache library adds complexity for a solo dev with a 3-5 week timeline
- If Realtime is needed later (live score updates during trainer-led interviews), add Supabase Realtime subscriptions then
## Full Installation
# Database + ORM
# Supabase client (prep for future realtime/auth)
# Charts
# Validation (if not already present)
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Charts | recharts 3.8.1 | @tremor/react 3.18.7 | Tremor v3 requires React ^18, incompatible with React 19.2.3 in this project |
| Charts | recharts 3.8.1 | @nivo (0.99.0) | Full D3 dependency tree (~200KB extra), overkill for 3-4 chart types |
| Charts | recharts 3.8.1 | react-chartjs-2 + chart.js | Canvas-based (not SVG), less composable, harder to theme with Tailwind 4 |
| ORM | Prisma 7.7.0 | Drizzle ORM | Drizzle has excellent DX but Prisma is already in PROJECT.md as a decided choice; consistent with existing decision log |
| ORM version | Prisma 7.7.0 | Prisma 6.14.0 | Prisma 7 is current stable; no reason to pin to 6 for this greenfield addition |
| Gap algorithm | Custom TS | ts-sm2 | SM-2 is for flashcard recall intervals, wrong problem domain |
| Gap algorithm | Custom TS | Any ML library | 50-line weighted average does not need ML infrastructure |
| Data fetching | RSC + fetch | TanStack Query | Unnecessary complexity for read-heavy dashboard with no optimistic updates in MVP |
| Supabase client | @supabase/supabase-js | Direct pg via Prisma only | Prisma handles data; Supabase client needed for future Realtime/auth migration path |
## Environment Variables to Add
## Key Risk: Prisma + Next.js Standalone Docker Build
## Sources
- npm registry (direct version queries): prisma@7.7.0, @prisma/client@7.7.0, @prisma/adapter-pg@7.7.0, recharts@3.8.1, @tremor/react@3.18.7, @supabase/supabase-js@2.103.0, @supabase/ssr@0.10.2, zod@4.3.6, pg@8.20.0
- Peer dependency verification: recharts@3.8.1 React peer confirmed `^19.0.0` compatible; @tremor/react@3.18.7 confirmed React `^18.0.0` only (INCOMPATIBLE)
- Project constraints: Dockerfile (node:22-alpine), PROJECT.md decisions (Prisma + Supabase, 0.8 decay coefficient, dual-write migration)
- Node engine requirement: prisma@7.7.0 requires `^20.19 || ^22.12 || >=24.0` — satisfied by Docker node:22-alpine and local node v24.2.0
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

### Prisma Schema (`prisma/schema.prisma`)

Four models: `Associate` (identity + readiness fields), `Session` (full interview data linked to Associate), `GapScore` (per-skill recency-weighted scores, unique per associate+skill+topic), `Settings` (singleton trainer config). Generated client output: `src/generated/prisma/`.

### Session Save Pipeline

On interview completion: file-based history write (backward compat) + `persistSessionToDb()` dual-write to Supabase. After DB write, gap scores are computed via `gapService.ts` (pure functions, 0.8 decay factor) and persisted via `gapPersistence.ts`. Then `readinessService.ts` recomputes the associate's readiness classification and updates the Associate record.

### Gap Scoring Algorithm

Recency-weighted average per skill: `score_n * 0.8^0 + score_(n-1) * 0.8^1 + ...` normalized. Scores extracted from per-question assessments mapped through `techMap` (week number to skill name). Stored in `GapScore` table.

### Readiness Classification

Three-state cascade (order matters): **ready** (avg >= threshold AND trend >= 0 AND sessions >= 3), **improving** (sessions >= 3 AND trend > 0 AND avg < threshold), **not_ready** (everything else). Trend is linear regression slope over last 3 session overall scores. Threshold is configurable via `/api/settings` (default 75%).

### Trainer Dashboard

`/trainer` — Roster page with sortable table, readiness badges, search. `/trainer/[slug]` — Associate detail with session history list, gap trend chart (recharts `LineChart`), skill filter dropdown, and calibration view. Auth-guarded via middleware + client-side `useAuth()`.

### Adaptive Setup

When an associate with 3+ sessions starts a new interview, the dashboard setup wizard fetches gap scores from `/api/associates/[slug]/gap-scores` and pre-populates tech weights via `adaptiveSetup.ts` (weakest skills get weight 5, strongest get weight 1, linear interpolation).

### Prisma + Docker

Dockerfile copies `prisma/schema.prisma` and runs `prisma generate` during build. `next.config.ts` includes `transpilePackages: ['@prisma/client']` and `outputFileTracingRoot` for standalone build compatibility.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.
