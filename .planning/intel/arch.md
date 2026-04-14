# Architecture Decisions

_Updated: 2026-04-14_

## ARCH-01: Dual-Write Persistence Strategy

Sessions are written to both file storage (`data/interview-history.json`) and Supabase. File layer is source of truth for existing interview flow; Supabase is source of truth for trainer dashboard, gap scores, and readiness signals.

**Rationale:** Backward compatibility during migration — existing trainer-led flow must keep working.

**Files:** `src/lib/historyService.ts`, `src/lib/sessionPersistence.ts`, `src/app/api/history/route.ts`

## ARCH-02: Prisma + pg Adapter for Supabase Connection Pooling

Uses `@prisma/adapter-pg` with native pg Pool (max: 5) instead of Prisma's binary driver. Connects via Transaction Pooler (port 6543).

**Rationale:** Better connection pool control with Supabase's pgBouncer for persistent Node server.

**Files:** `src/lib/prisma.ts`, `prisma/schema.prisma`

## ARCH-03: Gap Scoring with Recency-Weighted Average

Per-skill scores use 0.8 decay factor: `score_n * 0.8^0 + score_(n-1) * 0.8^1 + ...` normalized. Pure functions in `gapService.ts`, DB operations in `gapPersistence.ts`.

**Rationale:** Recent performance weighted more heavily; 50-line algorithm doesn't need ML infrastructure.

**Files:** `src/lib/gapService.ts`, `src/lib/gapPersistence.ts`

## ARCH-04: Three-State Readiness Classification

Cascade (order matters):
- **ready**: avg >= threshold AND trend >= 0 AND sessions >= 3
- **improving**: sessions >= 3 AND trend > 0 AND avg < threshold
- **not_ready**: everything else

Pre-computed on session save so dashboard reads are instant.

**Files:** `src/lib/readinessService.ts`

## ARCH-05: Zustand Store as Central Nervous System

Single Zustand store with persist middleware (localStorage) holds full interview session, setup wizard state, assessments, tech weights, associate slug, and navigation.

**Rationale:** Simple single-store pattern for solo dev; localStorage persistence survives page refreshes.

**Files:** `src/store/interviewStore.ts`

## ARCH-06: LangGraph Conditional Routing for Scoring

Scoring workflow routes differently based on question type:
- Starter -> guideline-based evaluation
- Technical -> keyword matching + soft skills assessment
- Public -> transcript-based evaluation

**Files:** `src/lib/langchain.ts`

## ARCH-07: Single-Password Auth with Middleware Protection

HttpOnly cookie (`nlm_session`, 24hr expiry) set on password match. Middleware redirects unauthenticated requests to `/login` for protected paths (`/dashboard`, `/interview`, `/review`, `/trainer`).

**Files:** `src/middleware.ts`, `src/lib/auth-server.ts`, `src/app/api/auth/route.ts`

## ARCH-08: Adaptive Setup from Gap Scores

When associate has 3+ sessions, dashboard fetches gap scores and pre-populates tech weights: weakest skills get weight 5, strongest get weight 1, linear interpolation.

**Files:** `src/lib/adaptiveSetup.ts`, `src/app/api/associates/[slug]/gap-scores/route.ts`

## ARCH-09: GitHub-Backed Question Banks

Questions parsed from markdown files in configurable GitHub repos. Fetched via `/api/github` proxy to keep tokens server-side. Weighted random selection by tech weights + difficulty stratification.

**Files:** `src/lib/github-service.ts`, `src/lib/markdownParser.ts`, `src/app/api/github/route.ts`

## ARCH-10: Standalone Docker Build with Prisma Tracing

Next.js standalone output with explicit Prisma binary inclusion via `outputFileTracingIncludes`. Multi-stage Dockerfile with `prisma generate` during build.

**Rationale:** Prisma binaries are pruned from standalone output by default — explicit inclusion prevents runtime crashes.

**Files:** `next.config.ts`, `Dockerfile`

## ARCH-11: Settings-Triggered Bulk Recompute

When trainer changes readiness threshold via `/api/settings` PUT, all associates' readiness is recomputed with the new threshold.

**Files:** `src/lib/settingsService.ts`, `src/lib/readinessService.ts`

## Data Models

| Model | Purpose | Key Relations |
|-------|---------|---------------|
| **Associate** | Identity + readiness fields (slug, status, recommendedArea) | has many Sessions, has many GapScores |
| **Session** | Full interview data (scores, questions JSON, assessments JSON, techMap) | belongs to Associate (optional) |
| **GapScore** | Per-skill recency-weighted scores, unique per (associateId, skill, topic) | belongs to Associate (cascade delete) |
| **Settings** | Singleton trainer config (readinessThreshold, default 75%) | standalone |
| **HealthCheck** | DB connectivity test | standalone |

## Critical Paths

### Session Save Pipeline
`POST /api/history` -> `historyService.writeHistory` (file) -> `sessionPersistence.persistSessionToDb` (Supabase) -> `gapPersistence.saveGapScores` -> `readinessService.updateAssociateReadiness`

### Adaptive Setup
`GET /api/associates/[slug]/gap-scores` -> `gapPersistence.getGapScores` -> `adaptiveSetup.mapGapScoresToWeights` -> dashboard wizard pre-population

### Readiness Recompute
`settingsService.updateThreshold` -> `readinessService.recomputeAllReadiness` -> updates all Associate records
